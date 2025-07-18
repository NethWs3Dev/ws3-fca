"use strict";

const utils = require('../../../utils'); 
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const deepdash = require("deepdash");
const { JSONPath } = require("jsonpath-plus");

deepdash(_);

/**
 * Extract and save the full lightspeed_web_request object from thread data.
 * Also search for specific pinned message commands.
 * @param {Object} allJsonData - Raw JSON response from Facebook.
 * @returns {Object|null} The full lightspeed_web_request object or null.
 */
function extractAndSearchLightspeedRequest(allJsonData) {
  const outputFile = path.join(__dirname, "lightspeed_web_request.json");

  const lightReq = _.get(allJsonData, "__bbox.result.data.viewer.lightspeed_web_request");
  if (!lightReq) {
    utils.warn("pin.js: lightspeed_web_request not found.");
    return null;
  }

  // Save the entire object for debugging
  try {
    fs.writeFileSync(outputFile, JSON.stringify(lightReq, null, 2), "utf8");
    utils.log(`pin.js: Saved lightspeed_web_request to ${outputFile}`);
  } catch (err) {
    utils.error("pin.js: Failed to write lightspeed_web_request.json", err);
  }

  // 🔍 Use JSONPath to search for both commands
  try {
    const matches = JSONPath({
      path: `$..[?(@ === "setPinnedMessage" || @ === "deleteThenInsertMessage")]`,
      json: lightReq
    });

    utils.log(`pin.js: Found ${matches.length} matching command(s).`);
    matches.forEach((match, idx) => {
      console.log(`📌 Match ${idx + 1}:`, match);
    });
  } catch (err) {
    utils.error("pin.js: JSONPath search failed.", err);
  }

  return lightReq;
}

module.exports = function (defaultFuncs, api, ctx) {
  return async function pin(action, threadID, messageID) {
    if (action === "list") {
      if (!threadID) throw new Error('Action "list" requires threadID.');

      try {
        const url = `https://www.facebook.com/messages/t/${threadID}/`;
        const allJsonData = await utils.json(url, ctx.jar, null, ctx.globalOptions, ctx);

        // Extract, save and search commands inside lightspeed_web_request
        const lightReq = extractAndSearchLightspeedRequest(allJsonData);
        return lightReq;
      } catch (err) {
        utils.error(`pin.js: Failed to process "list" for thread ${threadID}`, err);
        throw err;
      }
    }

    if (!ctx.mqttClient) throw new Error("MQTT not connected.");
    if (!threadID || !messageID) throw new Error(`"${action}" requires threadID and messageID.`);

    const epoch_id = parseInt(utils.generateOfflineThreadingID());
    const version_id = "9523201934447612";
    const app_id = "2220391788200892";

    const createMqttRequest = (tasks, increment = 0) => ({
      app_id,
      payload: JSON.stringify({ epoch_id: epoch_id + increment, tasks, version_id }),
      request_id: (ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1),
      type: 3
    });

    const publishMqtt = (content) =>
      new Promise((resolve, reject) => {
        ctx.mqttClient.publish("/ls_req", JSON.stringify(content), { qos: 1, retain: false }, (err) => {
          if (err) reject(err);
          else resolve({ success: true, request_id: content.request_id });
        });
      });

    if (action === "pin") {
      const pinTask = {
        label: "430",
        payload: JSON.stringify({ thread_key: threadID, message_id: messageID, timestamp_ms: Date.now() }),
        queue_name: `pin_msg_v2_${threadID}`,
        task_id: (ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1)
      };
      const setSearchTask = {
        label: "751",
        payload: JSON.stringify({ thread_key: threadID, message_id: messageID, pinned_message_state: 1 }),
        queue_name: "set_pinned_message_search",
        task_id: (ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1)
      };
      const req1 = createMqttRequest([pinTask], 0);
      const req2 = createMqttRequest([setSearchTask], 1);
      return Promise.all([publishMqtt(req1), publishMqtt(req2)]);
    }

    if (action === "unpin") {
      const setSearchTask1 = {
        label: "751",
        payload: JSON.stringify({ thread_key: threadID, message_id: messageID, pinned_message_state: 0 }),
        queue_name: "set_pinned_message_search",
        task_id: (ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1)
      };
      const unpinTask = {
        label: "431",
        payload: JSON.stringify({ thread_key: threadID, message_id: messageID, timestamp_ms: Date.now() }),
        queue_name: `unpin_msg_v2_${threadID}`,
        task_id: (ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1)
      };
      const setSearchTask2 = {
        label: "751",
        payload: JSON.stringify({ thread_key: threadID, message_id: messageID, pinned_message_state: 0 }),
        queue_name: "set_pinned_message_search",
        task_id: (ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1)
      };
      await publishMqtt(createMqttRequest([setSearchTask1], 0));
      await publishMqtt(createMqttRequest([unpinTask], 1));
      return publishMqtt(createMqttRequest([setSearchTask2], 2));
    }

    throw new Error(`Invalid action: "${action}". Use "pin", "unpin", or "list".`);
  };
};
