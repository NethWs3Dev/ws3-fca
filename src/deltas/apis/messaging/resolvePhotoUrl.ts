"use strict";

const utils = require('../../../utils');

/**
 * @module resolvePhotoUrl
 * @description Fetches the direct URL of a Facebook photo using its photo ID.
 * @param {Object} defaultFuncs - An object containing default request functions.
 * @param {Object} api - Facebook API object (unused here but kept for compatibility).
 * @param {Object} ctx - Context object containing cookies (jar) and other session info.
 * @returns {Function} resolvePhotoUrl - A function that takes a photo ID and optional callback, and returns a Promise resolving to the photo URL.
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * @function resolvePhotoUrl
   * @param {string} photoID - The ID of the Facebook photo to resolve.
   * @param {Function} [callback] - Optional Node-style callback function `(err, photoUrl)`.
   * @returns {Promise<string>} A Promise that resolves to the direct photo URL.
   */
  return function resolvePhotoUrl(photoID, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, photoUrl) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc(photoUrl);
      };
    }

    defaultFuncs
      .get("https://www.facebook.com/mercury/attachments/photo", ctx.jar, {
        photo_id: photoID,
      })
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then((resData) => {
        if (resData.error) {
          throw resData;
        }

        const photoUrl = resData.jsmods.require[0][3][0];

        return callback(null, photoUrl);
      })
      .catch((err) => {
        utils.error("resolvePhotoUrl", err);
        return callback(err);
      });

    return returnPromise;
  };
};
