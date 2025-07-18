// @ChoruOfficial
"use strict";

const utils = require('../../../utils');

/**
 * Formats an event reminder object from a GraphQL response.
 * @param {Object} reminder The raw event reminder object.
 * @returns {Object} A formatted event reminder object.
 */
function formatEventReminders(reminder) {
  return {
    reminderID: reminder.id,
    eventCreatorID: reminder.lightweight_event_creator.id,
    time: reminder.time,
    eventType: reminder.lightweight_event_type.toLowerCase(),
    locationName: reminder.location_name,
    locationCoordinates: reminder.location_coordinates,
    locationPage: reminder.location_page,
    eventStatus: reminder.lightweight_event_status.toLowerCase(),
    note: reminder.note,
    repeatMode: reminder.repeat_mode.toLowerCase(),
    eventTitle: reminder.event_title,
    triggerMessage: reminder.trigger_message,
    secondsToNotifyBefore: reminder.seconds_to_notify_before,
    allowsRsvp: reminder.allows_rsvp,
    relatedEvent: reminder.related_event,
    members: reminder.event_reminder_members.edges.map(function (member) {
      return {
        memberID: member.node.id,
        state: member.guest_list_state.toLowerCase(),
      };
    }),
  };
}

/**
 * Formats a thread object from a GraphQL response.
 * @param {Object} messageThread The raw message_thread object from GraphQL.
 * @returns {Object | null} A formatted thread object or null if data is invalid.
 */
