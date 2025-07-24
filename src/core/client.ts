const utils = require("../utils");
const setOptionsModel = require('./models/setOptions');
const buildAPIModel = require('./models/buildAPI');
const loginHelperModel = require('./models/loginHelper');
import { LoginOptions, LoginCredentials } from '../types';

let globalOptions: LoginOptions = {};
let ctx = null;
let defaultFuncs = null;
let api = null;

const fbLink = (ext) => ("https://www.facebook.com" + (ext ? '/' + ext : ''));
const ERROR_RETRIEVING = "Error retrieving userID. This can be caused by many factors, including being blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify.";

/**
 * Initiates the login process for a Facebook account.
 *
 * @param credentials - The user's login credentials (e.g., email/password or appState cookies).
 * @param options - Optional login configurations.
 * @param callback - The callback function to be invoked upon login completion.
 */
async function login(
  credentials: LoginCredentials,
  options: LoginOptions,
  callback: () => void,
): Promise<void> {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if ('logging' in options) {
        utils.logOptions(options.logging);
    }
    const defaultOptions = {
        selfListen: false,
        listenEvents: true,
        listenTyping: false,
        updatePresence: false,
        forceLogin: false,
        autoMarkDelivery: false,
        autoMarkRead: true,
        autoReconnect: true,
        online: true,
        emitReady: false,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    };
    Object.assign(globalOptions, defaultOptions, options);

    await setOptionsModel(globalOptions, options);

    loginHelperModel(
        credentials,
        globalOptions,
        (loginError, loginApi) => {
            if (loginError) {
                return callback(loginError);
            }
            api = loginApi;
            ctx = loginApi.ctx;
            defaultFuncs = loginApi.defaultFuncs;
            return callback(null, loginApi);
        },
        setOptionsModel,
        buildAPIModel,
        api,
        fbLink, 
        ERROR_RETRIEVING
    );
}

module.exports = {
    login
};
