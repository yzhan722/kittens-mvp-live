import { dbAll, getDb, handleOptions, json } from "../_db.js";
import { intOr } from "../_uid.js";

const BOARD_COL = {
  dex: "dexCount",
  power: "power",
  contrib: "power",
  hatch: "hatchCount",
  shiny: "shinyCount",
  total_power: "totalPower",
  gather: "gatherClicks",
  resource: "resourceProduced",
  catch: "catchCount",
};

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const board = context.params?.board;
  const col = BOARD_COL[board];
  if (!col) return json({ error: "unknown board" }, { status: 404, req });

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, intOr(url.searchParams.get("limit"), 100)));

  const db = getDb(context.env);
  const rows = await dbAll(
    db,
    `SELECT uid, name, ${col} AS score, topMonsJson, avatarDataUrl
     FROM scores
     ORDER BY ${col} DESC, updatedAt DESC
     LIMIT ?`,
    [limit]
  );

  const items = rows.map((r, i) => {
    let topMons = [];
    if (board === "power" && r.topMonsJson) {
      try {
        const parsed = JSON.parse(r.topMonsJson);
        if (Array.isArray(parsed)) topMons = parsed;
      } catch {
      }
    }
    return {
      rank: i + 1,
      score: Number(r.score) || 0,
      attrs: {
        ownerName: r.name || "",
        avatarDataUrl: r.avatarDataUrl || "",
        ...(board === "power" ? { topMons } : {}),
      },
    };
  });

  return json({ items }, { req });
}
