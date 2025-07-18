"use strict";
// @ChoruOfficial
const utils = require('../../../utils');

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(): Promise<void>}
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Logs the current user out of Facebook.
   * @returns {Promise<void>} A promise that resolves when logout is successful or rejects on error.
   */
  return async function logout() {
    const form = {
      pmid: "0",
    };

    try {
      const resData = await defaultFuncs
        .post(
          "https://www.facebook.com/bluebar/modern_settings_menu/?help_type=364455653583099&show_contextual_help=1",
          ctx.jar,
          form,
        )
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      const elem = resData.jsmods.instances[0][2][0].find(v => v.value === "logout");
      if (!elem) {
        throw { error: "Could not find logout form element." };
      }
      
      const html = resData.jsmods.markup.find(v => v[0] === elem.markup.__m)[1].__html;
      
      const logoutForm = {
        fb_dtsg: utils.getFrom(html, '"fb_dtsg" value="', '"'),
        ref: utils.getFrom(html, '"ref" value="', '"'),
        h: utils.getFrom(html, '"h" value="', '"'),
      };

      const logoutRes = await defaultFuncs
        .post("https://www.facebook.com/logout.php", ctx.jar, logoutForm)
        .then(utils.saveCookies(ctx.jar));

      if (!logoutRes.headers || !logoutRes.headers.location) {
        throw { error: "An error occurred when logging out." };
      }

      await defaultFuncs
        .get(logoutRes.headers.location, ctx.jar)
        .then(utils.saveCookies(ctx.jar));
      
      ctx.loggedIn = false;
      utils.log("logout", "Logged out successfully.");

    } catch (err) {
      utils.error("logout", err);
      throw err;
    }
  };
};
