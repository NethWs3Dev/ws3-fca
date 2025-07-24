"use strict";

/**
 * Sticker API Module
 * Provides access to Facebook's GraphQL-based sticker endpoints.
 * Made by @ChoruOfficial
 */

const utils = require('../../../utils');
/**
 * Format the sticker pack list (store or tray)
 * @param {object} data - Raw GraphQL response
 * @returns {{ packs: Array<{id: string, name: string, thumbnail: string}>, page_info: object, store_id?: string }}
 */
function formatPackList(data) {
    const trayPacks = data?.data?.picker_plugins?.sticker_picker?.sticker_store?.tray_packs?.edges;
    const storePacks = data?.data?.viewer?.sticker_store?.available_packs?.edges;
    
    const packData = storePacks || trayPacks;
    if (!packData || !packData.edges) return { packs: [], page_info: { has_next_page: false } };

    const formattedPacks = packData.edges.map(edge => edge.node ? ({
        id: edge.node.id,
        name: edge.node.name,
        thumbnail: edge.node.thumbnail_image?.uri
    }) : null).filter(Boolean);

    return {
        packs: formattedPacks,
        page_info: packData.page_info,
        store_id: data?.data?.viewer?.sticker_store?.id
    };
}

/**
 * Format search result stickers
 * @param {object} data - Raw GraphQL response
 * @returns {Array<Object>}
 */
function formatStickerSearchResults(data) {
    const stickers = data?.data?.sticker_search?.sticker_results?.edges;
    if (!stickers) return [];
    return stickers.map(edge => edge.node ? ({
        type: "sticker",
        ID: edge.node.id,
        url: edge.node.image?.uri,
        animatedUrl: edge.node.animated_image?.uri,
        packID: edge.node.pack?.id,
        label: edge.node.label || edge.node.accessibility_label,
        stickerID: edge.node.id
    }) : null).filter(Boolean);
}

/**
 * Format sticker pack content
 * @param {object} data - Raw GraphQL response
 * @returns {Array<Object>}
 */
function formatStickerPackResults(data) {
    const stickers = data?.data?.sticker_pack?.stickers?.edges;
    if (!stickers) return [];
    return stickers.map(edge => edge.node ? ({
        type: "sticker",
        ID: edge.node.id,
        url: edge.node.image?.uri,
        animatedUrl: edge.node.animated_image?.uri,
        packID: edge.node.pack?.id,
        label: edge.node.label || edge.node.accessibility_label,
        stickerID: edge.node.id
    }) : null).filter(Boolean);
}

/**
 * Format AI-generated stickers
 * @param {object} data - Raw GraphQL response
 * @returns {Array<Object>}
 */
function formatAiStickers(data) {
    const stickers = data?.data?.xfb_trending_generated_ai_stickers?.nodes;
    if (!stickers) return [];
    return stickers.map(node => ({
        type: "sticker",
        ID: node.id,
        url: node.url,
        label: node.label,
        stickerID: node.id
    })).filter(Boolean);
}

