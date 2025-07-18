"use strict";
// @ChoruOfficial
const utils = require('../../../utils');
const _ = require('lodash');
const deepdash = require('deepdash');
deepdash(_);

/**
 * @param {object} data
 * @param {string} userID
 * @returns {object|null}
 */
function findMainUserObject(data, userID) {
  let mainUserObject = null;
  if (!Array.isArray(data)) return null;
  function deepFind(obj) {
    if (mainUserObject || typeof obj !== 'object' || obj === null) return;
    if (obj.id === userID && obj.__typename === 'User' && obj.profile_tabs) {
      mainUserObject = obj;
      return;
    }
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        deepFind(obj[k]);
      }
    }
  }
  deepFind({ all: data });
  return mainUserObject;
}

/**
 * @param {object} socialContext
 * @param {string} keyword
 * @returns {string|null}
 */
function findSocialContextText(socialContext, keyword) {
  if (socialContext && Array.isArray(socialContext.content)) {
    for (const item of socialContext.content) {
      const text = item?.text?.text;
      if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
        return text;
      }
    }
  }
  return null;
}

/**
 * @param {Array<Object>} dataArray
 * @param {string} key
 * @returns {any}
 */
function findFirstValueByKey(dataArray, key) {
  if (!Array.isArray(dataArray)) return null;
  let found = null;
  function deepSearch(obj) {
    if (found !== null || typeof obj !== 'object' || obj === null) return;
    if (obj.hasOwnProperty(key)) {
      found = obj[key];
      return;
    }
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        deepSearch(obj[k]);
      }
    }
  }
  for (const obj of dataArray) {
    deepSearch(obj);
  }
  return found;
}

/**
 * @param {Array<Object>} allJsonData
 * @returns {string|null}
 */
function findBioFromProfileTiles(allJsonData) {
  try {
    const bio = findFirstValueByKey(allJsonData, 'profile_status_text');
    return bio?.text || null;
  } catch {
    return null;
  }
}

/**
 * @param {Array<Object>} allJsonData
 * @returns {string|null}
 */
function findLiveCityFromProfileTiles(allJsonData) {
  try {
    const result = _.findDeep(allJsonData, (value, key, parent) => {
      return key === 'text' &&
        typeof value === 'string' &&
        value.includes('Lives in') &&
        parent?.ranges?.[0]?.entity?.category_type === "CITY_WITH_ID";
    });

    if (result) {
      return result.value;
    }

    return null;
  } catch (err) {
    return null;
  }
}

module.exports = (defaultFuncs, api, ctx) => {
  function createDefaultUser(id) {
    return {
      id,
      name: "Facebook User",
      firstName: "Facebook",
      lastName: null,
      vanity: id,
      profilePicUrl: `https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
      profileUrl: `https://www.facebook.com/profile.php?id=${id}`,
      gender: "no specific gender",
      type: "user",
      isFriend: false,
      isBirthday: false
    };
  }

  return function getUserInfo(id, usePayload, callback, groupFields = []) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (typeof usePayload === 'function') {
      callback = usePayload;
      usePayload = true;
    }
    if (usePayload === undefined) usePayload = true;
    if (!callback) {
      callback = (err, data) => {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    const originalIdIsArray = Array.isArray(id);
    const ids = originalIdIsArray ? id : [id];

    if (usePayload) {
      const form = {};
      ids.forEach((v, i) => { form[`ids[${i}]`] = v; });
      const getGenderString = (code) => code === 1 ? "male" : code === 2 ? "female" : "no specific gender";
      defaultFuncs.post("https://www.facebook.com/chat/user_info/", ctx.jar, form)
        .then(resData => utils.parseAndCheckLogin(ctx, defaultFuncs)(resData))
        .then(resData => {
          if (resData?.error && resData?.error !== 3252001) throw resData;
          const retObj = {};
          const profiles = resData?.payload?.profiles;
          if (profiles) {
            for (const prop in profiles) {
              if (profiles.hasOwnProperty(prop)) {
                const inner = profiles[prop];
                const nameParts = inner.name ? inner.name.split(' ') : [];
                retObj[prop] = {
                  id: prop,
                  name: inner.name,
                  firstName: inner.firstName,
                  lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
                  vanity: inner.vanity,
                  profilePicUrl: `https://graph.facebook.com/${prop}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                  profileUrl: inner.uri,
                  gender: getGenderString(inner.gender),
                  type: inner.type,
                  isFriend: inner.is_friend,
                  isBirthday: !!inner.is_birthday,
                  searchTokens: inner.searchTokens,
                  alternateName: inner.alternateName
                };
              }
            }
          } else {
            for (const prop of ids) {
              retObj[prop] = createDefaultUser(prop);
            }
          }
          return originalIdIsArray ? callback(null, Object.values(retObj)) : callback(null, retObj[ids[0]]);
        }).catch(err => {
          utils.error("getUserInfo (payload)", err);
          return callback(err);
        });
    } else {
      const fetchProfile = async (userID) => {
        try {
          const url = `https://www.facebook.com/${userID}`;
          const allJsonData = await utils.json(url, ctx.jar, null, ctx.globalOptions, ctx);
          if (!allJsonData || allJsonData.length === 0) throw new Error(`Could not find JSON data for ID: ${userID}`);
          const mainUserObject = findMainUserObject(allJsonData, userID);
          if (!mainUserObject) throw new Error(`Could not isolate main user object for ID: ${userID}`);
          const get = (obj, path) => {
            if (!obj || !path) return null;
            return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
          };
          const name = mainUserObject.name;
          const nameParts = name ? name.split(' ') : [];
          const result = {
            id: mainUserObject.id,
            name: name,
            firstName: nameParts[0] || get(mainUserObject, 'short_name') || get(findFirstValueByKey(allJsonData, 'profile_owner'), 'short_name'),
            lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
            vanity: get(mainUserObject, 'vanity') || get(findFirstValueByKey(allJsonData, 'props'), 'userVanity') || null,
            profileUrl: mainUserObject.url,
            profilePicUrl: `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
            gender: mainUserObject.gender,
            type: mainUserObject.__typename,
            isFriend: mainUserObject.is_viewer_friend,
            isBirthday: !!mainUserObject.is_birthday,
            isVerified: !!mainUserObject.show_verified_badge_on_profile,
            bio: findBioFromProfileTiles(allJsonData) || get(findFirstValueByKey(allJsonData, 'delegate_page'), 'best_description.text'),
            live_city: findLiveCityFromProfileTiles(allJsonData),
            headline: get(mainUserObject, 'contextual_headline.text') || get(findFirstValueByKey(allJsonData, 'meta_verified_section'), 'headline'),
            followers: findSocialContextText(mainUserObject.profile_social_context, "followers"),
            following: findSocialContextText(mainUserObject.profile_social_context, "following"),
            coverPhoto: get(mainUserObject, 'cover_photo.photo.image.uri')
          };
          return result;
        } catch (err) {
          utils.error(`Failed to fetch profile for ${userID}: ${err.message}`, err);
          return createDefaultUser(userID);
        }
      };

      Promise.all(ids.map(fetchProfile))
        .then(results => {
          return originalIdIsArray ? callback(null, results) : callback(null, results[0] || null);
        })
        .catch(err => {
          utils.error("getUserInfo (fetch)", err);
          callback(err);
        });
    }
    return returnPromise;
  };
};
