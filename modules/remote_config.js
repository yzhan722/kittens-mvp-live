// Remote ops config: static defaults + optional GET /api/ops/config
export const REMOTE_CONFIG_DEFAULTS = {
  seasonId: "s1",
  expeditionSeasonLabel: "第一赛季",
  shopDefaultFold: {
    daily: false,
    exchange: false,
    boost: true,
    permanent: true,
    item: true,
    package: true,
    auto: true,
    craft: true,
  },
  featureFlags: {
    analytics: true,
    dailyTasksApi: true,
  },
};

export function mergeRemoteConfig(partial) {
  const src = partial && typeof partial === "object" ? partial : {};
  const foldSrc = src.shopDefaultFold && typeof src.shopDefaultFold === "object" ? src.shopDefaultFold : {};
  return {
    seasonId: typeof src.seasonId === "string" && src.seasonId.trim() ? src.seasonId.trim().slice(0, 32) : REMOTE_CONFIG_DEFAULTS.seasonId,
    expeditionSeasonLabel:
      typeof src.expeditionSeasonLabel === "string" && src.expeditionSeasonLabel.trim()
        ? src.expeditionSeasonLabel.trim().slice(0, 64)
        : REMOTE_CONFIG_DEFAULTS.expeditionSeasonLabel,
    shopDefaultFold: { ...REMOTE_CONFIG_DEFAULTS.shopDefaultFold, ...foldSrc },
    featureFlags: {
      ...REMOTE_CONFIG_DEFAULTS.featureFlags,
      ...(src.featureFlags && typeof src.featureFlags === "object" ? src.featureFlags : {}),
    },
  };
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function load(baseUrl, { timeoutMs = 3000, fetchFn = fetch } = {}) {
  const base = typeof baseUrl === "string" ? baseUrl.trim() : "";
  if (!base || typeof fetchFn !== "function") return mergeRemoteConfig(null);

  try {
    const res = await withTimeout(
      fetchFn(`${base}/api/ops/config`, { method: "GET", headers: { Accept: "application/json" } }),
      timeoutMs
    );
    if (!res.ok) return mergeRemoteConfig(null);
    const data = await res.json();
    return mergeRemoteConfig(data?.config ?? data);
  } catch {
    return mergeRemoteConfig(null);
  }
}