function formatThreadGraphQLResponse(messageThread) {
  if (!messageThread || !messageThread.thread_key) return null;

  const threadID = messageThread.thread_key.thread_fbid
    ? messageThread.thread_key.thread_fbid
    : messageThread.thread_key.other_user_id;

  const lastM = messageThread.last_message;
  const snippetID =
    lastM?.nodes?.[0]?.message_sender?.messaging_actor?.id || null;
  const snippetText = lastM?.nodes?.[0]?.snippet || null;
  const lastR = messageThread.last_read_receipt;
  const lastReadTimestamp = lastR?.nodes?.[0]?.timestamp_precise || null;

  return {
    threadID: threadID,
    threadName: messageThread.name,
    participantIDs: messageThread.all_participants.edges.map(
      (d) => d.node.messaging_actor.id,
    ),
    userInfo: messageThread.all_participants.edges.map((d) => ({
      id: d.node.messaging_actor.id,
      name: d.node.messaging_actor.name,
      firstName: d.node.messaging_actor.short_name,
      vanity: d.node.messaging_actor.username,
      url: d.node.messaging_actor.url,
      thumbSrc: d.node.messaging_actor.big_image_src.uri,
      profileUrl: d.node.messaging_actor.big_image_src.uri,
      gender: d.node.messaging_actor.gender,
      type: d.node.messaging_actor.__typename,
      isFriend: d.node.messaging_actor.is_viewer_friend,
      isBirthday: !!d.node.messaging_actor.is_birthday,
    })),
    unreadCount: messageThread.unread_count,
    messageCount: messageThread.messages_count,
    timestamp: messageThread.updated_time_precise,
    muteUntil: messageThread.mute_until,
    isGroup: messageThread.thread_type == "GROUP",
    isSubscribed: messageThread.is_viewer_subscribed,
    isArchived: messageThread.has_viewer_archived,
    folder: messageThread.folder,
    cannotReplyReason: messageThread.cannot_reply_reason,
    eventReminders: messageThread.event_reminders
      ? messageThread.event_reminders.nodes.map(formatEventReminders)
      : null,
    emoji: messageThread.customization_info
      ? messageThread.customization_info.emoji
      : null,
    color:
      messageThread.customization_info &&
      messageThread.customization_info.outgoing_bubble_color
        ? messageThread.customization_info.outgoing_bubble_color.slice(2)
        : null,
    threadTheme: messageThread.thread_theme,
    nicknames:
      messageThread.customization_info &&
      messageThread.customization_info.participant_customizations
        ? messageThread.customization_info.participant_customizations.reduce(
            (res, val) => {
              if (val.nickname) res[val.participant_id] = val.nickname;
              return res;
            },
            {},
          )
        : {},
    adminIDs: messageThread.thread_admins.map(a => a.id),
    approvalMode: Boolean(messageThread.approval_mode),
    approvalQueue: messageThread.group_approval_queue.nodes.map((a) => ({
      inviterID: a.inviter.id,
      requesterID: a.requester.id,
      timestamp: a.request_timestamp,
      request_source: a.request_source,
    })),
    reactionsMuteMode: messageThread.reactions_mute_mode.toLowerCase(),
    mentionsMuteMode: messageThread.mentions_mute_mode.toLowerCase(),
    isPinProtected: messageThread.is_pin_protected,
    relatedPageThread: messageThread.related_page_thread,
    name: messageThread.name,
    snippet: snippetText,
    snippetSender: snippetID,
    snippetAttachments: [],
    serverTimestamp: messageThread.updated_time_precise,
    imageSrc: messageThread.image ? messageThread.image.uri : null,
    isCanonicalUser: messageThread.is_canonical_neo_user,
    isCanonical: messageThread.thread_type != "GROUP",
    recipientsLoadable: true,
    hasEmailParticipant: false,
    readOnly: false,
    canReply: messageThread.cannot_reply_reason == null,
    lastMessageTimestamp: messageThread.last_message
      ? messageThread.last_message.timestamp_precise
      : null,
    lastMessageType: "message",
    lastReadTimestamp: lastReadTimestamp,
    threadType: messageThread.thread_type == "GROUP" ? 2 : 1,
    inviteLink: {
      enable: messageThread.joinable_mode?.mode == 1,
      link: messageThread.joinable_mode?.link || null,
    },
  };
}

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(limit: number, timestamp: number | null, tags: string[]): Promise<Array<Object>>}
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Retrieves a list of threads.
   * @param {number} limit - The number of threads to retrieve.
   * @param {number|null} timestamp - A timestamp to start fetching threads before. Use null for the most recent.
   * @param {string[]} tags - An array of tags to filter threads by (e.g., ["INBOX", "ARCHIVED"]).
   * @returns {Promise<Object[]>} A promise that resolves with an array of formatted thread objects.
   */
  return async function getThreadList(limit, timestamp = null, tags = ["INBOX"]) {
    if (utils.getType(limit) !== "Number" || !Number.isInteger(limit) || limit <= 0) {
      throw new Error("getThreadList: limit must be a positive integer.");
    }
    if (utils.getType(timestamp) !== "Null" && (utils.getType(timestamp) !== "Number" || !Number.isInteger(timestamp))) {
      throw new Error("getThreadList: timestamp must be an integer or null.");
    }
    if (utils.getType(tags) === "String") {
      tags = [tags];
    }
    if (utils.getType(tags) !== "Array") {
      throw new Error("getThreadList: tags must be an array.");
    }

    const form = {
      av: ctx.i_userID || ctx.userID,
      queries: JSON.stringify({
        o0: {
          doc_id: "3426149104143726",
          query_params: {
            limit: limit + (timestamp ? 1 : 0),
            before: timestamp,
            tags: tags,
            includeDeliveryReceipts: true,
            includeSeqID: false,
          },
        },
      }),
      batch_name: "MessengerGraphQLThreadlistFetcher",
    };

    try {
      const resData = await defaultFuncs
        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

      if (resData[resData.length - 1].error_results > 0) {
        throw new Error(JSON.stringify(resData[0].o0.errors));
      }

      if (resData[resData.length - 1].successful_results === 0) {
        throw new Error("getThreadList: there was no successful_results");
      }
      
      let nodes = resData[0].o0.data.viewer.message_threads.nodes;
      if (timestamp) {
        nodes.shift();
      }
      
      return nodes.map(formatThreadGraphQLResponse);
    } catch (err) {
      utils.error("getThreadList", err);
      throw err;
    }
  };
};
