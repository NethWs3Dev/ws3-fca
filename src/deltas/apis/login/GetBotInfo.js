// @ChoruOfficial
"use strict";

const utils = require('../../../utils');

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(netData: Array<Object>): Object | null}
 */
module.exports = (defaultFuncs, api, ctx) => {
  /**
   * @param {Array<Object>} netData - The array of all extracted JSON objects from the HTML.
   * @returns {Object|null} An object containing the bot's essential info, security tokens, and context accessor functions.
   */
  return function GetBotInfo(netData) {
    if (!netData || !Array.isArray(netData)) {
        utils.error("GetBotInfo", "netData is not a valid array.");
        return null;
    }

    /**
     * @param {string} key The configuration key to find (e.g., "MqttWebDeviceID").
     * @returns {Object|null} The configuration object or null if not found.
     */
    const findConfig = (key) => {
        for (const scriptData of netData) {
            if (scriptData.require) {
                for (const req of scriptData.require) {
                    if (Array.isArray(req) && req[0] === key && req[2]) {
                        return req[2];
                    }
                    if (Array.isArray(req) && req[3] && req[3][0]?.__bbox?.define) {
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

    const currentUserData = findConfig("CurrentUserInitialData");
    const dtsgInitialData = findConfig("DTSGInitialData");
    const dtsgInitData = findConfig("DTSGInitData");
    const lsdData = findConfig("LSD");

    if (!currentUserData || !dtsgInitialData) {
        utils.error("GetBotInfo", "Could not find critical data (CurrentUserInitialData or DTSGInitialData).");
        return null;
    }

    const botInfo = {
        name: currentUserData.NAME,
        firstName: currentUserData.SHORT_NAME,
        uid: currentUserData.USER_ID,
        appID: currentUserData.APP_ID,
        dtsgToken: dtsgInitialData.token,
        lsdToken: lsdData ? lsdData.token : undefined,
        dtsgInit: dtsgInitData ? {
            token: dtsgInitData.token,
            async_get_token: dtsgInitData.async_get_token
        } : undefined,

        /**
         * @param {string} key The key of the value to retrieve.
         * @returns {any} The value from the context.
         */
        getCtx: (key) => ctx[key],

        /**
         * @param {string} key The key of the option to retrieve.
         * @returns {any} The value of the option.
         */
        getOptions: (key) => ctx.globalOptions[key],

        /**
         * @returns {string | undefined} The current region.
         */
        getRegion: () => ctx?.region
    };
    return botInfo;
  };
};
