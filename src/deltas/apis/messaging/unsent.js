"use strict";

const utils = require('../../../utils');

module.exports = (defaultFuncs, api, ctx) => {
  /**
   * Unsends a message using the MQTT connection.
   * @param {string} messageID The ID of the message to unsend.
   * @param {string} threadID The ID of the thread where the message is located.
   * @returns {Promise<object>} A promise that resolves with a confirmation object.
   * @throws {Error} If messageID, threadID are missing, or if not connected to MQTT.
   */
  return async (messageID, threadID) => {
    if (!messageID) {
      throw new Error("A 'messageID' is required to unsend a message.");
    }
    if (!threadID) {
      throw new Error("A 'threadID' is required to unsend a message.");
    }
    if (!ctx.mqttClient) {
      throw new Error("Not connected to MQTT. Please reconnect.");
    }

    ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1;
    ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1;

    const queryPayload = {
      message_id: messageID,
      thread_key: parseInt(threadID), // The API expects the threadID as an integer
      sync_group: 1
    };

    const task = {
      failure_count: null,
      label: "33", 
      payload: JSON.stringify(queryPayload),
      queue_name: "unsend_message",
      task_id: ctx.wsTaskNumber
    };

    const payload = {
      app_id: ctx.appID, 
      epoch_id: parseInt(utils.generateOfflineThreadingID()),
      tasks: [task],
      version_id: "31324585827132504"
    };
    
    const context = {
      payload: JSON.stringify(payload),
      request_id: ctx.wsReqNumber,
      type: 3
    };

     await ctx.mqttClient.publish('/ls_req', JSON.stringify(context), { qos: 1, retain: false });

    return {
      type: "unsend_message_response",
      threadID: threadID,
      messageID: messageID,
      senderID: ctx.userID,
      timestamp: Date.now()
    };
  };
};
