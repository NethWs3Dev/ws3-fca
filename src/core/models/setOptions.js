"use strict";

const utils = require('../../utils');

/**
 * Sets global options for the API.
 *
 * @param {object} globalOptions The global options object to modify.
 * @param {object} [options={}] New options to apply.
 * @returns {Promise<void>}
 */
async function setOptions(globalOptions, options = {}) {
    const optionHandlers = {
        online: (value) => (globalOptions.online = Boolean(value)),
        selfListen: (value) => (globalOptions.selfListen = Boolean(value)),
        selfListenEvent: (value) => (globalOptions.selfListenEvent = value),
        listenEvents: (value) => (globalOptions.listenEvents = Boolean(value)),
        updatePresence: (value) => (globalOptions.updatePresence = Boolean(value)),
        forceLogin: (value) => (globalOptions.forceLogin = Boolean(value)),
        userAgent: (value) => (globalOptions.userAgent = value),
        autoMarkDelivery: (value) => (globalOptions.autoMarkDelivery = Boolean(value)),
        autoMarkRead: (value) => (globalOptions.autoMarkRead = Boolean(value)),
        listenTyping: (value) => (globalOptions.listenTyping = Boolean(value)),
        proxy(value) {
            if (typeof value !== "string") {
                delete globalOptions.proxy;
                utils.setProxy();
            } else {
                globalOptions.proxy = value;
                utils.setProxy(value);
            }
        },
        autoReconnect: (value) => (globalOptions.autoReconnect = Boolean(value)),
        emitReady: (value) => (globalOptions.emitReady = Boolean(value)),
        randomUserAgent(value) {
            globalOptions.randomUserAgent = Boolean(value);
            if (value) {
                globalOptions.userAgent = utils.randomUserAgent();
            }
        },
        bypassRegion(value) {
            if (value){
                value = value.toUpperCase();
            } 
            globalOptions.bypassRegion = value;
        }
    };
    Object.entries(options).forEach(([key, value]) => {
        if (optionHandlers[key]) optionHandlers[key](value);
    });
}

module.exports = setOptions;
