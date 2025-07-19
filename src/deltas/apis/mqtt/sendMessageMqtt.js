"use strict";

const utils = require('../../../utils');

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Uploads an attachment to Facebook's servers.
   * @param {Array<Stream>} attachments An array of readable streams.
   * @param {Function} callback The callback function.
   */
  function uploadAttachment(attachments, callback) {
    callback = callback || function () {};
    var uploads = [];
    for (var i = 0; i < attachments.length; i++) {
      if (!utils.isReadableStream(attachments[i])) {
        throw { error: "Attachment should be a readable stream and not " + utils.getType(attachments[i]) + "." };
      }
      var form = {
        upload_1024: attachments[i],
        voice_clip: "true",
      };
      uploads.push(
        defaultFuncs
          .postFormData("https://upload.facebook.com/ajax/mercury/upload.php", ctx.jar, form, {})
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(resData => {
            if (resData.error) throw resData;
            return resData.payload.metadata[0];
          }),
      );
    }
    Promise.all(uploads)
      .then(resData => callback(null, resData))
      .catch(err => {
        utils.error("uploadAttachment", err);
        return callback(err);
      });
  }

  function getSendPayload(threadID, msg, otid) {
    const isString = typeof msg === 'string';
    const body = isString ? msg : msg.body || "";
    let payload = {
      thread_id: threadID.toString(),
      otid: otid.toString(),
      source: 0,
      send_type: 1,
      sync_group: 1,
      text: body,
      initiating_source: 1,
      skip_url_preview_gen: 0,
    };
    if (typeof msg === 'object') {
      if (msg.sticker) {
        payload.send_type = 2;
        payload.sticker_id = msg.sticker;
        payload.text = null;
      }
      if (msg.attachment) {
        payload.send_type = 3;
        payload.attachment_fbids = Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment];
      }
    }
    return payload;
  }

  /**
   * Sends a message to a thread via MQTT with optional sequential editing.
   * @param {object|string} msg The message to send. Can be a string or an object.
   * @param {string} msg.body The main text of the message.
   * @param {string|Array<string>} [msg.edit] Text or an array of texts to sequentially edit the message to. Max 5 edits.
   * @param {number} [msg.setTimeout] The delay in milliseconds between each sequential edit. Defaults to 1000ms.
   * @param {*} [msg.attachment] An attachment to send.
   * @param {*} [msg.sticker] A sticker to send.
   * @param {*} [msg.emoji] An emoji to send.
   * @param {string} threadID The ID of the thread.
   * @param {string} [replyToMessage] The ID of the message to reply to.
   * @param {Function} [callback] The callback function.
   */
  return function sendMessageMqtt(msg, threadID, replyToMessage, callback) {
    let cb;
    let replyTo = null;

    if (typeof replyToMessage === 'function') {
      cb = replyToMessage;
    } else if (typeof replyToMessage === 'string') {
      replyTo = replyToMessage;
      if (typeof callback === 'function') {
        cb = callback;
      }
    } else if (typeof callback === 'function') {
      cb = callback;
    }

    cb = cb || function () {};

    if (typeof msg !== 'string' && typeof msg !== 'object') {
      return cb({ error: "Message should be of type string or object, not " + utils.getType(msg) + "." });
    }

    if (typeof threadID !== 'string' && typeof threadID !== 'number') {
      return cb({ error: "threadID must be a string or number." });
    }

    const otid = utils.generateOfflineThreadingID();

    const tasks = [{
      label: "46",
      payload: getSendPayload(threadID, msg, otid),
      queue_name: threadID.toString(),
      task_id: 0,
      failure_count: null,
    }, {
      label: "21",
      payload: {
        thread_id: threadID.toString(),
        last_read_watermark_ts: Date.now(),
        sync_group: 1,
      },
      queue_name: threadID.toString(),
      task_id: 1,
      failure_count: null,
    }];

    if (replyTo) {
      tasks[0].payload.reply_metadata = {
        reply_source_id: replyTo,
        reply_source_type: 1,
        reply_type: 0,
      };
    }

    const form = {
      app_id: "2220391788200892",
      payload: {
        tasks: tasks,
        epoch_id: utils.generateOfflineThreadingID(),
        version_id: "6120284488008082",
        data_trace_id: null,
      },
      request_id: 1,
      type: 3,
    };

    if (typeof msg === 'object' && msg.edit && Array.isArray(msg.edit) && msg.edit.length > 0) {
      const edits = msg.edit.map(item => {
        const newText = Array.isArray(item) ? item[0] : item;
        const delay = (Array.isArray(item) && typeof item[1] === 'number') ? item[1] : (msg.setTimeout || 1000);
        return [newText, delay];
      });

      const pendingEditData = { edits: edits, originalReplyId: replyTo, originalOtid: otid };
      api.pendingEdits.set(otid, pendingEditData);
      if (replyTo) {
        api.pendingEdits.set(`reply_${replyTo}`, pendingEditData);
      }
    }

    if (typeof msg === 'object' && msg.attachment) {
      const attachments = Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment];
      uploadAttachment(attachments, (err, files) => {
        if (err) return cb(err);
        form.payload.tasks[0].payload.attachment_fbids = files.map(file => Object.values(file)[0]);

        form.payload.tasks.forEach(task => task.payload = JSON.stringify(task.payload));
        form.payload = JSON.stringify(form.payload);
        ctx.mqttClient.publish("/ls_req", JSON.stringify(form), (err, data) => cb(err, data));
      });
    } else {
      form.payload.tasks.forEach(task => task.payload = JSON.stringify(task.payload));
      form.payload = JSON.stringify(form.payload);
      ctx.mqttClient.publish("/ls_req", JSON.stringify(form), (err, data) => cb(err, data));
    }
  };
};
