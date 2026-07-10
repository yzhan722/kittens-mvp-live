import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { intOr } from "../_uid.js";

const MAX_SAVE_BYTES = 512 * 1024;

function parseSlot(url) {
  const slot = intOr(new URL(url).searchParams.get("slot"), -1);
  if (slot < 0 || slot > 3) return null;
  return slot;
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const slot = parseSlot(req.url);
  if (slot === null) return json({ error: "invalid slot" }, { status: 400, req });

  if (req.method === "GET") {
    const row = await dbFirst(
      db,
      "SELECT save_json AS saveJson, updated_at AS updatedAt FROM saves WHERE user_id = ? AND slot = ?",
      [user.id, slot]
    );
    if (!row) return json({ saveJson: null, updatedAt: 0 }, { req });
    return json({ saveJson: row.saveJson, updatedAt: Number(row.updatedAt) || 0 }, { req });
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const saveJson = typeof body?.saveJson === "string" ? body.saveJson : "";
    if (!saveJson) return json({ error: "missing saveJson" }, { status: 400, req });
    if (new TextEncoder().encode(saveJson).length > MAX_SAVE_BYTES) {
      return json({ error: "save too large" }, { status: 413, req });
    }
    const updatedAt = intOr(body?.updatedAt, nowMs());
    await dbRun(
      db,
      `INSERT INTO saves(user_id, slot, save_json, updated_at) VALUES(?, ?, ?, ?)
       ON CONFLICT(user_id, slot) DO UPDATE SET save_json = excluded.save_json, updated_at = excluded.updated_at`,
      [user.id, slot, saveJson, updatedAt]
    );
    return json({ applied: true, updatedAt }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
