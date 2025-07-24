"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Made by ChoruOfficial 
   * Mqtt
   * Adds or removes an admin from a group chat with pre-checking.
   *
   * @param {"admin" | "unadmin"} action The action to perform.
   * @param {string} userID The ID of the user to promote or demote.
   * @param {string} threadID The ID of the group chat.
   * @param {Function} [callback] Optional callback function.
   * @returns {Promise<object>} A promise that resolves with information about the action.
   */
  return async function gcrule(action, userID, threadID, callback) {
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

    try {
        const validActions = ["admin", "unadmin"];
        action = action ? action.toLowerCase() : "";

        if (!validActions.includes(action)) {
            return _callback(null, { type: "error_gc_rule", error: `Invalid action. Must be one of: ${validActions.join(", ")}` });
        }
        if (!userID) return _callback(null, { type: "error_gc_rule", error: "userID is required." });
        if (!threadID) return _callback(null, { type: "error_gc_rule", error: "threadID is required." });
        if (!ctx.mqttClient) return _callback(null, { type: "error_gc_rule", error: "Not connected to MQTT" });
        
        const threadInfo = await api.getThreadInfo(threadID);
        if (!threadInfo) {
            return _callback(null, { type: "error_gc_rule", error: "Could not retrieve thread information." });
        }
        if (threadInfo.isGroup === false) {
            return _callback(null, { type: "error_gc_rule", error: "This feature is only for group chats." });
        }

        const adminIDs = threadInfo.adminIDs || [];
        const isCurrentlyAdmin = adminIDs.some(admin => admin.id === userID);

        if (action === 'admin') {
            if (isCurrentlyAdmin) {
                return _callback(null, { type: "error_gc_rule", error: `User is already an admin.` });
            }
        } else { // action is 'unadmin'
            if (!isCurrentlyAdmin) {
                return _callback(null, { type: "error_gc_rule", error: `User is not an admin.` });
            }
        }

        const isAdminStatus = action === 'admin' ? 1 : 0;
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
            if (err) return _callback(err);
            const gcruleInfo = {
                type: "gc_rule_update",
                threadID: threadID,
                userID: userID,
                action: action,
                senderID: ctx.userID,
                BotID: ctx.userID,
                timestamp: Date.now(),
            };
            return _callback(null, gcruleInfo);
        });

    } catch (err) {
        return _callback(null, { type: "error_gc_rule", error: err.message || "An unknown error occurred." });
    }
    
    return returnPromise;
  };
};
