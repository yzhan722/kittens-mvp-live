import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  const body = await readJson(req);
  const inviteId = intOr(body?.inviteId, 0);
  const teamData = Array.isArray(body?.teamData) ? body.teamData : [];
  if (!inviteId) return json({ error: "bad request" }, { status: 400, req });

  const inv = await dbFirst(db, "SELECT * FROM pvp_invites WHERE id = ?", [inviteId]);
  if (!inv || inv.to_uid !== uid || inv.status !== "pending") {
    return json({ error: "invite not found" }, { req });
  }
  if (Number(inv.expires_at) < nowMs()) {
    await dbRun(db, "UPDATE pvp_invites SET status = 'expired' WHERE id = ?", [inviteId]);
    return json({ error: "invite expired" }, { req });
  }

  let player1Team = [];
  try {
    player1Team = JSON.parse(inv.team_data || "[]");
  } catch {
  }

  await dbRun(db, "UPDATE pvp_invites SET status = 'accepted' WHERE id = ?", [inviteId]);

  return json(
    {
      inviteId,
      player1Uid: inv.from_uid,
      player2Uid: uid,
      player1Team: Array.isArray(player1Team) ? player1Team : [],
      player2Team: teamData,
    },
    { req }
  );
}
