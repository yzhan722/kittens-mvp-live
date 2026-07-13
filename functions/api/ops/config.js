import { handleOptions, json } from "../_db.js";

const DEFAULT_CONFIG = {
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

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const env = context.env || {};
  const seasonId = typeof env.OPS_SEASON_ID === "string" && env.OPS_SEASON_ID.trim() ? env.OPS_SEASON_ID.trim().slice(0, 32) : DEFAULT_CONFIG.seasonId;
  const expeditionSeasonLabel =
    typeof env.OPS_SEASON_LABEL === "string" && env.OPS_SEASON_LABEL.trim()
      ? env.OPS_SEASON_LABEL.trim().slice(0, 64)
      : DEFAULT_CONFIG.expeditionSeasonLabel;

  return json(
    {
      ok: true,
      config: {
        ...DEFAULT_CONFIG,
        seasonId,
        expeditionSeasonLabel,
      },
    },
    { req }
  );
}
