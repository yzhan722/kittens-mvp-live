import { handleOptions, json } from "./_db.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });
  return json({ ok: true, version: "0.41.2", service: "kittens-mvp-api" }, { req });
}
