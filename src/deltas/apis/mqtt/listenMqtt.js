"use strict";

require('module-alias/register');
const utils = require("@utils");
const mqtt = require('mqtt');
const websocket = require('websocket-stream');
const HttpsProxyAgent = require('https-proxy-agent');
const EventEmitter = require('events');
const { parseDelta } = require('./deltas/value');

let form = {};
let getSeqID;
const topics = [
    "/legacy_web", "/webrtc", "/rtc_multi", "/onevc", "/br_sr", "/sr_res",
    "/t_ms", "/thread_typing", "/orca_typing_notifications", "/notify_disconnect",
    "/orca_presence", "/inbox", "/mercury", "/messaging_events",
    "/orca_message_notifications", "/pp", "/webrtc_response",
];

/**
 * Checks for and executes pending message edits.
 *
 * @param {object} api The full API object.
 * @param {object} deltaMessageMetadata The messageMetadata from the received delta.
 * @param {string} confirmedMessageID The messageID confirmed by the delta.
 * @param {object} ctx The context object (needed for userID/pageID check within this function).
 */
async function handlePendingEdits(api, deltaMessageMetadata, confirmedMessageID, ctx) {
    const delta_otid = deltaMessageMetadata.offlineThreadingId;
    const delta_replySourceId = deltaMessageMetadata.replySourceId;
    const sender_actorFbId = deltaMessageMetadata.actorFbId;

    let editData = null;
    let keyFound = null;

    if (api.pendingEdits.has(delta_otid)) {
        editData = api.pendingEdits.get(delta_otid);
        keyFound = delta_otid;
    }

    if (!editData && delta_replySourceId) {
        const replyKey = `reply_${delta_replySourceId}`;
        if (api.pendingEdits.has(replyKey)) {
            editData = api.pendingEdits.get(replyKey);
            keyFound = replyKey;

            if (editData && keyFound !== delta_otid) {
                api.pendingEdits.set(delta_otid, editData);
                editData.originalOtid = delta_otid;
                api.pendingEdits.delete(keyFound);
                keyFound = delta_otid;
            }
        }
    }

    const isBotMessageForEdit = (sender_actorFbId == ctx.userID) ||
                                (ctx.globalOptions.pageID && sender_actorFbId == ctx.globalOptions.pageID);


    if (editData) {
        if (isBotMessageForEdit) {
            api.pendingEdits.delete(keyFound);
            if (editData.originalOtid && editData.originalOtid !== keyFound) api.pendingEdits.delete(editData.originalOtid);
            if (editData.originalReplyId && `reply_${editData.originalReplyId}` !== keyFound) api.pendingEdits.delete(`reply_${editData.originalReplyId}`);

            for (const edit of editData.edits) {
                const [newText, delayAmount] = edit;
                await new Promise(resolve => setTimeout(resolve, delayAmount));
                try {
                    if (typeof api.editMessage === 'function') {
                        await api.editMessage(newText, confirmedMessageID);
                    } else {
                        utils.error(`[handlePendingEdits] api.editMessage is not a function. Cannot execute edit.`);
                    }
                } catch (e) {
                    utils.error(`[handlePendingEdits] Failed to execute edit for message ${confirmedMessageID}:`, e);
                    break;
                }
            }
        } else {
            // No action: Found edit data, but message is not from the bot.
        }
    } else {
        // No action: No pending edits found.
    }
}

/**
 * Marks a message as read in the given thread.
 *
 * @param {object} ctx The context object.
 * @param {object} api The full API object.
 * @param {string} threadID The ID of the thread to mark as read.
 */
function markAsRead(ctx, api, threadID) {
    if (ctx.globalOptions.autoMarkRead && threadID) {
        api.markAsRead(threadID, (err) => {
            if (err) utils.error("autoMarkRead", err);
        });
    }
}

/**
 * Listens for MQTT messages from Facebook's chat servers.
 *
 * @param {object} defaultFuncs Default API functions.
 * @param {object} api The full API object.
 * @param {object} ctx The context object.
 * @param {function} globalCallback The global callback function for emitted events.
 */
