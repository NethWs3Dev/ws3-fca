// @ChoruOfficial
"use strict";

const utils = require('../../../utils');
/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(threadID: string, messageID: string): Promise<void>}
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Marks a message as delivered.
   * @param {string} threadID - The ID of the thread.
   * @param {string} messageID - The ID of the message to mark as delivered.
   * @returns {Promise<void>} A promise that resolves on success or rejects on error.
   */
  return async function markAsDelivered(threadID, messageID) {
    if (!threadID || !messageID) {
      const err = "Error: messageID or threadID is not defined";
      utils.error("markAsDelivered", err);
      throw new Error(err);
    }

    const form = {};
    form["message_ids[0]"] = messageID;
    form["thread_ids[" + threadID + "][0]"] = messageID;

    try {
      const resData = await defaultFuncs
        .post(
          "https://www.facebook.com/ajax/mercury/delivery_receipts.php",
          ctx.jar,
          form,
        )
        .then(utils.saveCookies(ctx.jar))
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (resData.error) {
        throw resData;
      }
    } catch (err) {
      utils.error("markAsDelivered", err);
      throw err;
    }
  };
};
