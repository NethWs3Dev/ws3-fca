// Fixed By @NAUGHTY-BRAND
  /**
   * Unsends a message.
   * Mqtt
   * @param {string} messageID The ID of the message to unsend.
   * @param {Function} [cb] Optional callback function.
   * @returns {Promise<object>} A promise that resolves with information about the unsend action.
   */
"use strict";
const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  
  function unsendMessage(messageID, cb) {
    let Func1 = function () {};
    let Func2 = function () {};
    
    const rPromise = new Promise(function (_1, _2) {
      Func1 = _1;
      Func2 = _2;
    });

    if (!cb) {
      cb = function (err, result) {
        if (err) return Func2(err);
        Func1(result);
      };
    }

    const f = {
      message_id: messageID
    };

    defaultFuncs
      .post("https://www.facebook.com/messaging/unsend_message/", ctx.jar, f)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (res) {
        if (res.error) throw res;
        return cb();
      })
      .catch(function (err) {
        console.log("unsendMessage", err);
        return cb(err);
      });

    return rPromise;
  }

  return unsendMessage;
};
