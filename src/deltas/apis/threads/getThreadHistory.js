"use strict";

const utils = require('../../../utils');

// @ChoruOfficial
/**
 * Formats a single attachment object from a GraphQL response.
 * @param {Object} attachment The raw attachment object.
 * @returns {Object} A formatted attachment object.
 */
function formatAttachmentsGraphQLResponse(attachment) {
    switch (attachment.__typename) {
        case "MessageImage":
            return {
                type: "photo",
                ID: attachment.legacy_attachment_id,
                filename: attachment.filename,
                thumbnailUrl: attachment.thumbnail.uri,
                previewUrl: attachment.preview.uri,
                previewWidth: attachment.preview.width,
                previewHeight: attachment.preview.height,
                largePreviewUrl: attachment.large_preview.uri,
                largePreviewHeight: attachment.large_preview.height,
                largePreviewWidth: attachment.large_preview.width,
                url: attachment.large_preview.uri,
                width: attachment.original_dimensions.x,
                height: attachment.original_dimensions.y,
                name: attachment.filename
            };
        case "MessageAnimatedImage":
            return {
                type: "animated_image",
                ID: attachment.legacy_attachment_id,
                filename: attachment.filename,
                previewUrl: attachment.preview_image.uri,
                previewWidth: attachment.preview_image.width,
                previewHeight: attachment.preview_image.height,
                url: attachment.animated_image.uri,
                width: attachment.animated_image.width,
                height: attachment.animated_image.height,
                name: attachment.filename,
                facebookUrl: attachment.animated_image.uri,
            };
        case "MessageVideo":
            return {
                type: "video",
                ID: attachment.legacy_attachment_id,
                filename: attachment.filename,
                duration: attachment.playable_duration_in_ms,
                thumbnailUrl: attachment.large_image.uri,
                previewUrl: attachment.large_image.uri,
                previewWidth: attachment.large_image.width,
                previewHeight: attachment.large_image.height,
                url: attachment.playable_url,
                width: attachment.original_dimensions.x,
                height: attachment.original_dimensions.y,
                videoType: attachment.video_type.toLowerCase(),
            };
        case "MessageFile":
            return {
                type: "file",
                ID: attachment.message_file_fbid,
                filename: attachment.filename,
                url: attachment.url,
                isMalicious: attachment.is_malicious,
                contentType: attachment.content_type,
                name: attachment.filename,
            };
        case "MessageAudio":
            return {
                type: "audio",
                ID: attachment.url_shimhash,
                filename: attachment.filename,
                duration: attachment.playable_duration_in_ms,
                audioType: attachment.audio_type,
                url: attachment.playable_url,
                isVoiceMail: attachment.is_voicemail,
            };
        default:
            return {
                type: "unknown",
                error: "Don't know about attachment type " + attachment.__typename,
            };
    }
}

/**
 * Formats a share (extensible) attachment from a GraphQL response.
 * @param {Object} attachment The raw extensible attachment object.
 * @returns {Object} A formatted share attachment object.
 */
function formatExtensibleAttachment(attachment) {
    if (attachment.story_attachment) {
        return {
            type: "share",
            ID: attachment.legacy_attachment_id,
            url: attachment.story_attachment.url,
            title: attachment.story_attachment.title_with_entities.text,
            description: attachment.story_attachment.description && attachment.story_attachment.description.text,
            source: attachment.story_attachment.source == null ? null : attachment.story_attachment.source.text,
            image: attachment.story_attachment.media?.image?.uri,
            width: attachment.story_attachment.media?.image?.width,
            height: attachment.story_attachment.media?.image?.height,
            playable: attachment.story_attachment.media?.is_playable,
            duration: attachment.story_attachment.media?.playable_duration_in_ms,
            playableUrl: attachment.story_attachment.media?.playable_url,
            subattachments: attachment.story_attachment.subattachments,
            properties: attachment.story_attachment.properties.reduce((obj, cur) => {
                obj[cur.key] = cur.value.text;
                return obj;
            }, {}),
        };
    }
    return { type: "unknown", error: "Don't know what to do with extensible_attachment." };
}

/**
 * Formats the response from a GraphQL message history query.
 * @param {Object} data The raw GraphQL response data.
 * @returns {Array<Object>} An array of formatted message objects.
 */
