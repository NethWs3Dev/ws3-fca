"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  
  /**
   * Made by Choru Official 
   * Mqtt
   * Sets the custom emoji for a specific Facebook thread via MQTT.
   *
   * @param {string} emoji The emoji character to set as the custom emoji (e.g., "👍", "❤️").
   * @param {string} threadID The ID of the thread where the emoji will be set.
   * @param {Function} [callback] Optional callback function to be invoked upon completion.
   * @returns {Promise<void>} A promise that resolves on success or rejects on error.
   */
  return function emoji(emoji, threadID, callback) {
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

    threadID = threadID || ctx.threadID;

    if (!callback) {
      callback = function (err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    if (!threadID) {
      return callback({ error: "threadID is required to set an emoji." });
    }
    if (!emoji) {
      return callback({ error: "An emoji character is required." });
    }

    if (!ctx.mqttClient) {
      return callback({ error: "Not connected to MQTT" });
    }

    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    const queryPayload = {
      thread_key: threadID.toString(),
      custom_emoji: emoji,
      avatar_sticker_instruction_key_id: null,
      sync_group: 1,
    };

    const query = {
      failure_count: null,
      label: '100003',
      payload: JSON.stringify(queryPayload),
      queue_name: 'thread_quick_reaction',
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
        utils.error("setEmoji", err);
        return callback(err);
      }
      callback(null);
    });

    return returnPromise;
  };
};
