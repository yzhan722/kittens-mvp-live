import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { clampName, clampStr, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rl = await checkRateLimit(db, `score/submit:${user.uid}`, { limit: 20, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const body = await readJson(req);
  if (!body || typeof body !== "object") return json({ error: "bad json" }, { status: 400, req });

  const uid = user.uid;

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
