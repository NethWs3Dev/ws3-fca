"use strict";

const utils = require('../../../utils');

/**
 * @ChoruOfficial
 * @description A module for interacting with Facebook Messenger Notes. This is not for creating notes on a user's profile page, but rather the temporary status-like notes in Messenger.
 * @param {Object} defaultFuncs The default functions provided by the API wrapper.
 * @param {Object} api The full API object.
 * @param {Object} ctx The context object containing the user's session state (e.g., userID, jar).
 * @returns {Object} An object containing methods to create, delete, recreate, and check notes.
 */
module.exports = function(defaultFuncs, api, ctx) {

  /**
   * @callback notesCallback
   * @param {Error|null} error An error object if the request fails, otherwise null.
   * @param {Object} [data] The data returned from the API.
   */

  /**
   * Checks for the currently active note for the logged-in user.
   * @param {notesCallback} callback A callback function that is executed after the request. It receives an error object (if any) and an object representing the current note.
   */
  function checkNote(callback) {
    if (typeof callback !== 'function') {
      callback = () => {};
    }

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "MWInboxTrayNoteCreationDialogQuery",
      variables: JSON.stringify({ scale: 2 }),
      doc_id: "30899655739648624",
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(resData => {
        if (resData && resData.errors) throw resData.errors[0];
        const currentNote = resData?.data?.viewer?.actor?.msgr_user_rich_status;
        callback(null, currentNote);
      })
      .catch(err => {
        utils.error("notes.checkNote", err);
        callback(err);
      });
  }

  /**
   * Creates a new note with the provided text. The note lasts for 24 hours (86400 seconds).
   * @param {string} text The content of the note.
   * @param {notesCallback} callback A callback function that is executed after the request. It receives an error object (if any) and an object confirming the note's creation status.
   */
  function createNote(text, callback) {
    if (typeof callback !== 'function') {
      callback = () => {};
    }

    const variables = {
      input: {
        client_mutation_id: Math.round(Math.random() * 10).toString(),
        actor_id: ctx.userID,
        description: text,
        duration: 86400, // 24 hours in seconds
        note_type: "TEXT_NOTE",
        privacy: "FRIENDS",
        session_id: utils.getGUID(),
      },
    };
    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "MWInboxTrayNoteCreationDialogCreationStepContentMutation",
      variables: JSON.stringify(variables),
      doc_id: "24060573783603122",
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(resData => {
        if (resData && resData.errors) throw resData.errors[0];
        const status = resData?.data?.xfb_rich_status_create?.status;
        if (!status) throw new Error("Could not find note status in the server response.");
        callback(null, status);
      })
      .catch(err => {
        utils.error("notes.createNote", err);
        callback(err);
      });
  }

  /**
   * Deletes a specific note by its ID.
   * @param {string} noteID The ID of the note to be deleted.
   * @param {notesCallback} callback A callback function that is executed after the request. It receives an error object (if any) and an object confirming the deletion.
   */
  function deleteNote(noteID, callback) {
    if (typeof callback !== 'function') {
      callback = () => {};
    }

    const variables = {
      input: {
        client_mutation_id: Math.round(Math.random() * 10).toString(),
        actor_id: ctx.userID,
        rich_status_id: noteID,
      },
    };
    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "useMWInboxTrayDeleteNoteMutation",
      variables: JSON.stringify(variables),
      doc_id: "9532619970198958",
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(resData => {
        if (resData && resData.errors) throw resData.errors[0];
        const deletedStatus = resData?.data?.xfb_rich_status_delete;
        if (!deletedStatus) throw new Error("Could not find deletion status in the server response.");
        callback(null, deletedStatus);
      })
      .catch(err => {
        utils.error("notes.deleteNote", err);
        callback(err);
      });
  }

  /**
   * A convenience function that first deletes an old note and then creates a new one.
   * @param {string} oldNoteID The ID of the note to delete.
   * @param {string} newText The text for the new note.
   * @param {notesCallback} callback A callback function that is executed after the request. It receives an error object (if any) and an object containing the deletion and creation statuses.
   */
  function recreateNote(oldNoteID, newText, callback) {
    if (typeof callback !== 'function') {
      callback = () => {};
    }

    deleteNote(oldNoteID, (err, deleted) => {
      if (err) {
        return callback(err);
      }
      createNote(newText, (err, created) => {
        if (err) {
          return callback(err);
        }
        callback(null, { deleted, created });
      });
    });
  }

  return {
    create: createNote,
    delete: deleteNote,
    recreate: recreateNote,
    check: checkNote,
  };
};
