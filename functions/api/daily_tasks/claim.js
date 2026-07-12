import { handleOptions, json } from "../_db.js";

// Retired: claim is handled by client-local modules/daily_tasks.js
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  return json(
    { error: "gone", message: "daily tasks claim is client-local" },
    { status: 410, req }
  );
}
