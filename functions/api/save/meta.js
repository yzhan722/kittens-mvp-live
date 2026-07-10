import { requireUser } from "../_auth.js";
import { dbAll, getDb, handleOptions, json } from "../_db.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rows = await dbAll(db, "SELECT slot, updated_at AS updatedAt FROM saves WHERE user_id = ? ORDER BY slot", [
    user.id,
  ]);
  const slots = rows.map((r) => ({
    slot: Number(r.slot),
    updatedAt: Number(r.updatedAt) || 0,
  }));
  return json({ slots }, { req });
}
