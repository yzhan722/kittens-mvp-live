#!/usr/bin/env node
import {
  FUNNEL_EVENTS,
  sanitizeEventName,
  sanitizeProps,
  mergeQueues,
  buildIngestPayload,
} from "../modules/analytics.js";
import { mergeRemoteConfig, REMOTE_CONFIG_DEFAULTS } from "../modules/remote_config.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(FUNNEL_EVENTS.length === 5, "funnel event count");
assert(sanitizeEventName("gather_click") === "gather_click", "valid event");
assert(sanitizeEventName("BAD") === "", "reject bad event");
assert(sanitizeProps({ ok: 1, bad_key: 2 }).ok === 1, "props number");
assert(sanitizeProps({ note: "x".repeat(300) }).note.length === 200, "props trim");

assert(mergeQueues([{ a: 1 }], [{ b: 2 }]).length === 2, "merge");
assert(mergeQueues([{ a: 1 }], [{ b: 2 }], 1).length === 1, "merge cap");

{
  const payload = buildIngestPayload(
    [{ event: "session_start", ts: 1000, props: { online: true } }],
    { sessionId: "sess", uid: "u1", gameVersion: "0.40.1" }
  );
  assert(payload.events.length === 1, "payload len");
  assert(payload.events[0].event === "session_start", "payload event");
  assert(payload.events[0].props.online === true, "payload props");
}

assert(mergeRemoteConfig(null).seasonId === REMOTE_CONFIG_DEFAULTS.seasonId, "remote defaults");
assert(mergeRemoteConfig({ seasonId: "s2", shopDefaultFold: { daily: true } }).shopDefaultFold.daily === true, "remote fold");

if (failed) {
  console.error(`analytics-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("analytics-selfcheck: ok");
