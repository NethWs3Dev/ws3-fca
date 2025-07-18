"use strict";

const utils = require('../../../utils'); 
const mqtt = require('mqtt');
const websocket = require('websocket-stream');
const HttpsProxyAgent = require('https-proxy-agent');
const EventEmitter = require('events');

function connectLightspeed(ctx, globalCallback) {
    let client;
    let isStopped = false;

    function startConnection(retryCount = 0) {
        if (isStopped) return;

        const chatOn = ctx.globalOptions.online;
        const foreground = false;
        const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
        const cookies = ctx.jar.getCookiesSync('https://www.facebook.com').join('; ');
        const cid = ctx.clientID;

        const username = {
            u: ctx.userID,
            s: sessionID,
            chat_on: chatOn,
            fg: foreground,
            d: cid,
            ct: 'websocket',
            aid: '2220391788200892',
            mqtt_sid: '',
            cp: 3,
            ecp: 10,
            st: [],
            pm: [],
            dc: '',
            no_auto_fg: true,
            gas: null,
            pack: [],
            a: ctx.globalOptions.userAgent,
        };
        
        const queryParams = new URLSearchParams({
            'x-dgw-appid': '2220391788200892',
            'x-dgw-appversion': '0',
            'x-dgw-authtype': '1:0',
            'x-dgw-version': '5',
            'x-dgw-uuid': ctx.userID,
            'x-dgw-tier': 'prod',
            'x-dgw-loggingid': utils.getGUID(),
            'x-dgw-regionhint': ctx.region || 'PRN',
            'x-dgw-deviceid': ctx.clientID
        });
        const host = `wss://gateway.facebook.com/ws/lightspeed?${queryParams.toString()}`;
        
        const options = {
            clientId: 'mqttwsclient',
            protocolId: 'MQIsdp',
            protocolVersion: 3,
            username: JSON.stringify(username),
            clean: true,
            wsOptions: {
                headers: {
                    'Cookie': cookies,
                    'Origin': 'https://www.facebook.com',
                    'User-Agent': username.a,
                    'Referer': 'https://www.facebook.com/',
                    'Host': new URL(host).hostname
                }
            },
            keepalive: 10,
            reconnectPeriod: 0 
        };
        
        if (ctx.globalOptions.proxy) {
            options.wsOptions.agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
        }

        try {
            client = new mqtt.Client(_ => websocket(host, options.wsOptions), options);
            utils.log("[Lightspeed] Attempting MQTT connection...");
        } catch (err) {
            utils.error("[Lightspeed] MQTT Client creation failed:", err.message);
            reconnect(retryCount + 1);
            return;
        }

        client.on('connect', () => {
            utils.log("[Lightspeed] MQTT client connected. Attempting to subscribe to topics...");
            retryCount = 0;

            // --- ITO ANG IDINAGDAG NA SUBSCRIBE LOGIC ---
            const topicsToSubscribe = [
                "/t_ms", // Para sa mga messages at deltas
                "/orca_presence", // Para sa online status
                "/messaging_events" // Para sa ibang events
            ];

            topicsToSubscribe.forEach(topic => {
                client.subscribe(topic, (err) => {
                    if (err) {
                        utils.error(`[Lightspeed] Failed to subscribe to topic ${topic}:`, err.message);
                    } else {
                        utils.log(`[Lightspeed] Subscribed to topic: ${topic}`);
                    }
                });
            });
            // -----------------------------------------
        });

        client.on('message', (topic, payload) => {
            utils.log(`[Lightspeed] Payload Received on topic ${topic}:`);
            globalCallback(null, { type: 'lightspeed_message', topic: topic.toString(), payload: payload });
        });

        client.on('close', () => {
            utils.warn(`[Lightspeed] Connection closed.`);
            if (!isStopped) {
                reconnect(retryCount + 1);
            }
        });

        client.on('error', (err) => {
            utils.error("[Lightspeed] MQTT Connection Error:", err.message);
        });
    }

    function reconnect(retryCount) {
        const delay = Math.min(3000 * Math.pow(2, retryCount), 60000);
        utils.log(`[Lightspeed] Reconnecting in ${delay / 1000} seconds...`);
        setTimeout(() => startConnection(retryCount), delay);
    }

    startConnection();

    return {
        stop: () => {
            isStopped = true;
            if (client) client.end(true);
            utils.log("[Lightspeed] Listener has been manually stopped.");
        }
    };
}

module.exports = function (defaultFuncs, api, ctx) {
    return (callback) => {
        class MessageEmitter extends EventEmitter {
            constructor() {
                super();
                this.listener = null;
            }
            stop() {
                if (this.listener) {
                    this.listener.stop();
                }
                this.emit('stop');
            }
        }
        const msgEmitter = new MessageEmitter();
        const globalCallback = (error, message) => {
            if (error) return msgEmitter.emit("error", error);
            msgEmitter.emit("message", message);
        };
        if (typeof callback === 'function') {
            msgEmitter.listener = connectLightspeed(ctx, callback);
        } else {
            msgEmitter.listener = connectLightspeed(ctx, globalCallback);
        }
        return msgEmitter;
    };
};
