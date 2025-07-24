"use strict";
const utils = require('../../../utils');
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
    "/orca_message_notifications", "/pp", "/webrtc_response"
];

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getRandomReconnectTime() {
    const min = 26 * 60 * 1000;
    const max = 60 * 60 * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {Object} api
 * @param {Object} deltaMessageMetadata
 * @param {string} confirmedMessageID
 * @param {Object} ctx
 */
async function handleMessages(api, deltaMessageMetadata, confirmedMessageID, ctx) {
    const delta_otid = deltaMessageMetadata.offlineThreadingId;
    const delta_replySourceId = deltaMessageMetadata.replySourceId;
    const replyKey = `reply_${delta_replySourceId}`;
    const sender_actorFbId = deltaMessageMetadata.actorFbId;
    let editData, keyFound;
    const deleteTimeout = key => setTimeout(() => api.pendingEdits.delete(key), 60*1000);
    if (delta_replySourceId) {
        if (api.pendingEdits.has(replyKey)) {
            editData = api.pendingEdits.get(replyKey);
            keyFound = replyKey;
            if (editData && keyFound !== delta_otid) {
                api.pendingEdits.set(delta_otid, editData);
                editData.originalOtid = delta_otid;
                keyFound = delta_otid;
                api.pendingEdits.delete(keyFound);
            }
        }
    }

    const isBotMessageForEdit = (sender_actorFbId == ctx.userID) || (ctx.globalOptions.pageID && sender_actorFbId == ctx.globalOptions.pageID);

    if (editData) {
        if (isBotMessageForEdit) {
            if (editData.originalOtid && editData.originalOtid !== keyFound) api.pendingEdits.delete(editData.originalOtid);
            if (editData.originalReplyId && `reply_${editData.originalReplyId}` !== keyFound) api.pendingEdits.delete(`reply_${editData.originalReplyId}`);
            const { body, delay } = editData.edit;
            if (delay) await new Promise(resolve => setTimeout(resolve, delay));
            try {
                if (typeof api.editMessage === 'function') {
                    await api.editMessage(body, confirmedMessageID);
                } else {
                    utils.error(`[handlePendingEdits] api.editMessage is not a function. Cannot execute edit.`);
                }
            } catch (e) {
                utils.error(`[handlePendingEdits] Failed to execute edit for message ${confirmedMessageID}:`, e);
            }
        }
    }
}

/**
 * @param {Object} ctx
 * @param {Object} api
 * @param {string} threadID
 */
function markAsRead(ctx, api, threadID) {
    if (ctx.globalOptions.autoMarkRead && threadID) {
        api.markAsRead(threadID, (err) => {
            if (err) utils.error("autoMarkRead", err);
        });
    }
}

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @param {Function} globalCallback
 */
async function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
    const chatOn = ctx.globalOptions.online;
    const region = ctx.region;
    const foreground = false;
    const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
    const cid = ctx.clientID;
    const username = {
        u: ctx.userID, s: sessionID, chat_on: chatOn, fg: foreground, d: cid, ct: 'websocket',
        aid: ctx.mqttAppID, mqtt_sid: '', cp: 3, ecp: 10, st: [], pm: [],
        dc: '', no_auto_fg: true, gas: null, pack: [], a: ctx.globalOptions.userAgent
    };
    const cookies = ctx.jar.getCookiesSync('https://www.facebook.com').join('; ');
    let host;
    const domain = "wss://edge-chat.messenger.com/chat";
    if (region) {
        host = `${domain}?region=${region.toLowerCase()}&sid=${sessionID}&cid=${cid}`;
    } else {
        host = `${domain}?sid=${sessionID}&cid=${cid}`;
    }

    utils.log("Connecting to MQTT with new IDs...", host);

    const options = {
        clientId: 'mqttwsclient', protocolId: 'MQIsdp', protocolVersion: 3,
        username: JSON.stringify(username), clean: true,
        wsOptions: {
            headers: {
                'Cookie': cookies, 'Origin': 'https://www.messenger.com', 'User-Agent': username.a,
                'Referer': 'https://www.messenger.com/', 'Host': new URL(host).hostname
            },
            origin: 'https://www.messenger.com', protocolVersion: 13, binaryType: 'arraybuffer'
        },
        keepalive: 10, reschedulePings: true, connectTimeout: 60000, reconnectPeriod: 1000
    };

    if (ctx.globalOptions.proxy) options.wsOptions.agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
    const mqttClient = new mqtt.Client(_ => websocket(host, options.wsOptions), options);
    mqttClient.publishSync = mqttClient.publish.bind(mqttClient);
    mqttClient.publish = (topic, message, opts = {}, callback = () => {}) => new Promise((resolve, reject) => {
            mqttClient.publishSync(topic, message, opts, (err, data) => {
            if (err) {
                callback(err);
                reject(err);
            }
            callback(null, data);
            resolve(data);
        });
    });
    ctx.mqttClient = mqttClient;
    mqttClient.on('error', (err) => {
        utils.error("listenMqtt", err);
        mqttClient.end();
        if (ctx.globalOptions.autoReconnect) getSeqID();
        else globalCallback({ type: "stop_listen", error: "Connection refused" });
    });

    mqttClient.on('connect', async () => {
        topics.forEach(topic => mqttClient.subscribe(topic));
        const queue = { sync_api_version: 10, max_deltas_able_to_process: 1000, delta_batch_size: 500, encoding: "JSON", entity_fbid: ctx.userID };
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

        utils.log(`Successfully connected to MQTT.`);
        const { name: botName = "Facebook User", uid = ctx.userID } = await api.getBotInitialData();
        utils.log(`Hello, ${botName} (${uid})`);
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

    mqttClient.on('message', (topic, message, _packet) => {
        try {
            const jsonMessage = JSON.parse(message.toString());
            if (topic === "/t_ms") {
                if (jsonMessage.lastIssuedSeqId) ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId);
                if (jsonMessage.deltas) {
                    for (const delta of jsonMessage.deltas) {
                        if (delta.class === "NewMessage") {
                            const otID = delta.messageMetadata.offlineThreadingId;
                            const otIDdata = api.message.get(otID);
                            if (!otIDdata){
                                api.message.set(otID, delta);
                            }
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

module.exports = function (defaultFuncs, api, ctx) {
    let globalCallback = () => {};
    let reconnectInterval;

    getSeqID = async () => {
        try {
            form = {
                "queries": JSON.stringify({
                    "o0": {
                        "doc_id": "3336396659757871",
                        "query_params": {
                            "limit": 1,
                            "before": null,
                            "tags": ["INBOX"],
                            "includeDeliveryReceipts": false,
                            "includeSeqID": true
                        }
                    }
                })
            };
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
                globalCallback = () => {};
                if (reconnectInterval) {
                    clearTimeout(reconnectInterval);
                    reconnectInterval = null;
                }
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

        async function scheduleReconnect() {
            const time = getRandomReconnectTime();
            utils.log(`Scheduled reconnect in ${Math.floor(time / 60000)} minutes...`);
            reconnectInterval = setTimeout(() => {
                utils.log(`Reconnecting MQTT with new clientID...`);
                if (ctx.mqttClient) ctx.mqttClient.end(true);
                ctx.clientID = generateUUID();
                listenMqtt(defaultFuncs, api, ctx, globalCallback);
                scheduleReconnect();
            }, time);
        }

        scheduleReconnect();

        return msgEmitter;
    };
};
