"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Made by ChoruOfficial 
   * Mqtt 
   * Adds or removes an admin from a group chat.
   *
   * @param {"admin" | "unadmin"} action The action to perform.
   * @param {string} userID The ID of the user to promote or demote.
   * @param {string} threadID The ID of the group chat.
   * @param {Function} [callback] Optional callback function.
   * @returns {Promise<object>} A promise that resolves with information about the action.
   */
  return function gcrule(action, userID, threadID, callback) {
    let _callback;

    if (typeof threadID === 'function') {
        _callback = threadID;
        threadID = null;
    } else if (typeof callback === 'function') {
        _callback = callback;
    }
    
    let resolvePromise, rejectPromise;
    const returnPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    if (typeof _callback != "function") {
      _callback = (err, data) => {
        if (err) return rejectPromise(err);
        resolvePromise(data);
      }
    }

    const validActions = ["admin", "unadmin"];
    if (!action || !validActions.includes(action.toLowerCase())) {
        return _callback(new Error(`Invalid action. Must be one of: ${validActions.join(", ")}`));
    }
    if (!userID) {
        return _callback(new Error("userID is required."));
    }
    if (!threadID) {
        return _callback(new Error("threadID is required."));
    }
    if (!ctx.mqttClient) {
        return _callback(new Error("Not connected to MQTT"));
    }

    const isAdminStatus = action.toLowerCase() === 'admin' ? 1 : 0;

    ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1;
    ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1;

    const queryPayload = {
      thread_key: parseInt(threadID),
      contact_id: parseInt(userID),
      is_admin: isAdminStatus
    };

    const query = {
      failure_count: null,
      label: "25",
      payload: JSON.stringify(queryPayload),
      queue_name: "admin_status",
      task_id: ctx.wsTaskNumber
    };

    const context = {
      app_id: ctx.appID, 
      payload: {
        epoch_id: parseInt(utils.generateOfflineThreadingID()),
        tasks: [query],
        version_id: "24631415369801570"
      },
      request_id: ctx.wsReqNumber,
      type: 3
    };
    context.payload = JSON.stringify(context.payload);

    ctx.mqttClient.publish('/ls_req', JSON.stringify(context), { qos: 1, retain: false }, (err) => {
      if (err) {
        return _callback(err);
      }

      const gcruleInfo = {
        type: "gc_rule_update",
        threadID: threadID,
        userID: userID,
        action: action.toLowerCase(),
        senderID: ctx.userID,
        BotID: ctx.userID,
        timestamp: Date.now(),
      };
      
      return _callback(null, gcruleInfo);
    });

    return returnPromise;
  };
};
