"use strict";

const utils = require('../../../utils');
// @NethWs3Dev

module.exports = function (defaultFuncs, api, ctx) {
  return async (reaction, messageID) => {
    if (!reaction) throw new Error("Please enter a valid emoji.");
    const defData = await defaultFuncs.postFormData("https://www.facebook.com/webgraphql/mutation/", ctx.jar, {}, {
      doc_id: "1491398900900362",
      variables: JSON.stringify({
      data: {
        client_mutation_id: ctx.clientMutationId++,
        actor_id: ctx.userID,
        action: reaction == "" ? "REMOVE_REACTION" : "ADD_REACTION",
        message_id: messageID,
        reaction
      }
    }),
      dpr: 1
    });
    const resData = await utils.parseAndCheckLogin(ctx.jar, defaultFuncs)(defData);
    if (!resData) {
      throw new Error("setMessageReactionLegacy returned empty object.");
    }
  };
};
