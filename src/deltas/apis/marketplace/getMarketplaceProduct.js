/**
 * getMarketplaceProduct(defaultFuncs, api, ctx) -> (listingId, cb?) => Promise<Product>
 * Fetch a Marketplace product by ID with full details and all images in one response.
 *
 * Args:
 *  - listingId : string (required)
 * Returns Product: { id, title, description, price, status, location, delivery, attributes, category, shareUrl, createdAt, images }
 *
 * Example:
 *   const getProduct = getMarketplaceProduct(defaultFuncs, api, ctx);
 *   const product = await getProduct("1234567890123456");
 *
 * Author: @tas33n, 27/08/2025
 */


const { ensureTokens, pickPart, postGraphQL, parseNdjsonOrJson } = require('../../../utils/marketplaceUtils');

module.exports = function getMarketplaceProductModule(defaultFuncs, api, ctx) {
  return function getMarketplaceProduct(targetId, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const promise = new Promise((resolve, reject) => { resolveFunc = resolve; rejectFunc = reject; });

    if (typeof targetId === "function") { callback = targetId; targetId = null; }
    callback = callback || function (err, data) { if (err) return rejectFunc(err); resolveFunc(data); };

    (async () => {
      try {
        if (!targetId) throw new Error("targetId is required");
        if (typeof api.refreshFb_dtsg === "function") { try { await api.refreshFb_dtsg(); } catch {} }
        ensureTokens(ctx);

        // 1) Details
        const detailsVars = {
          feedbackSource: 56,
          feedLocation: "MARKETPLACE_MEGAMALL",
          referralCode: "null",
          scale: 1,
          targetId,
          useDefaultActor: false,
          __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
          __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
          __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: true,
          __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: false,
          __relay_internal__pv__IsWorkUserrelayprovider: false,
          __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
          __relay_internal__pv__MarketplacePDPRedesignrelayprovider: false
        };
        const DOC_ID_DETAILS = "24056064890761782";
        const detailsPayload = await postGraphQL(defaultFuncs, ctx, detailsVars, DOC_ID_DETAILS);
        const detailsSelected = pickPart(detailsPayload, (p) => p?.data?.viewer?.marketplace_product_details_page);
        const base = normalizeDetails(detailsSelected);

        // 2) Images
        const DOC_ID_IMAGES = "10059604367394414";
        const imgForm = {
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          av: ctx.userID || (ctx.globalOptions && ctx.globalOptions.pageID),
          variables: JSON.stringify({ targetId }),
          doc_id: DOC_ID_IMAGES
        };
        const imgRes = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, imgForm);
        const imgJson = parseNdjsonOrJson(imgRes && imgRes.body ? imgRes.body : "{}");
        const imgSelected = Array.isArray(imgJson)
          ? imgJson.find((p) => p?.data?.viewer?.marketplace_product_details_page) || imgJson[0]
          : imgJson;
        base.images = normalizeImages(imgSelected);

        return callback(null, base);
      } catch (err) {
        return callback(err);
      }
    })();

    return promise;
  };

  function n(x) { return Number.isFinite(+x) ? +x : null; }

  function normalizeDetails(payload) {
    const page = payload?.data?.viewer?.marketplace_product_details_page;
    const item = page?.target || page?.marketplace_listing_renderable_target || null;
    const price = item?.listing_price || {};
    const coords = item?.location || item?.item_location || null;

    return {
      id: item?.id ?? null,
      title: item?.marketplace_listing_title ?? item?.base_marketplace_listing_title ?? null,
      description: item?.redacted_description?.text ?? null,
      price: {
        amount: n(price.amount),
        amountString: price.amount ?? null,
        formatted: price.formatted_amount_zeros_stripped ?? price.formatted_amount ?? null,
        currency: price.currency ?? null,
        strikethrough:
          item?.strikethrough_price?.formattedAmountWithoutDecimals ??
          item?.strikethrough_price?.formatted_amount ??
          null
      },
      status: {
        isLive: !!item?.is_live,
        isPending: !!item?.is_pending,
        isSold: !!item?.is_sold
      },
      location: {
        text: item?.location_text?.text ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        locationId: item?.location_vanity_or_id ?? null
      },
      delivery: {
        types: item?.delivery_types ?? [],
        shippingOffered: !!item?.is_shipping_offered,
        buyNowEnabled: !!item?.is_buy_now_enabled
      },
      attributes: Array.isArray(item?.attribute_data)
        ? item.attribute_data.map((a) => ({ name: a?.attribute_name ?? null, value: a?.value ?? null, label: a?.label ?? null }))
        : [],
      category: {
        id: item?.marketplace_listing_category_id ?? null,
        slug: item?.marketplaceListingRenderableIfLoggedOut?.marketplace_listing_category?.slug ?? null,
        name: item?.marketplaceListingRenderableIfLoggedOut?.marketplace_listing_category_name ?? null,
        seo: (() => {
          const catSeo = item?.marketplaceListingRenderableIfLoggedOut?.seo_virtual_category?.taxonomy_path?.[0];
          return {
            categoryId: catSeo?.id ?? null,
            seoUrl: catSeo?.seo_info?.seo_url ?? null,
            name: catSeo?.name ?? null
          };
        })()
      },
      shareUrl: item?.share_uri ?? null,
      createdAt: item?.creation_time ? new Date(item.creation_time * 1000).toISOString() : null,
      images: []
    };
  }

  function normalizeImages(selected) {
    const page = selected?.data?.viewer?.marketplace_product_details_page;
    const target = page?.target || page?.marketplace_listing_renderable_target || {};
    const photos = Array.isArray(target?.listing_photos) ? target.listing_photos : [];

    const fromPhotos = photos
      .map((p) => ({
        id: p?.id ?? null,
        url: p?.image?.uri ?? null,
        width: p?.image?.width ?? null,
        height: p?.image?.height ?? null,
        alt: p?.accessibility_caption ?? null
      }))
      .filter((img) => !!img.url);

    const fromPrefetch = Array.isArray(selected?.extensions?.prefetch_uris)
      ? selected.extensions.prefetch_uris.map((u) => ({ id: null, url: u, width: null, height: null, alt: null }))
      : [];

    const seen = new Set();
    return [...fromPhotos, ...fromPrefetch].filter((img) => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });
  }
};
