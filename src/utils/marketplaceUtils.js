
// helper functions for marketsearch & getmarketplacedetails

function parseNdjsonOrJson(body) {
  if (typeof body !== "string") return body;
  try {
    if (body.includes("\n")) {
      return body
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((x) => JSON.parse(x));
    }
    return JSON.parse(body);
  } catch (e) {
    return body;
  }
}

function pickPart(payload, predicate) {
  if (!Array.isArray(payload)) return payload;
  for (const part of payload) {
    try {
      if (predicate(part)) return part;
    } catch {}
  }
  return payload.find((p) => p && typeof p === "object") || payload[0];
}

function ensureTokens(ctx) {
  if (!ctx || !ctx.fb_dtsg || !ctx.jazoest) {
    const err = new Error(
      "fb_dtsg/jazoest not available; login cookies may be invalid"
    );
    err.code = "NO_FB_DTSG";
    throw err;
  }
}

function getActor(ctx) {
  return (
    (ctx && (ctx.userID || (ctx.globalOptions && ctx.globalOptions.pageID))) ||
    undefined
  );
}

async function postGraphQL(defaultFuncs, ctx, variables, doc_id) {
  const form = {
    fb_dtsg: ctx.fb_dtsg,
    jazoest: ctx.jazoest,
    av: getActor(ctx),
    variables: JSON.stringify(variables),
    doc_id,
  };
  const res = await defaultFuncs.post(
    "https://www.facebook.com/api/graphql/",
    ctx.jar,
    form
  );
  const body = res && res.body ? res.body : "{}";
  return parseNdjsonOrJson(body);
}
module.exports = {
    // marketplace helpers
  parseNdjsonOrJson,
  pickPart,
  ensureTokens,
  getActor,
  postGraphQL,
}