/* eslint-disable linebreak-style */
"use strict";

const utils = require('../../../utils');

/**
 * @module shareContact
 * @param {Object} defaultFuncs - The default functions provided by the API.
 * @param {Object} api - The full API object.
 * @param {Object} ctx - The context object.
 * @returns {function(text: string, senderID: string, threadID: string, callback: Function): void} - A function to share a contact.
 */
module.exports = function(defaultFuncs, api, ctx) {
  /**
   * Shares a user's contact information into a specific thread via MQTT.
   * @param {string} [text] - An optional message to send along with the contact card.
   * @param {string} senderID - The Facebook user ID of the contact you want to share.
   * @param {string} threadID - The ID of the thread where the contact will be shared.
   * @param {Function} [callback] - An optional callback function to be executed.
   */
  return function shareContact(text, senderID, threadID, callback) {
    if (!ctx.mqttClient) {
      throw new Error('Not connected to MQTT');
    }

    ctx.wsReqNumber ??= 0;
    ctx.wsTaskNumber ??= 0;

    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    const queryPayload = {
      contact_id: senderID,
      sync_group: 1,
      text: text || "",
      thread_id: threadID
    };

    const query = {
      failure_count: null,
      label: '359',
      payload: JSON.stringify(queryPayload),
      queue_name: 'messenger_contact_sharing',
      task_id: Math.random() * 1001 << 0,
    };

    const context = {
      app_id: '2220391788200892',
      payload: {
        tasks: [query],
        epoch_id: utils.generateOfflineThreadingID(),
        version_id: '7214102258676893',
      },
      request_id: ctx.wsReqNumber,
      type: 3,
    };

    context.payload = JSON.stringify(context.payload);

    if (typeof callback === 'function') {
      ctx.callback_Task[ctx.wsReqNumber] = { callback, type: "shareContact" };
    }

    ctx.mqttClient.publish('/ls_req', JSON.stringify(context), { qos: 1, retain: false });
  };
};
