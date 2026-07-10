import { dbFirst, getDb, handleOptions, json } from "../../_db.js";
import { clampUid } from "../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const url = new URL(req.url);
  const uid = clampUid(url.searchParams.get("uid") || "");
  const friendUid = clampUid(url.searchParams.get("friendUid") || "");
  if (!uid || !friendUid) return json({ error: "uid required" }, { status: 400, req });

  const db = getDb(context.env);
  const user = await dbFirst(db, "SELECT username FROM users WHERE uid = ?", [friendUid]);
  const score = await dbFirst(
    db,
    "SELECT name, dexCount, shinyCount, catchCount, profile_json, topMonsJson FROM scores WHERE uid = ?",
    [friendUid]
  );

  let mons = [];
  let stats = {
    dexCount: Number(score?.dexCount) || 0,
    shinyCount: Number(score?.shinyCount) || 0,
    totalCaught: Number(score?.catchCount) || 0,
  };

  if (score?.profile_json) {
    try {
      const p = JSON.parse(score.profile_json);
      if (Array.isArray(p?.mons)) mons = p.mons;
      if (p?.stats && typeof p.stats === "object") stats = { ...stats, ...p.stats };
    } catch {
    }
  }
  if (!mons.length && score?.topMonsJson) {
    try {
      const t = JSON.parse(score.topMonsJson);
      if (Array.isArray(t)) {
        mons = t.map((m) => ({
          name: m.name || "",
          level: m.level || 1,
          hp: m.hp || 0,
          attack: m.attack || m.power || 0,
          defense: m.defense || 0,
          isShiny: Boolean(m.isShiny),
        }));
      }
    } catch {
    }
  }

  return json(
    {
      user: { name: user?.username || score?.name || friendUid },
      stats,
      mons,
    },
    { req }
  );
}
