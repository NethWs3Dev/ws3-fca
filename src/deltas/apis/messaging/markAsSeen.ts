"use strict";
// @ChoruOfficial
const utils = require('../../../utils');

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Marks all messages as "seen" up to a specific timestamp.
   * @param {number} [seen_timestamp=Date.now()] - The timestamp (in milliseconds) up to which messages should be marked as seen. If a function is provided, it's treated as the callback and the timestamp defaults to the current time.
   * @param {Function} [callback] - The callback function.
   * @returns {Promise<void>} A Promise that resolves on success or rejects with an error.
   */
  return async function markAsRead(seen_timestamp, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (utils.getType(seen_timestamp) == "Function" || utils.getType(seen_timestamp) == "AsyncFunction") {
      callback = seen_timestamp;
      seen_timestamp = Date.now();
    } else if (seen_timestamp === undefined) {
      seen_timestamp = Date.now();
    }

    if (!callback) {
      callback = function (err, friendList) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(friendList);
      };
    }

    const form = {
      seen_timestamp: seen_timestamp,
    };

    try {
      const resData = await defaultFuncs
        .post(
          "https://www.facebook.com/ajax/mercury/mark_seen.php",
          ctx.jar,
          form,
        )
        .then(utils.saveCookies(ctx.jar))
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (resData.error) {
        throw resData;
      }

      return callback();
    } catch (err) {
      utils.error("markAsSeen", err);
      if (utils.getType(err) == "Object" && err.error === "Not logged in.") {
        ctx.loggedIn = false;
      }
      return callback(err);
    }

    return returnPromise;
  };
};