function formatMessagesGraphQLResponse(data) {
    const messageThread = data.o0.data.message_thread;
    if (!messageThread) return [];

    const threadID = messageThread.thread_key.thread_fbid ? messageThread.thread_key.thread_fbid : messageThread.thread_key.other_user_id;

    return messageThread.messages.nodes.map(d => {
        switch (d.__typename) {
            case "UserMessage":
                const mentions = {};
                if (d.message?.ranges) {
                    d.message.ranges.forEach(e => {
                        mentions[e.entity.id] = d.message.text.substring(e.offset, e.offset + e.length);
                    });
                }
                return {
                    type: "message",
                    attachments: d.sticker ? [{
                        type: "sticker",
                        ID: d.sticker.id,
                        url: d.sticker.url,
                        packID: d.sticker.pack?.id,
                        frameCount: d.sticker.frame_count,
                        frameRate: d.sticker.frame_rate,
                        framesPerRow: d.sticker.frames_per_row,
                        framesPerCol: d.sticker.frames_per_col,
                        stickerID: d.sticker.id,
                    }] : (d.blob_attachments || []).map(formatAttachmentsGraphQLResponse).concat(d.extensible_attachment ? [formatExtensibleAttachment(d.extensible_attachment)] : []),
                    body: d.message?.text || "",
                    isGroup: messageThread.thread_type === "GROUP",
                    messageID: d.message_id,
                    senderID: d.message_sender.id,
                    threadID: threadID,
                    timestamp: d.timestamp_precise,
                    mentions: mentions,
                    isUnread: d.unread,
                    messageReactions: d.message_reactions?.map(r => ({ reaction: r.reaction, userID: r.user.id })) || [],
                };
            case "ThreadNameMessage":
            case "ThreadImageMessage":
            case "ParticipantLeftMessage":
            case "ParticipantsAddedMessage":
            case "GenericAdminTextMessage": {
                // This is the fix. We are now formatting the event directly
                // instead of calling the incompatible `formatDeltaEvent`.
                return {
                    type: "event",
                    messageID: d.message_id,
                    threadID: threadID,
                    isGroup: messageThread.thread_type === "GROUP",
                    senderID: d.message_sender.id,
                    author: d.message_sender.id,
                    timestamp: d.timestamp_precise,
                    snippet: d.snippet,
                    logMessageType: utils.getAdminTextMessageType(d.extensible_message_admin_text_type || d.__typename),
                    logMessageData: d.extensible_message_admin_text || d,
                };
            }
            default:
                return { type: "unknown", error: "Unknown message type " + d.__typename, raw: d };
        }
    });
}

/**
 * @param {Object} defaultFuncs
 * @param {Object} api
 * @param {Object} ctx
 * @returns {function(threadID: string, amount: number, timestamp: number | null): Promise<Array<Object>>}
 */
module.exports = function (defaultFuncs, api, ctx) {
    /**
     * Retrieves the message history for a specific thread.
     * @param {string} threadID The ID of the thread to fetch history from.
     * @param {number} amount The number of messages to retrieve.
     * @param {number | null} timestamp The timestamp to start fetching messages before.
     * @returns {Promise<Array<Object>>} A promise that resolves with an array of formatted message objects.
     */
    return async function getThreadHistory(threadID, amount, timestamp) {
        if (!threadID || !amount) {
            throw new Error("getThreadHistory: threadID and amount are required.");
        }

        const form = {
            av: ctx.globalOptions.pageID,
            queries: JSON.stringify({
                o0: {
                    doc_id: "1498317363570230",
                    query_params: {
                        id: threadID,
                        message_limit: amount,
                        load_messages: 1,
                        load_read_receipts: false,
                        before: timestamp || null,
                    },
                },
            }),
        };

        try {
            const resData = await defaultFuncs.post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form);
            const parsedData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

            if (parsedData.error || (Array.isArray(parsedData) && parsedData[parsedData.length - 1].error_results !== 0)) {
                throw parsedData;
            }
            
            if (!Array.isArray(parsedData) || !parsedData[0] || !parsedData[0].o0 || !parsedData[0].o0.data) {
                throw { error: "getThreadHistory: Malformed response from GraphQL.", res: parsedData };
            }

            return formatMessagesGraphQLResponse(parsedData[0]);
        } catch (err) {
            utils.error("getThreadHistory", err);
            throw err;
        }
    };
};