function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
    const chatOn = ctx.globalOptions.online;
    const foreground = false;
    const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
    const cid = ctx.clientID;
    const username = {
        u: ctx.userID, s: sessionID, chat_on: chatOn, fg: foreground, d: cid, ct: 'websocket',
        aid: ctx.appID,
        mqtt_sid: '', cp: 3, ecp: 10, st: [], pm: [],
        dc: '', no_auto_fg: true, gas: null, pack: [], a: ctx.globalOptions.userAgent,
    };
    const cookies = ctx.jar.getCookiesSync('https://www.facebook.com').join('; ');
    let host;
    const domain = "wss://edge-chat.messenger.com/chat";
    if (ctx.region) host = `${domain}?region=${ctx.region.toLowerCase()}&sid=${sessionID}&cid=${cid}`;
    else host = `${domain}?sid=${sessionID}&cid=${cid}`;
    utils.log("Connecting to MQTT host:", host);

    const options = {
        clientId: 'mqttwsclient', protocolId: 'MQIsdp', protocolVersion: 3,
        username: JSON.stringify(username), clean: true,
        wsOptions: {
            headers: {
                'Cookie': cookies, 'Origin': 'https://www.messenger.com', 'User-Agent': username.a,
                'Referer': 'https://www.messenger.com/', 'Host': new URL(host).hostname
            },
            origin: 'https://www.messenger.com', protocolVersion: 13, binaryType: 'arraybuffer',
        },
        keepalive: 10, reschedulePings: true, connectTimeout: 60 * 1000, reconnectPeriod: 1000
    };
    if (ctx.globalOptions.proxy) options.wsOptions.agent = new HttpsProxyAgent(ctx.globalOptions.proxy);

    ctx.mqttClient = new mqtt.Client(_ => websocket(host, options.wsOptions), options);
    const mqttClient = ctx.mqttClient;

    mqttClient.on('error', function (err) {
        utils.error("listenMqtt", err);
        mqttClient.end();
        if (ctx.globalOptions.autoReconnect) getSeqID();
        else globalCallback({ type: "stop_listen", error: "Connection refused" });
    });

    mqttClient.on('connect', () => {
        topics.forEach(topic => mqttClient.subscribe(topic));
        const queue = { sync_api_version: 10, max_deltas_able_to_process: 1000, delta_batch_size: 500, encoding: "JSON", entity_fbid: ctx.userID, };
        let topic;
        if (ctx.syncToken) {
            topic = "/messenger_sync_get_diffs";
            queue.last_seq_id = ctx.lastSeqId;
            queue.sync_token = ctx.syncToken;
        } else {
            topic = "/messenger_sync_create_queue";
            queue.initial_titan_sequence_id = ctx.lastSeqId;
            queue.device_params = null;
        }
        mqttClient.publish(topic, JSON.stringify(queue), { qos: 1, retain: false });
    });

    let presenceInterval;
    if (ctx.globalOptions.updatePresence) {
        presenceInterval = setInterval(() => {
            if (mqttClient.connected) {
                const presencePayload = utils.generatePresence(ctx.userID);
                mqttClient.publish('/orca_presence', JSON.stringify({ "p": presencePayload }), (err) => {
                    if (err) {
                        utils.error("Failed to send presence update:", err);
                    }
                });
            }
        }, 50000);
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    mqttClient.on('message', (topic, message, _packet) => {
        try {
            const jsonMessage = JSON.parse(message.toString());

            if (topic === "/t_ms") {
                if (jsonMessage.lastIssuedSeqId) {
                    ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId);
                }

                if (jsonMessage.deltas) {
                    for (const delta of jsonMessage.deltas) {
                        if (delta.class === "NewMessage") {
                            const messageID = delta.messageMetadata.messageId;

                            handlePendingEdits(api, delta.messageMetadata, messageID, ctx);
                        }

                        parseDelta(defaultFuncs, api, ctx, globalCallback, { delta });
                    }
                }
            } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
                const typ = {
                    type: "typ",
                    isTyping: !!jsonMessage.state,
                    from: jsonMessage.sender_fbid.toString(),
                    threadID: utils.formatID((jsonMessage.thread || jsonMessage.sender_fbid).toString())
                };
                globalCallback(null, typ);
            }
        } catch (ex) {
            utils.error("listenMqtt: onMessage", ex);
        }
    });
}

/**
 * The main module function for listening to MQTT events.
 *
 * @param {object} defaultFuncs Default API functions.
 * @param {object} api The full API object.
 * @param {object} ctx The context object.
 * @returns {function(callback: Function): EventEmitter} An EventEmitter for message events.
 */
module.exports = function (defaultFuncs, api, ctx) {
    let globalCallback = () => { };

    /**
     * Retrieves the sequence ID for MQTT listening.
     *
     * @returns {Promise<void>}
     */
    getSeqID = async () => {
        try {
            form = { "queries": JSON.stringify({ "o0": { "doc_id": "3336396659757871", "query_params": { "limit": 1, "before": null, "tags": ["INBOX"], "includeDeliveryReceipts": false, "includeSeqID": true } } }) };
            const resData = await defaultFuncs.post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form).then(utils.parseAndCheckLogin(ctx, defaultFuncs));
            if (utils.getType(resData) != "Array" || (resData.error && resData.error !== 1357001)) throw resData;
            ctx.lastSeqId = resData[0].o0.data.viewer.message_threads.sync_sequence_id;
            listenMqtt(defaultFuncs, api, ctx, globalCallback);
        } catch (err) {
            const descriptiveError = new Error("Failed to get sequence ID. This is often caused by an invalid appstate. Please try generating a new appstate.json file.");
            descriptiveError.originalError = err;
            return globalCallback(descriptiveError);
        }
    };

    return async (callback) => {
        class MessageEmitter extends EventEmitter {
            stop() {
                globalCallback = () => { };
                if (presenceInterval) clearInterval(presenceInterval);
                if (ctx.mqttClient) {
                    ctx.mqttClient.end();
                    ctx.mqttClient = undefined;
                }
                this.emit('stop');
            }
        }
        const msgEmitter = new MessageEmitter();
        globalCallback = (error, message) => {
            if (error) return msgEmitter.emit("error", error);
            if (message.type === "message" || message.type === "message_reply") {
                markAsRead(ctx, api, message.threadID);
                  }

            msgEmitter.emit("message", message);
        };
        if (typeof callback === 'function') globalCallback = callback;
        if (!ctx.firstListen || !ctx.lastSeqId) await getSeqID();
        else listenMqtt(defaultFuncs, api, ctx, globalCallback);
        if (ctx.firstListen) {
            try {
                await api.markAsReadAll();
            } catch (err) {
                utils.error("Failed to mark all messages as read on startup:", err);
            }
        }
        ctx.firstListen = false;
        return msgEmitter;
    };
};
