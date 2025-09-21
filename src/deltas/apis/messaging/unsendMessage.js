"use strict";

const utils = require('../../../utils');
// @NethWs3Dev

module.exports = function (defaultFuncs, api, ctx) {
  return async (messageID) => {
    const defData = await defaultFuncs.post("https://www.facebook.com/messaging/unsend_message/", ctx.jar, {
      message_id: messageID
    })
    const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(defData);
    if (resData.error) {
      throw new Error(resData);
    }
    return resData;
  };
};
