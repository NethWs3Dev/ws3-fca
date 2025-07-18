"use strict";

const utils = require('../../../utils');

function formatPreviewResult(data) {
    if (data.errors) {
        throw data.errors[0];
    }
    const previewData = data.data?.xma_preview_data;
    if (!previewData) {
        throw { error: "Could not generate a preview for this post." };
    }
    return {
        postID: previewData.post_id,
        header: previewData.header_title,
        subtitle: previewData.subtitle_text,
        title: previewData.title_text,
        previewImage: previewData.preview_url,
        favicon: previewData.favicon_url,
        headerImage: previewData.header_image_url
    };
}

module.exports = function(defaultFuncs, api, ctx) {
    return async function getPostPreview(postID, callback) {
        let cb;
        const returnPromise = new Promise((resolve, reject) => {
            cb = (err, data) => err ? reject(err) : resolve(data);
        });
        
        if (typeof callback === 'function') cb = callback;
        if (!postID) {
            return cb({ error: "A postID is required to generate a preview." });
        }

        const variables = {
            shareable_id: postID.toString(),
            scale: 3,
        };

        const form = {
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: 'CometXMAProxyShareablePreviewQuery',
            variables: JSON.stringify(variables),
            doc_id: '28939050904374351'
        };

        try {
            const resData = await defaultFuncs
                .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
            
            const result = formatPreviewResult(resData);
            return cb(null, result);
        } catch (err) {
            utils.error("getPostPreview", err);
            return cb(err);
        }

        return returnPromise;
    };
};
