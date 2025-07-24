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
   * @param {string} [initiatorID] The ID of the user who initiated the emoji change (e.g., from event.senderID).
   * @returns {Promise<object>} A promise that resolves with a structured event object on success or rejects on error.
   */
  return function emoji(emoji, threadID, callback, initiatorID) {
    let _callback;
    let _initiatorID;

    let _resolvePromise;
    let _rejectPromise;
    const returnPromise = new Promise((resolve, reject) => {
        _resolvePromise = resolve;
        _rejectPromise = reject;
    });

    if (utils.getType(callback) === "Function" || utils.getType(callback) === "AsyncFunction") {
        _callback = callback;
        _initiatorID = initiatorID;
    } else if (utils.getType(threadID) === "Function" || utils.getType(threadID) === "AsyncFunction") {
        _callback = threadID;
        threadID = null;
        _initiatorID = callback;
    } else if (utils.getType(callback) === "string") {
        _initiatorID = callback;
        _callback = undefined;
    } else {
        _callback = undefined;
        _initiatorID = undefined;
    }

    if (!_callback) {
      _callback = function (__err, __data) {
        if (__err) _rejectPromise(__err);
        else _resolvePromise(__data);
      };
    } else {
      const originalCallback = _callback;
      _callback = function(__err, __data) {
        if (__err) {
          originalCallback(__err);
          _rejectPromise(__err);
        } else {
          originalCallback(null, __data);
          _resolvePromise(__data);
        }
      };
    }

    _initiatorID = _initiatorID || ctx.userID;

    threadID = threadID || ctx.threadID;

    if (!threadID) {
      return _callback(new Error("threadID is required to set an emoji."));
    }
    if (!emoji) {
      return _callback(new Error("An emoji character is required."));
    }

    if (!ctx.mqttClient) {
      return _callback(new Error("Not connected to MQTT"));
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
        return _callback(new Error(`MQTT publish failed for emoji: ${err.message || err}`));
      }
      
      const emojiChangeEvent = {
        type: "thread_emoji_update",
        threadID: threadID,
        newEmoji: emoji,
        senderID: _initiatorID,
        BotID: ctx.userID,
        timestamp: Date.now(),
      };
      _callback(null, emojiChangeEvent);
    });

    return returnPromise;
  };
};
