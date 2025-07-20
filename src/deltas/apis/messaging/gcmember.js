"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Made by ChoruOfficial 
   * Mqtt
   * Adds or removes members from a group chat with pre-checking.
   *
   * @param {"add" | "remove"} action The action to perform.
   * @param {string|string[]} userIDs The user ID or array of user IDs.
   * @param {string} threadID The ID of the group chat.
   * @param {Function} [callback] Optional callback function.
   * @returns {Promise<object>} A promise that resolves with information about the action.
   */
  return async function gcmember(action, userIDs, threadID, callback) {
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
        // Note: We will now rarely use the 'err' parameter for validation errors
        if (err) return rejectPromise(err);
        resolvePromise(data);
      }
    }

    try {
        const validActions = ["add", "remove"];
        action = action ? action.toLowerCase() : "";

        // --- ERROR CHECKS NOW RETURN AN OBJECT INSTEAD OF THROWING ---
        if (!validActions.includes(action)) {
            return _callback(null, { type: "error_gc", error: `Invalid action. Must be one of: ${validActions.join(", ")}` });
        }
        if (!userIDs || userIDs.length === 0) {
            return _callback(null, { type: "error_gc", error: "userIDs is required." });
        }
        if (!threadID) {
            return _callback(null, { type: "error_gc", error: "threadID is required." });
        }
        if (!ctx.mqttClient) {
            return _callback(null, { type: "error_gc", error: "Not connected to MQTT" });
        }

        const threadInfo = await api.getThreadInfo(threadID);
        if (!threadInfo) {
            return _callback(null, { type: "error_gc", error: "Could not retrieve thread information." });
        }
        if (threadInfo.isGroup === false) {
            return _callback(null, { type: "error_gc", error: "This feature is only for group chats, not private messages." });
        }
        
        const currentMembers = threadInfo.participantIDs;
        const usersToModify = Array.isArray(userIDs) ? userIDs : [userIDs];
        let queryPayload, query;
        let finalUsers = usersToModify;
        
        ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1;
        ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1;

        if (action === 'add') {
            const usersToAdd = usersToModify.filter(id => !currentMembers.includes(id));
            if (usersToAdd.length === 0) {
                return _callback(null, { type: "error_gc", error: "All specified users are already in the group." });
            }
            finalUsers = usersToAdd;
            queryPayload = { thread_key: parseInt(threadID), contact_ids: finalUsers.map(id => parseInt(id)), sync_group: 1 };
            query = { label: "23", payload: JSON.stringify(queryPayload), queue_name: threadID, task_id: ctx.wsTaskNumber };
        
        } else { // action is 'remove'
            const userToRemove = usersToModify[0];
            if (!currentMembers.includes(userToRemove)) {
                return _callback(null, { type: "error_gc", error: `User with ID ${userToRemove} is not in this group chat.` });
            }
            finalUsers = [userToRemove];
            queryPayload = { thread_id: threadID, contact_id: userToRemove, sync_group: 1 };
            query = { label: "140", payload: JSON.stringify(queryPayload), queue_name: "remove_participant_v2", task_id: ctx.wsTaskNumber };
        }

        const context = {
          app_id: ctx.appID,
          payload: { epoch_id: parseInt(utils.generateOfflineThreadingID()), tasks: [query], version_id: "24631415369801570" },
          request_id: ctx.wsReqNumber,
          type: 3
        };
        context.payload = JSON.stringify(context.payload);

        ctx.mqttClient.publish('/ls_req', JSON.stringify(context), { qos: 1, retain: false }, (err) => {
          if (err) return _callback(err); // For network errors, we still reject
          
          const gcmemberInfo = {
            type: "gc_member_update",
            threadID: threadID,
            userIDs: finalUsers,
            action: action,
            senderID: ctx.userID,
            BotID: ctx.userID,
            timestamp: Date.now(),
          };
          return _callback(null, gcmemberInfo);
        });
    } catch (err) {
      
        return _callback(null, { type: "error_gc", error: err.message || "An unknown error occurred." });
    }

    return returnPromise;
  };
};
