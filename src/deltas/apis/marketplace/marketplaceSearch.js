/**
 * marketplaceSearchModule(defaultFuncs, api, ctx) -> (params, cb?) => Promise<{ listings, pageInfo, sessionId }>
 * Search Facebook Marketplace listings via GraphQL.
 *
 * Args:
 *  - params: {
 *      query?: string,
 *      latitude?: number,
 *      longitude?: number,
 *      locationId?: string,
 *      radiusKm?: number,
 *      count?: number,
 *      cursor?: string | null
 *    }
 * Returns: {
 *   listings: Array<{ id, title, price, location, image, deliveryTypes, categoryId, isSold, isLive }>,
 *   pageInfo: { endCursor, hasNextPage },
 *   sessionId: string | null
 * }
 *
 * Example:
 *   const searchMarketplace = marketplaceSearchModule(defaultFuncs, api, ctx);
 *   const result = await searchMarketplace({ query: "bicycle", count: 10 });
 *
 * Author: @tas33n, 27/08/2025
 */

const { ensureTokens, pickPart, postGraphQL } = require('../../../utils/marketplaceUtils');

module.exports = function marketplaceSearchModule(defaultFuncs, api, ctx) {
  return function marketplaceSearch(params, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    const promise = new Promise((resolve, reject) => { resolveFunc = resolve; rejectFunc = reject; });

    if (typeof params === "function") { callback = params; params = {}; }
    params = params || {};
    callback = callback || function (err, data) { if (err) return rejectFunc(err); resolveFunc(data); };

    (async () => {
      try {
        if (typeof api.refreshFb_dtsg === "function") { try { await api.refreshFb_dtsg(); } catch {} }
        ensureTokens(ctx);

        const {
          query = "",
          latitude = 23.8103,   // Dhaka default
          longitude = 90.4125,
          locationId = "101889586519301",
          radiusKm = 25,
          count = 24,
          cursor = null
        } = params;

        const variables = {
          buyLocation: { latitude, longitude },
          contextual_data: null,
          count, cursor,
          params: {
            bqf: { callsite: "COMMERCE_MKTPLACE_WWW", query },
            browse_request_params: {
              commerce_enable_local_pickup: true,
              commerce_enable_shipping: true,
              commerce_search_and_rp_available: true,
              commerce_search_and_rp_category_id: [],
              commerce_search_and_rp_condition: null,
              commerce_search_and_rp_ctime_days: null,
              filter_location_latitude: latitude,
              filter_location_longitude: longitude,
              filter_price_lower_bound: 0,
              filter_price_upper_bound: 214748364700,
              filter_radius_km: radiusKm
            },
            custom_request_params: {
              browse_context: null,
              contextual_filters: [],
              referral_code: null,
              referral_ui_component: null,
              saved_search_strid: null,
              search_vertical: "C2C",
              seo_url: null,
              serp_landing_settings: { virtual_category_id: "" },
              surface: "SEARCH",
              virtual_contextual_filters: []
            }
          },
          savedSearchID: null,
          savedSearchQuery: query,
          scale: 1,
          shouldIncludePopularSearches: false,
          topicPageParams: { location_id: locationId, url: null }
        };

        const DOC_ID = "24146556225043257";
        const payload = await postGraphQL(defaultFuncs, ctx, variables, DOC_ID);
        const selected = pickPart(payload, (p) => p?.data?.marketplace_search?.feed_units);
        const normalized = normalizeSearch(selected);
        return callback(null, normalized);
      } catch (err) {
        return callback(err);
      }
    })();

    return promise;
  };

  function n(x) { return Number.isFinite(+x) ? +x : null; }

  function normalizeSearch(payload) {
    const root = payload?.data?.marketplace_search?.feed_units;
    const edges = root?.edges ?? [];
    const listings = edges.map((e) => e?.node?.listing).filter(Boolean).map((l) => {
      const price = l?.listing_price || {};
      const formatted = price.formatted_amount ?? price.formatted_amount_zeros_stripped ?? price.amount;
      return {
        id: l?.id ?? null,
        title: l?.marketplace_listing_title ?? l?.custom_title ?? null,
        price: { amount: n(price.amount), amountString: price.amount ?? null, formatted: formatted ?? null },
        location: {
          city: l?.location?.reverse_geocode?.city ?? null,
          cityDisplay: l?.location?.reverse_geocode?.city_page?.display_name ?? null
        },
        image: l?.primary_listing_photo?.image?.uri ?? null,
        deliveryTypes: l?.delivery_types ?? [],
        categoryId: l?.marketplace_listing_category_id ?? null,
        isSold: !!l?.is_sold,
        isLive: !!l?.is_live
      };
    });

    const pageInfo = root?.page_info || {};
    return {
      listings,
      pageInfo: { endCursor: pageInfo?.end_cursor ?? null, hasNextPage: !!pageInfo?.has_next_page },
      sessionId: root?.session_id ?? null
    };
  }
};