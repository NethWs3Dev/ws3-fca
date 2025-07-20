"use strict";

module.exports = function (defaultFuncs, api, ctx) {
  const utils = require("../../../utils");
// CREATE BY JONELL MAGALLANES 

  // This fonts for texts stories
  const fontMap = {
    headline: "1919119914775364", 
    classic: "516266749248495",
    casual: "516266749248495",
    fancy: "1790435664339626"
  };
// Chooses of Background :>
  const bgMap = {
    orange: "2163607613910521",  
    blue: "401372137331149",
    green: "367314917184744",
    modern: "554617635055752"
  };

  return async function createStories(message, fontName = "classic", backgroundName = "blue") {
    const fontId = fontMap[fontName.toLowerCase()] || fontMap.classic;
    const bgId = bgMap[backgroundName.toLowerCase()] || bgMap.blue;

    const variables = {
      input: {
        audiences: [
          {
            stories: {
              self: {
                target_id: ctx.userID
              }
            }
          }
        ],
        audiences_is_complete: true,
        logging: {
          composer_session_id: "createStoriesText-" + Date.now()
        },
        navigation_data: {
          attribution_id_v2: "StoriesCreateRoot.react,comet.stories.create"
        },
        source: "WWW",
        message: {
          ranges: [],
          text: message
        },
        text_format_metadata: {
          inspirations_custom_font_id: fontId
        },
        text_format_preset_id: bgId,
        tracking: [null],
        actor_id: ctx.userID,
        client_mutation_id: "2"
      }
    };

    const form = {
      av: ctx.userID,
      __user: ctx.userID,
      __a: "1",
      __req: "1n",
      __hs: "20289.HYP:comet_pkg.2.1...0",
      dpr: "2",
      __ccg: "GOOD",
      __rev: "1024944486",
      __s: "random1:random2:random3",
      __hsi: Date.now().toString(),
      __dyn: "7xeUjGU5a5Q1ryaxG4Vp41twWwIxu13wFwhUKbgS3q2ibwNw9G2Saw8i2S1DwUx60GE3Qwb-q7oc81EEc87m221Fwgo9oO0-E4a3a4oaEnxO0Bo7O2l2Utwqo31wiE4u9x-3m1mzXw8W58jwGzEaE5e3ym2SU4i5oe8464-5pUfEdbwxwjFovUaU3VwLyEbUGdG0HE88cA0z8c84q58jyUaUbGxe6Uak0zU8oC1hxB0qo4e4UO2m3G1eKufxamEbbxG1fBG2-2K0E8461wweW2K3aEy6E",
      __csr: "gbs7k8Pgzv5MgMDsjsAj9s8nblPRsIL48Tscn5OsSySIF5mzhz6WRnN19fHFrsOSQyfCRSjGAgHn9CQJd5DH-BtHQ8mQgF99oBbBGGAXCzWSFprAXAHAUy9oF4FRGFerGWV9dzoHiQ26iECByppay4TGayVGCgjz9UO9GGgpJG5kFbzFGjGm9LK8yoJrxOUhFbxWum7EW8U4i4qUOJ1S4VoG58gVqyF989bBCG8K2226mdhppEjCK7qyoG8zoN3VZ3UG3a4Ey2q9x-5XwHxe6ayEKE9HwEAy8Z2pZ91K8BG3LxLwMxu9G7EuxOfwDxucyUgyUjAwAwnEaXwAwMyUbEyqm2WUaEbEhwrE9Q261nwgXwTzo2iwa62x08i0jWE5Gh4gmg3DwKwZK0CEZ6who62265Rw8C6ohg7iE57wFglwfK2a1Ygnwk43e3tAAG19yGx0Fbdxq4U3gxe3W9xK0j201iZw1CmU6i03h-0mjU024tw0Z8wsOa58620iV2y0so720JErg52E14A4o0Hi0BpoW0ia02lVw0gTEb3wdW1gwcrwXy8C0pN1G0fvw45wnUnxO04DQ06xP09y02ol03oE0Hqtk0oN0yw5Qw1rilw16R05nwde0Co1dm3-",
      __hblp: "some_value",
      fb_dtsg: ctx.fb_dtsg,
      jazoest: ctx.jazoest,
      lsd: ctx.lsd,
      __spin_r: "1024944486",
      __spin_b: "trunk",
      __spin_t: Math.floor(Date.now() / 1000).toString(),
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "StoriesCreateMutation",
      doc_id: "24226878183562473",
      variables: JSON.stringify(variables)
    };

    try {
      const res = await utils.post("https://www.facebook.com/api/graphql/", ctx.jar, form, ctx);
      return {
        success: true,
        status: res.statusCode || 200,
        return: "Successfully Myday posted"
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.body || error.message
      };
    }
  };
};
