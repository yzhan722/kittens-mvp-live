import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampName, clampStr, clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  if (!body || typeof body !== "object") return json({ error: "bad json" }, { status: 400, req });

  const uid = clampUid(body.uid);
  if (!uid) return json({ error: "uid required" }, { status: 400, req });

  const name = clampName(body.name);
  const dexCount = Math.max(0, intOr(body.dexCount, 0));
  const power = Math.max(0, intOr(body.power, 0));
  const totalPower = Math.max(0, intOr(body.totalPower, 0));
  const hatchCount = Math.max(0, intOr(body.hatchCount, 0));
  const shinyCount = Math.max(0, intOr(body.shinyCount, 0));
  const gatherClicks = Math.max(0, intOr(body.gatherClicks, 0));
  const resourceProduced = Math.max(0, intOr(body.resourceProduced, 0));
  const catchCount = Math.max(0, intOr(body.catchCount, 0));
  const gameVersion = clampStr(body.gameVersion, 32);
  const topMons = Array.isArray(body.topMons) ? body.topMons.slice(0, 6) : [];
  const topMonsJson = JSON.stringify(topMons);
  let avatarDataUrl = typeof body.avatar === "string" ? body.avatar : "";
  if (avatarDataUrl.length > 200000) avatarDataUrl = "";

  const profile_json = JSON.stringify({
    mons: topMons,
    stats: { dexCount, shinyCount, totalCaught: catchCount },
  });

  const db = getDb(context.env);
  const updatedAt = nowMs();
  await dbRun(
    db,
    `INSERT INTO scores(
      uid, name, dexCount, power, totalPower, hatchCount, shinyCount,
      gatherClicks, resourceProduced, catchCount, updatedAt, gameVersion, topMonsJson, avatarDataUrl, profile_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(uid) DO UPDATE SET
      name=excluded.name, dexCount=excluded.dexCount, power=excluded.power, totalPower=excluded.totalPower,
      hatchCount=excluded.hatchCount, shinyCount=excluded.shinyCount, gatherClicks=excluded.gatherClicks,
      resourceProduced=excluded.resourceProduced, catchCount=excluded.catchCount, updatedAt=excluded.updatedAt,
      gameVersion=excluded.gameVersion, topMonsJson=excluded.topMonsJson, avatarDataUrl=excluded.avatarDataUrl,
      profile_json=excluded.profile_json`,
    [
      uid,
      name,
      dexCount,
      power,
      totalPower,
      hatchCount,
      shinyCount,
      gatherClicks,
      resourceProduced,
      catchCount,
      updatedAt,
      gameVersion,
      topMonsJson,
      avatarDataUrl || null,
      profile_json,
    ]
  );

  return json({ ok: true }, { req });
}
