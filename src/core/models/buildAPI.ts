"use strict";

const utils = require('../../utils');

/**
 * Builds the core API context and default functions after successful login.
 *
 * @param {string} html The HTML body from the initial Facebook page.
 * @param {object} jar The cookie jar.
 * @param {Array<object>} netData Network data extracted from the HTML.
 * @param {object} globalOptions The global options object.
 * @param {function} fbLinkFunc A function to generate Facebook links.
 * @param {string} errorRetrievingMsg The error message for retrieving user ID.
 * @returns {Array<object>} An array containing [ctx, defaultFuncs, {}].
 */
async function buildAPI(html, jar, netData, globalOptions, fbLinkFunc, errorRetrievingMsg) {
    let userID;
    const cookies = jar.getCookiesSync(fbLinkFunc()); // Use passed fbLinkFunc
    const primaryProfile = cookies.find((val) => val.cookieString().startsWith("c_user="));
    const secondaryProfile = cookies.find((val) => val.cookieString().startsWith("i_user="));
    if (!primaryProfile && !secondaryProfile) {
        throw new Error(errorRetrievingMsg); // Use passed error message
    }
    userID = secondaryProfile?.cookieString().split("=")[1] || primaryProfile.cookieString().split("=")[1];

    const findConfig = (key) => {
        for (const scriptData of netData) {
            if (scriptData.require) {
                for (const req of scriptData.require) {
                    if (Array.isArray(req) && req[0] === key && req[2]) {
                        return req[2];
                    }
                    if (Array.isArray(req) && req[3] && req[3][0] && req[3][0].__bbox && req[3][0].__bbox.define) {
                        for (const def of req[3][0].__bbox.define) {
                            if (Array.isArray(def) && def[0].endsWith(key) && def[2]) {
                                return def[2];
                            }
                        }
                    }
                }
            }
        }
        return null;
    };

    const dtsgData = findConfig("DTSGInitialData");
    const dtsg = dtsgData ? dtsgData.token : utils.getFrom(html, '"token":"', '"');
    const dtsgResult = { fb_dtsg: dtsg, jazoest: `2${Array.from(dtsg).reduce((a, b) => a + b.charCodeAt(0), '')}` };

    const clientIDData = findConfig("MqttWebDeviceID");
    const clientID = clientIDData ? clientIDData.clientID : undefined;

    const mqttConfigData = findConfig("MqttWebConfig");
    const mqttAppID = mqttConfigData ? mqttConfigData.appID : undefined;

    const currentUserData = findConfig("CurrentUserInitialData");
    const userAppID = currentUserData ? currentUserData.APP_ID : undefined;

    let primaryAppID = userAppID || mqttAppID;

    let mqttEndpoint = mqttConfigData ? mqttConfigData.endpoint : undefined;

    let region = mqttEndpoint ? new URL(mqttEndpoint).searchParams.get("region")?.toUpperCase() : undefined;
    const irisSeqIDMatch = html.match(/irisSeqID:"(.+?)"/);
    const irisSeqID = irisSeqIDMatch ? irisSeqIDMatch[1] : null;
    if (globalOptions.bypassRegion && mqttEndpoint) {
        const currentEndpoint = new URL(mqttEndpoint);
        currentEndpoint.searchParams.set('region', globalOptions.bypassRegion.toLowerCase());
        mqttEndpoint = currentEndpoint.toString();
        region = globalOptions.bypassRegion.toUpperCase();
    }

    const ctx = {
        userID,
        jar,
        clientID,
        appID: primaryAppID, 
        mqttAppID: mqttAppID, 
        userAppID: userAppID, 
        globalOptions,
        loggedIn: true,
        access_token: "NONE",
        clientMutationId: 0,
        mqttClient: undefined,
        lastSeqId: irisSeqID,
        syncToken: undefined,
        mqttEndpoint,
        wsReqNumber: 0,
        wsTaskNumber: 0,
        reqCallbacks: {},
        callback_Task: {},
        region,
        firstListen: true,
        ...dtsgResult,
    };
    const defaultFuncs = utils.makeDefaults(html, userID, ctx);

    return [ctx, defaultFuncs, {}];
}

module.exports = buildAPI;
