"use strict";

const utils = require('../../utils');
const path = require('path');
const fs = require('fs');

/**
 * The main login helper function, orchestrating the login process.
 *
 * @param {object} credentials User credentials or appState.
 * @param {object} globalOptions Global options for the API.
 * @param {function} callback The final callback function.
 * @param {function} setOptionsFunc Reference to the setOptions function from models.
 * @param {function} buildAPIFunc Reference to the buildAPI function from models.
 * @param {object} initialApi The initial API object to extend.
 * @param {function} fbLinkFunc A function to generate Facebook links.
 * @param {string} errorRetrievingMsg The error message for retrieving user ID.
 * @returns {Promise<void>}
 */
async function loginHelper(credentials, globalOptions, callback, setOptionsFunc, buildAPIFunc, initialApi, fbLinkFunc, errorRetrievingMsg) {
    let ctx = null;
    let defaultFuncs = null;
    let api = initialApi;

    try {
        const jar = utils.getJar();
        utils.log("Logging in...");

        const appState = credentials.appState || credentials;

        if (appState) {
            let cookieStrings = [];
            if (Array.isArray(appState)) {
                cookieStrings = appState.map(c => [c.name || c.key, c.value].join('='));
            } else if (typeof appState === 'string') {
                cookieStrings = appState.split(';').map(s => s.trim()).filter(Boolean);
            } else {
                throw new Error("Invalid appState format. Please provide an array of cookie objects or a cookie string.");
            }

            cookieStrings.forEach(cookieString => {
                const domain = ".facebook.com";
                const expires = new Date().getTime() + 1000 * 60 * 60 * 24 * 365;
                const str = `${cookieString}; expires=${expires}; domain=${domain}; path=/;`;
                jar.setCookie(str, `https://${domain}`);
            });
        } else {
                throw new Error("No cookie found. Please provide an appState.");
        }

        if (!api) {
            api = {
                setOptions: setOptionsFunc.bind(null, globalOptions),
                getAppState() {
                    const appState = utils.getAppState(jar);
                    if (!Array.isArray(appState)) return [];
                    const uniqueAppState = appState.filter((item, index, self) => self.findIndex((t) => t.key === item.key) === index);
                    return uniqueAppState.length > 0 ? uniqueAppState : appState;
                },
            };
            api.pendingEdits = new Map();
        }

        const resp = await utils.get(fbLinkFunc(), jar, null, globalOptions, { noRef: true }).then(utils.saveCookies(jar));
        const extractNetData = (html) => {
            const allScriptsData = [];
            const scriptRegex = /<script type="application\/json"[^>]*>(.*?)<\/script>/g;
            let match;
            while ((match = scriptRegex.exec(html)) !== null) {
                try {
                    allScriptsData.push(JSON.parse(match[1]));
                } catch (e) {
                    utils.error(`Failed to parse a JSON blob from HTML`, e.message);
                }
            }
            return allScriptsData;
        };

        const netData = extractNetData(resp.body);

        const [newCtx, newDefaultFuncs] = await buildAPIFunc(resp.body, jar, netData, globalOptions, fbLinkFunc, errorRetrievingMsg);
        ctx = newCtx;
        defaultFuncs = newDefaultFuncs;

        /**
         * Loads API modules from the deltas/apis directory.
         *
         * @returns {void}
         */
        const loadApiModules = () => {
            // CORRECTED PATH: From src/core/models/ to src/deltas/apis
            const apiPath = path.join(__dirname, '..', '..', 'deltas', 'apis');
            const apiFolders = fs.readdirSync(apiPath)
                .filter(name => fs.lstatSync(path.join(apiPath, name)).isDirectory());

            apiFolders.forEach(folder => {
                const modulePath = path.join(apiPath, folder);
                fs.readdirSync(modulePath)
                    .filter(file => file.endsWith('.js'))
                    .forEach(file => {
                        const moduleName = path.basename(file, '.js');
                        const fullPath = path.join(modulePath, file);
                        try {
                            api[moduleName] = require(fullPath)(defaultFuncs, api, ctx);
                        } catch (e) {
                            utils.error(`Failed to load module ${moduleName} from ${folder}:`, e);
                        }
                    });
            });
            const listenPath = path.join(__dirname, '..', '..', 'deltas', 'apis', 'mqtt', 'listenMqtt.js');
            const realtimePath = path.join(__dirname, '..', '..', 'deltas', 'apis', 'mqtt', 'realtime.js');

            if (fs.existsSync(realtimePath)) {
                api['realtime'] = require(realtimePath)(defaultFuncs, api, ctx);
            }
            if (fs.existsSync(listenPath)) {
                api['listen'] = require(listenPath)(defaultFuncs, api, ctx);
            }
        };

        loadApiModules();
        api.setMessageReaction = api.setMessageReactionMqtt;
        api.sendMessage = api.sendMessageMqtt;
        api.getCurrentUserID = () => ctx.userID;
        api.getOptions = (key) => key ? globalOptions[key] : globalOptions;
        api.ctx = ctx;
        api.defaultFuncs = defaultFuncs;
        api.globalOptions = globalOptions;

        return callback(null, api);
    } catch (error) {
        utils.error("loginHelper", error.error || error);
        return callback(error);
    }
}

module.exports = loginHelper;
