"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) { 
  /**
   * Sets a nickname for a participant in a Facebook thread via MQTT.
   *
   * @param {string} nickname The new nickname to set.
   * @param {string} threadID The ID of the thread.
   * @param {string} participantID The ID of the participant whose nickname will be changed. Defaults to the current user's ID if not provided or a function.
   * @param {Function} [callback] Optional callback function to be invoked upon completion.
   * @returns {Promise<void>} A promise that resolves on success or rejects on error.
   */
  return function setNickname(nickname, threadID, participantID, callback) { // This is the function that will be attached to api.setNickname
    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (utils.getType(threadID) === "Function" || utils.getType(threadID) === "AsyncFunction") {
      callback = threadID;
      threadID = null;
    }
    if (utils.getType(participantID) === "Function" || utils.getType(participantID) === "AsyncFunction") {
      callback = participantID;
      participantID = ctx.userID;
    }
    if (utils.getType(nickname) === "Function" || utils.getType(nickname) === "AsyncFunction") {
      callback = nickname;
      nickname = "";
    }

    threadID = threadID || ctx.threadID;
    participantID = participantID || ctx.userID;

    if (!callback) {
      callback = function (err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    if (!ctx.mqttClient) {
      return callback({ error: "Not connected to MQTT" });
    }

    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    const queryPayload = {
      thread_key: threadID.toString(),
      contact_id: participantID.toString(),
      nickname: nickname,
      sync_group: 1,
    };

    const query = {
      failure_count: null,
      label: '44',
      payload: JSON.stringify(queryPayload),
      queue_name: 'thread_participant_nickname',
      task_id: ctx.wsTaskNumber,
    };

    const context = {
      app_id: ctx.appID,
      payload: {
        epoch_id: parseInt(utils.generateOfflineThreadingID()),
        tasks: [query],
        version_id: '24631415369801570',
      },
      request_id: ctx.wsReqNumber,
      type: 3,
    };
    context.payload = JSON.stringify(context.payload);
    
ctx.mqttClient.publish('/ls_req', JSON.stringify(context), { qos: 1, retain: false }, (err) => {
      if (err) {
        utils.error("setNickname", err);
        return callback(err);
      }
      callback(null);
    });

    return returnPromise;
  };
};
