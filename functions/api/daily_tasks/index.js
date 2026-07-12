import { handleOptions, json } from "../_db.js";

// Retired: daily tasks are client-local (modules/daily_tasks.js). D1 endpoints removed.
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  return json(
    { error: "gone", message: "daily tasks are client-local; remove /api/daily_tasks callers" },
    { status: 410, req }
  );
}