module.exports = function(defaultFuncs, api, ctx) {
    /**
     * Make a GraphQL request and handle login and error checking
     * @param {object} form - Form data for the request
     * @returns {Promise<object>}
     */
    async function makeRequest(form) {
        const resData = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs));
        if (!resData) throw new Error("GraphQL request returned no data.");
        if (resData.errors) {
            utils.error("StickerAPI GraphQL Error", resData.errors[0].message);
            throw resData.errors[0];
        }
        return resData;
    }

    return {
        /**
         * Search for stickers by keyword
         * @param {string} query - Search term
         * @returns {Promise<Array<Object>>}
         */
        search: async function(query) {
            const form = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickerPickerSearchResultsRootQuery',
                variables: JSON.stringify({
                    scale: 3,
                    search_query: query,
                    sticker_height: 128,
                    sticker_width: 128,
                    stickerInterface: "MESSAGES"
                }),
                doc_id: '24004987559125954'
            };
            const res = await makeRequest(form);
            return formatStickerSearchResults(res);
        },

        /**
         * List user's sticker packs
         * @returns {Promise<Array<Object>>}
         */
        listPacks: async function() {
            const form = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickerPickerCardQuery',
                variables: JSON.stringify({ scale: 3, stickerInterface: "MESSAGES" }),
                doc_id: '10095807770482952'
            };
            const res = await makeRequest(form);
            return formatPackList(res).packs;
        },

        /**
         * Get all available sticker packs from the store (with pagination)
         * @returns {Promise<Array<Object>>}
         */
        getStorePacks: async function() {
            utils.log("Starting to fetch all sticker packs from store...");
            let allPacks = [];

            const initialForm = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickersStoreDialogQuery',
                variables: JSON.stringify({}),
                doc_id: '29237828849196584'
            };
            let res = await makeRequest(initialForm);
            let { packs, page_info, store_id } = formatPackList(res);
            allPacks.push(...packs);
            utils.log(`Fetched first page with ${packs.length} packs.`);

            while (page_info && page_info.has_next_page) {
                utils.log("Fetching next page with cursor:", page_info.end_cursor);

                const paginatedForm = {
                    fb_api_caller_class: 'RelayModern',
                    fb_api_req_friendly_name: 'CometStickersStorePackListPaginationQuery',
                    variables: JSON.stringify({
                        count: 20,
                        cursor: page_info.end_cursor,
                        id: store_id
                    }),
                    doc_id: '9898634630218439'
                };
                res = await makeRequest(paginatedForm);
                let paginatedResult = formatPackList(res);
                allPacks.push(...paginatedResult.packs);
                page_info = paginatedResult.page_info;
                utils.log(`Fetched ${paginatedResult.packs.length} more packs. Total now: ${allPacks.length}`);
            }

            utils.log(`Finished fetching. Total unique packs found: ${allPacks.length}`);
            return allPacks;
        },

        /**
         * Merge user's and store sticker packs into one list
         * @returns {Promise<Array<Object>>}
         */
        listAllPacks: async function() {
            const [myPacks, storePacks] = await Promise.all([
                this.listPacks(),
                this.getStorePacks()
            ]);
            const allPacksMap = new Map();
            myPacks.forEach(pack => allPacksMap.set(pack.id, pack));
            storePacks.forEach(pack => allPacksMap.set(pack.id, pack));
            return Array.from(allPacksMap.values());
        },

        /**
         * Add a sticker pack by ID
         * @param {string} packID - The ID of the sticker pack
         * @returns {Promise<Object>}
         */
        addPack: async function(packID) {
            const form = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickersStorePackMutationAddMutation',
                variables: JSON.stringify({
                    input: {
                        pack_id: packID,
                        actor_id: ctx.userID,
                        client_mutation_id: Math.round(Math.random() * 10).toString()
                    }
                }),
                doc_id: '9877489362345320'
            };
            const res = await makeRequest(form);
            return res.data.sticker_pack_add.sticker_pack;
        },

        /**
         * Get all stickers in a pack
         * @param {string} packID - Sticker pack ID
         * @returns {Promise<Array<Object>>}
         */
        getStickersInPack: async function(packID) {
            const form = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickerPickerPackContentRootQuery',
                variables: JSON.stringify({ packID, stickerWidth: 128, stickerHeight: 128, scale: 3 }),
                doc_id: '23982341384707469'
            };
            const res = await makeRequest(form);
            return formatStickerPackResults(res);
        },

        /**
         * Get trending AI-generated stickers
         * @param {{ limit?: number }} options - Options object
         * @returns {Promise<Array<Object>>}
         */
        getAiStickers: async function({ limit = 10 } = {}) {
            const form = {
                fb_api_caller_class: 'RelayModern',
                fb_api_req_friendly_name: 'CometStickerPickerStickerGeneratedCardQuery',
                variables: JSON.stringify({ limit }),
                doc_id: '24151467751156443'
            };
            const res = await makeRequest(form);
            return formatAiStickers(res);
        }
    };
};
