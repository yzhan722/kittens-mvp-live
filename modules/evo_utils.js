export function getEvoMap() {
  const m = globalThis.POKEMON_EVO;
  return m && typeof m === "object" ? m : {};
}

let EVO_FAMILY_ID_BY_PID = null;

function buildEvoFamilyIdMap() {
  const evo = getEvoMap();
  const adj = {};
  const ensure = (pid) => {
    if (!pid || typeof pid !== "string") return;
    if (!adj[pid]) adj[pid] = new Set();
  };
  for (const [from, tos] of Object.entries(evo)) {
    if (typeof from !== "string" || !Array.isArray(tos)) continue;
    ensure(from);
    for (const to of tos) {
      if (typeof to !== "string") continue;
      ensure(to);
      adj[from].add(to);
      adj[to].add(from);
    }
  }
  const famId = new Map();
  let next = 1;
  for (const pid of Object.keys(adj)) {
    if (famId.has(pid)) continue;
    const id = next;
    next += 1;
    const q = [pid];
    famId.set(pid, id);
    while (q.length) {
      const cur = q.pop();
      const ns = adj[cur];
      if (!ns) continue;
      for (const n of ns) {
        if (famId.has(n)) continue;
        famId.set(n, id);
        q.push(n);
      }
    }
  }
  return famId;
}

/** Stable evolution-family id for release / star-up grouping. */
export function getEvoFamilyId(pid) {
  if (!pid || typeof pid !== "string") return "";
  if (!EVO_FAMILY_ID_BY_PID) EVO_FAMILY_ID_BY_PID = buildEvoFamilyIdMap();
  return EVO_FAMILY_ID_BY_PID.get(pid) ?? pid;
}

export function isSameEvoFamily(pidA, pidB) {
  if (!pidA || !pidB) return false;
  if (pidA === pidB) return true;
  return getEvoFamilyId(pidA) === getEvoFamilyId(pidB);
}

function getEvoReqMap() {
  const m = globalThis.POKEMON_EVO_REQ;
  return m && typeof m === "object" ? m : {};
}

/** ponytail: test-only reset when POKEMON_EVO is injected after first import */
export function resetEvoFamilyCacheForTest() {
  EVO_FAMILY_ID_BY_PID = null;
}

function buildEvoPrevMap() {
  const evo = getEvoMap();
  const prev = {};
  for (const [from, tos] of Object.entries(evo)) {
    if (!Array.isArray(tos)) continue;
    for (const to of tos) {
      if (typeof to !== "string") continue;
      if (!prev[to]) prev[to] = from;
    }
  }
  return prev;
}

const EVO_PREV = buildEvoPrevMap();

export function stageIndex(pid) {
  let cur = pid;
  let depth = 0;
  while (EVO_PREV[cur] && depth < 4) {
    cur = EVO_PREV[cur];
    depth += 1;
  }
  return depth;
}

export function defaultReqLvlByStage(pid) {
  const st = stageIndex(pid);
  return st <= 0 ? 16 : st === 1 ? 36 : 50;
}

export function getEvoReqLevel(fromPid, toPid) {
  const req = getEvoReqMap();
  const row = req && typeof req[fromPid] === "object" ? req[fromPid] : null;
  const lvl = row ? row[toPid] : null;
  if (typeof lvl === "number" && Number.isFinite(lvl) && lvl > 0) return Math.floor(lvl);
  if (lvl === 0) return 0;
  return null;
}

const TRADE_EVO_PAIRS = new Set([
  "p064->p065",
  "p067->p068",
  "p075->p076",
  "p093->p094",
  "p061->p186",
  "p079->p199",
  "p095->p208",
  "p117->p230",
  "p123->p212",
  "p137->p233",
  "p366->p367",
  "p366->p368",
  "p112->p464",
  "p125->p466",
  "p126->p467",
  "p233->p474",
  "p356->p477",
]);

export function isTradeEvo(fromPid, toPid) {
  if (!fromPid || !toPid) return false;
  return TRADE_EVO_PAIRS.has(`${fromPid}->${toPid}`);
}

const AFFECTION_EVO_PAIRS = new Set([
  "p042->p169",
  "p113->p242",
  "p175->p176",
  "p427->p428",
  "p447->p448",
  "p133->p196",
  "p133->p197",
]);

export function isAffectionEvo(fromPid, toPid) {
  if (!fromPid || !toPid) return false;
  return AFFECTION_EVO_PAIRS.has(`${fromPid}->${toPid}`);
}
