// @ChoruOfficial
"use strict";

const utils = require('../../../utils');

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 */
module.exports = function (defaultFuncs, api, ctx) {
	/**
	 * Sends a typing indicator to a specific thread.
	 * @param {boolean} sendTyping - True to show typing indicator, false to hide.
	 * @param {string} threadID - The ID of the thread to send the typing indicator to.
	 * @param {Function} [callback] - An optional callback function.
	 * @returns {Promise<void>}
	 */
	return async function sendTypingIndicatorV2(sendTyping, threadID, callback) {
		let count_req = 0;
		const wsContent = {
			app_id: 2220391788200892,
			payload: JSON.stringify({
				label: 3,
				payload: JSON.stringify({
					thread_key: threadID.toString(),
					is_group_thread: +(threadID.toString().length >= 16),
					is_typing: +sendTyping,
					attribution: 0
				}),
				version: 5849951561777440
			}),
			request_id: ++count_req,
			type: 4
		};
		await new Promise((resolve, reject) => ctx.mqttClient.publish('/ls_req', JSON.stringify(wsContent), {}, (err, _packet) => err ? reject(err) : resolve()));
		if (callback) {
			callback();
		}
	};
};
