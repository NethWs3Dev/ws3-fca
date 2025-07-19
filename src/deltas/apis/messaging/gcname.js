"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Made by Choru Official
   * Mqtt
   * Sets the name of a group chat thread via MQTT.
   *
   * @param {string} newName The new name for the group chat.
   * @param {string} threadID The ID of the group chat thread.
   * @param {Function} [callback] Optional callback function to be invoked upon completion.
   * @param {string} [initiatorID] The ID of the user who initiated the group name change (e.g., from event.senderID).
   * @returns {Promise<object>} A promise that resolves with a structured event object on success or rejects on error.
   */
  return function gcname(newName, threadID, callback, initiatorID) {
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
      return _callback(new Error("threadID is required to change the group chat name."));
    }
    if (typeof newName !== 'string') {
      return _callback(new Error("newName must be a string."));
    }

    if (!ctx.mqttClient) {
      return _callback(new Error("Not connected to MQTT"));
    }

    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    const queryPayload = {
      thread_key: threadID.toString(),
      thread_name: newName,
      sync_group: 1,
    };

    const query = {
      failure_count: null,
      label: '32',
      payload: JSON.stringify(queryPayload),
      queue_name: threadID.toString(),
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
        return _callback(new Error(`MQTT publish failed for gcname: ${err.message || err}`));
      }
      
      const gcnameChangeEvent = {
        type: "thread_name_update",
        threadID: threadID,
        newName: newName,
        senderID: _initiatorID,
        BotID: ctx.userID,
        timestamp: Date.now(),
      };
      _callback(null, gcnameChangeEvent);
    });

    return returnPromise;
  };
};
