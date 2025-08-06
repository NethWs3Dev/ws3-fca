"use strict";

const utils = require('../../../utils');

/**
 * @ChoruOfficial
 * @description A module for managing friend-related actions like listing friends, handling requests, and getting suggestions.
 * @param {Object} defaultFuncs The default functions provided by the API wrapper.
 * @param {Object} api The full API object.
 * @param {Object} ctx The context object containing the user's session state (e.g., userID, jar, fb_dtsg).
 * @returns {Object} A `friendModule` object with methods for friend interactions.
 */
module.exports = function (defaultFuncs, api, ctx) {

  /**
   * A private helper function to standardize friend data from various GraphQL endpoints.
   * @private
   * @param {Object} data The raw data object from a GraphQL response.
   * @param {('requests'|'suggestions'|'list')} type The type of data to format, which determines the path to the user list.
   * @returns {Array<Object>} An array of formatted friend objects, each containing `userID`, `name`, `profilePicture`, `socialContext`, and `url`.
   */
  function formatFriends(data, type) {
    const viewer = data?.data?.viewer;
    let edges;
    if (type === 'requests' && viewer?.friend_requests?.edges) {
        edges = viewer.friend_requests.edges;
    } else if (type === 'suggestions' && viewer?.people_you_may_know?.edges) {
        edges = viewer.people_you_may_know.edges;
    } else if (type === 'list' && data?.data?.node?.all_collections?.nodes[0]?.style_renderer?.collection?.pageItems?.edges) {
        edges = data.data.node.all_collections.nodes[0].style_renderer.collection.pageItems.edges;
    } else {
        return [];
    }
    return edges.map(edge => {
        const node = edge.node;
        return {
            userID: node.id || node.node?.id,
            name: node.name || node.title?.text,
            profilePicture: node.profile_picture?.uri || node.image?.uri,
            socialContext: node.social_context?.text || node.subtitle_text?.text,
            url: node.url
        };
    });
  }

  const friendModule = {
    /**
     * @namespace api.friend
     * @description A collection of functions for interacting with friends.
     * @license Ex-it
     * @author ChoruOfficial
     */

    /**
     * Fetches the list of incoming friend requests.
     * @async
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of friend request objects.
     * @throws {Error} If the API request fails or returns an error.
     */
    requests: async function() {
      try {
        const form = {
          av: ctx.userID,
          __user: ctx.userID,
          __a: "1",
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          lsd: ctx.lsd,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "FriendingCometRootContentQuery",
          variables: JSON.stringify({ scale: 3 }),
          doc_id: "9103543533085580"
        };
        const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form, {});
        if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
        return formatFriends(res.data, 'requests');
      } catch (err) {
        throw err;
      }
    },

    /**
     * Accepts a friend request.
     * @async
     * @param {string} identifier The user ID or name of the person whose friend request is to be accepted. If a name is provided, the function will search through pending requests.
     * @returns {Promise<Object>} A promise that resolves to the API response data upon successful acceptance.
     * @throws {Error} If the identifier is missing, the user is not found in requests, or the API call fails.
     */
    accept: async function(identifier) {
      try {
          if (!identifier) throw new Error("A name or user ID is required.");
          let targetUserID = identifier;
          if (isNaN(identifier)) {
              const requests = await friendModule.requests();
              const found = requests.find(req => req.name.toLowerCase().includes(identifier.toLowerCase()));
              if (!found) throw new Error(`Could not find any friend request matching "${identifier}".`);
              targetUserID = found.userID;
          }
          const variables = {
              input: {
                  friend_requester_id: targetUserID,
                  friending_channel: "FRIENDS_HOME_MAIN",
                  actor_id: ctx.userID,
                  client_mutation_id: Math.floor(Math.random() * 10 + 1).toString()
              },
              scale: 3
          };
          const form = {
              av: ctx.userID,
              __user: ctx.userID,
              __a: "1",
              fb_dtsg: ctx.fb_dtsg,
              jazoest: ctx.jazoest,
              lsd: ctx.lsd,
              fb_api_caller_class: "RelayModern",
              fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
              variables: JSON.stringify(variables),
              doc_id: "24630768433181357"
          };
          const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form, {});
          if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
          return res.data.data;
      } catch (err) {
          if (err.message?.includes("1431004")) {
              throw new Error("I cannot accept this friend request right now. There might be a problem with the account or you need to wait.");
          }
          throw err;
      }
    },

    /**
     * Fetches the friend list for a given user ID.
     * @async
     * @param {string} [userID=ctx.userID] The ID of the user whose friend list to fetch. Defaults to the logged-in user.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of formatted friend objects.
     * @throws {Error} If the API request fails.
     */
    list: async function(userID = ctx.userID) {
        try {
            const sectionToken = Buffer.from(`app_section:${userID}:2356318349`).toString('base64');
            const variables = {
                collectionToken: null,
                scale: 2,
                sectionToken: sectionToken,
                useDefaultActor: false,
                userID: userID
            };
            const form = {
                av: ctx.userID,
                __user: ctx.userID,
                __a: "1",
                fb_dtsg: ctx.fb_dtsg,
                jazoest: ctx.jazoest,
                lsd: ctx.lsd,
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "ProfileCometTopAppSectionQuery",
                variables: JSON.stringify(variables),
                doc_id: "24492266383698794"
            };
            const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form, {});
            if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
            return formatFriends(res.data, 'list');
        } catch(err) {
            throw err;
        }
    },

    /**
     * @namespace api.friend.suggest
     * @description Functions for managing friend suggestions.
     */
    suggest: {
        /**
         * Fetches a list of suggested friends (People You May Know).
         * @async
         * @param {number} [limit=30] The maximum number of suggestions to fetch.
         * @returns {Promise<Array<Object>>} A promise that resolves to an array of suggested friend objects.
         * @throws {Error} If the API request fails.
         */
        list: async function(limit = 30) {
          try {
              const form = {
                  av: ctx.userID,
                  __user: ctx.userID,
                  __a: "1",
                  fb_dtsg: ctx.fb_dtsg,
                  jazoest: ctx.jazoest,
                  lsd: ctx.lsd,
                  fb_api_caller_class: "RelayModern",
                  fb_api_req_friendly_name: "FriendingCometPYMKPanelPaginationQuery",
                  variables: JSON.stringify({ count: limit, cursor: null, scale: 3 }),
                  doc_id: "9917809191634193"
              };
              const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form, {});
              if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
              return formatFriends(res.data, 'suggestions');
          } catch(err) {
              throw err;
          }
        },
        /**
         * Sends a friend request to a user.
         * @async
         * @param {string} userID The ID of the user to send the friend request to.
         * @returns {Promise<Object>} A promise that resolves to the API response data on success.
         * @throws {Error} If the userID is missing or the API request fails.
         */
        request: async function(userID) {
            try {
                if (!userID) throw new Error("userID is required.");
                const variables = {
                    input: {
                        friend_requestee_ids: [userID],
                        friending_channel: "FRIENDS_HOME_MAIN",
                        actor_id: ctx.userID,
                        client_mutation_id: Math.floor(Math.random() * 10 + 1).toString()
                    },
                    scale: 3
                };
                const form = {
                    av: ctx.userID,
                    __user: ctx.userID,
                    __a: "1",
                    fb_dtsg: ctx.fb_dtsg,
                    jazoest: ctx.jazoest,
                    lsd: ctx.lsd,
                    fb_api_caller_class: "RelayModern",
                    fb_api_req_friendly_name: "FriendingCometFriendRequestSendMutation",
                    variables: JSON.stringify(variables),
                    doc_id: "23982103144788355"
                };
                const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form, {});
                if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
                return res.data.data;
            } catch(err) {
                throw err;
            }
        }
    }
  };
  
  return friendModule;
};
