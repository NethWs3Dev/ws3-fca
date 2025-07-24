'use strict';

const utils = require('../../../utils');

/**
 * Handles the upload of attachments (images/videos) for a comment.
 * @param {object} defaultFuncs - The default functions for making API requests.
 * @param {object} ctx - The context object.
 * @param {object} msg - The message object, containing attachments.
 * @param {object} form - The main form object to be populated.
 * @returns {Promise<void>}
 */
async function handleUpload(defaultFuncs, ctx, msg, form) {
    if (!msg.attachments || msg.attachments.length === 0) {
        return;
    }

    const uploads = msg.attachments.map(item => {
        if (!utils.isReadableStream(item)) {
            throw new Error('Attachments must be a readable stream.');
        }
        return defaultFuncs
            .postFormData('https://www.facebook.com/ajax/ufi/upload/', ctx.jar, {
                profile_id: ctx.userID,
                source: 19,
                target_id: ctx.userID,
                file: item
            })
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
            .then(res => {
                if (res.error || !res.payload?.fbid) {
                    throw res;
                }
                return { media: { id: res.payload.fbid } };
            });
    });

    const results = await Promise.all(uploads);
    form.input.attachments.push(...results);
}

/**
 * Handles a URL attachment for a comment.
 * @param {object} msg - The message object.
 * @param {object} form - The main form object.
 */
function handleURL(msg, form) {
    if (typeof msg.url === 'string') {
        form.input.attachments.push({
            link: {
                external: {
                    url: msg.url
                }
            }
        });
    }
}

/**
 * Handles mentions in the comment body.
 * @param {object} msg - The message object.
 * @param {object} form - The main form object.
 */
function handleMentions(msg, form) {
    if (!msg.mentions) return;

    for (const item of msg.mentions) {
        const { tag, id, fromIndex } = item;
        if (typeof tag !== 'string' || !id) {
            utils.warn('createCommentPost', 'Mentions must have a string "tag" and an "id".');
            continue;
        }
        const offset = msg.body.indexOf(tag, fromIndex || 0);
        if (offset < 0) {
            utils.warn('createCommentPost', `Mention for "${tag}" not found in message string.`);
            continue;
        }
        form.input.message.ranges.push({
            entity: { id },
            length: tag.length,
            offset
        });
    }
}

/**
 * Handles a sticker attachment for a comment.
 * @param {object} msg - The message object.
 * @param {object} form - The main form object.
 */
function handleSticker(msg, form) {
    if (msg.sticker) {
        form.input.attachments.push({
            media: {
                id: String(msg.sticker)
            }
        });
    }
}

/**
 * Submits the final comment form to the GraphQL endpoint.
 * @param {object} defaultFuncs - The default functions.
 * @param {object} ctx - The context object.
 * @param {object} form - The fully constructed form object.
 * @returns {Promise<object>} A promise that resolves with the comment info.
 */
async function createContent(defaultFuncs, ctx, form) {
    const res = await defaultFuncs
        .post('https://www.facebook.com/api/graphql/', ctx.jar, {
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: 'useCometUFICreateCommentMutation',
            variables: JSON.stringify(form),
            server_timestamps: true,
            doc_id: 6993516810709754
        })
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
    
    if (res.errors) {
        throw res;
    }
    
    const commentEdge = res.data.comment_create.feedback_comment_edge;
    return {
        id: commentEdge.node.id,
        url: commentEdge.node.feedback.url,
        count: res.data.comment_create.feedback.total_comment_count
    };
}

/**
 * Creates a comment on a Facebook post. Can also reply to an existing comment.
 * @param {string|object} msg - The message to post. Can be a string or an object with `body`, `attachments`, `mentions`, etc.
 * @param {string} postID - The ID of the post to comment on.
 * @param {string} [replyCommentID] - (Optional) The ID of the comment to reply to.
 * @param {function} [callback] - (Optional) A callback function.
 * @returns {Promise<object>} A promise that resolves with the new comment's information.
 */
module.exports = function(defaultFuncs, api, ctx) {
    return async function createCommentPost(msg, postID, replyCommentID, callback) {
        let cb;
        const returnPromise = new Promise((resolve, reject) => {
            cb = (error, info) => info ? resolve(info) : reject(error);
        });

        if (typeof replyCommentID === 'function') {
            callback = replyCommentID;
            replyCommentID = null;
        }
        if (typeof callback === 'function') {
            cb = callback;
        }

        if (typeof msg !== 'string' && typeof msg !== 'object') {
            const error = 'Message must be a string or an object.';
            utils.error('createCommentPost', error);
            return cb(error);
        }
        if (typeof postID !== 'string') {
            const error = 'postID must be a string.';
            utils.error('createCommentPost', error);
            return cb(error);
        }

        let messageObject = typeof msg === 'string' ? { body: msg } : { ...msg };
        messageObject.mentions = messageObject.mentions || [];
        messageObject.attachments = messageObject.attachments || [];
        
        const form = {
            feedLocation: 'NEWSFEED',
            feedbackSource: 1,
            groupID: null,
            input: {
                client_mutation_id: Math.round(Math.random() * 19).toString(),
                actor_id: ctx.userID,
                attachments: [],
                feedback_id: Buffer.from('feedback:' + postID).toString('base64'),
                message: {
                    ranges: [],
                    text: messageObject.body || ''
                },
                reply_comment_parent_fbid: replyCommentID || null,
                is_tracking_encrypted: true,
                tracking: [],
                feedback_source: 'NEWS_FEED',
                idempotence_token: 'client:' + utils.getGUID(),
                session_id: utils.getGUID()
            },
            scale: 1,
            useDefaultActor: false
        };

        try {
            await handleUpload(defaultFuncs, ctx, messageObject, form);
            handleURL(messageObject, form);
            handleMentions(messageObject, form);
            handleSticker(messageObject, form);
            const info = await createContent(defaultFuncs, ctx, form);
            cb(null, info);
        } catch (err) {
            utils.error('createCommentPost', err);
            cb(err);
        }

        return returnPromise;
    };
};
