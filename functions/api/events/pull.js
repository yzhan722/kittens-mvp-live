import { dbAll, dbFirst, getDb, handleOptions, json } from "../_db.js";
import { intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const since = Math.max(0, intOr(url.searchParams.get("since"), 0));
    const limit = Math.min(50, Math.max(1, intOr(url.searchParams.get("limit"), 30)));
    const items = await dbAll(
      db,
      `SELECT id, ts, type, uid, name, msg FROM events WHERE id > ? ORDER BY id ASC LIMIT ?`,
      [since, limit]
    );
    const lastRow = await dbFirst(db, "SELECT id FROM events ORDER BY id DESC LIMIT 1");
    const lastId = lastRow ? Number(lastRow.id) : since;
    return json(
      {
        items: items.map((it) => ({
          id: Number(it.id),
          ts: Number(it.ts) || 0,
          type: it.type || "",
          msg: it.msg || "",
        })),
        lastId,
      },
      { req }
    );
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
