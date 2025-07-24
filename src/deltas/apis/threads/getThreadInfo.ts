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
 * @param {Object} data The raw GraphQL data for a thread.
 * @returns {Object | null} A formatted thread object or null if data is invalid.
 */
function formatThreadGraphQLResponse(data) {
  if (data.errors) return null;
  const messageThread = data.message_thread;
  if (!messageThread) return null;

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
            function (res, val) {
              if (val.nickname) res[val.participant_id] = val.nickname;
              return res;
            },
            {},
          )
        : {},
    adminIDs: messageThread.thread_admins,
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
      enable: messageThread.joinable_mode
        ? messageThread.joinable_mode.mode == 1
        : false,
      link: messageThread.joinable_mode
        ? messageThread.joinable_mode.link
        : null,
    },
  };
}

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(threadID: string | string[]): Promise<Object>}
 */
module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Retrieves information about one or more threads.
   * @param {string|string[]} threadID A single thread ID or an array of thread IDs.
   * @returns {Promise<Object>} A promise that resolves with an object of thread info, or a single thread object if one ID was passed.
   */
  return async function getThreadInfo(threadID) {
    const threadIDs = Array.isArray(threadID) ? threadID : [threadID];
    
    let form = {};
    threadIDs.forEach((t, i) => {
      form["o" + i] = {
        doc_id: "3449967031715030",
        query_params: {
          id: t,
          message_limit: 0,
          load_messages: false,
          load_read_receipts: false,
          before: null,
        },
      };
    });

    form = {
      queries: JSON.stringify(form),
      batch_name: "MessengerGraphQLThreadFetcher",
    };

    try {
        const resData = await defaultFuncs
            .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

        if (resData.error) {
            throw resData;
        }

        const threadInfos = {};
        for (let i = resData.length - 2; i >= 0; i--) {
            const res = resData[i];
            if (res.error_results) continue;
            
            const threadInfo = formatThreadGraphQLResponse(res[Object.keys(res)[0]].data);
            if (threadInfo) {
                threadInfos[threadInfo.threadID || threadID[threadID.length - 1 - i]] = threadInfo;
            }
        }

        return Array.isArray(threadID) ? threadInfos : Object.values(threadInfos)[0] || null;
    } catch (err) {
        utils.error("getThreadInfo", err);
        throw err;
    }
  };
};
