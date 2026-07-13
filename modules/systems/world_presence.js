/**
 * World presence helpers — fake + soft liveliness without requiring live peers.
 * ponytail: ambient / board padding is seeded theater; upgrade = real events + scores heat.
 * Trainer handles stay ASCII so CDN/encoding never turns them into mojibake.
 */

export const FAKE_TRAINERS = Object.freeze([
  "LeafGrove",
  "AshPro",
  "MiniSkirt",
  "ShortsKid",
  "GymShadow",
  "LimeSoda",
  "SnorlaxFan",
  "ShinyHunt",
  "EggMaster",
  "BallCraft",
  "NightOwl",
  "ForestRun",
  "SandStorm",
  "ThunderCloud",
  "PidgeyScout",
  "Slowpoke",
  "CharmKid",
  "Squirtle",
  "BulbaFan",
  "EeveeClub",
  "SteelWall",
  "GhostHouse",
  "GymRookie",
  "WeekendWar",
  "IdleAce",
  "DexCompulse",
  "ExpeditionLead",
  "BerryFarm",
  "BallSpinner",
  "TowerClimber",
]);

const AMBIENT_ACTIONS = [
  "logged a new dex entry",
  "came back from expedition",
  "caught another mon",
  "finished research and started crafting balls",
  "climbed another tower floor",
  "is still incubating an egg",
  "watered the berry trees",
  "unlocked a new catch area",
  "evolved a partner",
  "added a shiny to the gallery",
  "refreshed leaderboard scores",
  "bullied the server boss",
  "claimed daily gifts",
  "spun the shop wheel",
];

const BOARD_RANGES = {
  dex: { min: 12, max: 220 },
  power: { min: 600, max: 52000 },
  contrib: { min: 5, max: 900 },
  hatch: { min: 1, max: 80 },
  shiny: { min: 0, max: 28 },
  total_power: { min: 2000, max: 180000 },
  totalPower: { min: 2000, max: 180000 },
  gather: { min: 40, max: 12000 },
  resource: { min: 500, max: 250000 },
  catch: { min: 8, max: 900 },
};

const BASE_LB_GHOSTS = [
  { name: "NPC_ShortsKid", dex: 18, power: 1200 },
  { name: "NPC_MiniSkirt", dex: 42, power: 2800 },
  { name: "NPC_LimeSoda", dex: 65, power: 6500 },
  { name: "NPC_AshPro", dex: 95, power: 14000 },
  { name: "NPC_GymShadow", dex: 130, power: 28000 },
  { name: "NPC_IdleAce", dex: 160, power: 42000 },
];

const BASE_SEASON_GHOSTS = [
  { name: "ShortsKid", score: 90 },
  { name: "MiniSkirt", score: 240 },
  { name: "LimeSoda", score: 520 },
  { name: "AshPro", score: 980 },
  { name: "GymShadow", score: 1600 },
  { name: "IdleAce", score: 2400 },
];

function hashStr(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickTrainer(rnd) {
  return FAKE_TRAINERS[Math.floor(rnd() * FAKE_TRAINERS.length) % FAKE_TRAINERS.length];
}

/** True if name looks empty, uid-like garbage, or encoding junk. */
export function looksBrokenName(name) {
  const n = String(name || "").trim();
  if (!n) return true;
  if (n.includes("\uFFFD")) return true;
  // classic mojibake markers from UTF-8 read as latin1
  if (/[ÃÂåæçðñòóô]/.test(n) && /[¤¥¦§¨©ª«]/.test(n)) return true;
  if (/^[\x00-\x1f\x7f-\x9f]+$/.test(n)) return true;
  // bare uid / hash dumps / auto-generated score stubs
  if (/^[0-9a-f]{12,}$/i.test(n)) return true;
  if (/^(uid|user|guest|tmp|qa|all|fb)[_-]?[0-9a-f]{6,}$/i.test(n)) return true;
  if (/^[a-z]{1,4}[0-9a-f]{8,}$/i.test(n)) return true;
  return false;
}

/** Prefer a readable trainer handle for UI. */
export function displayTrainerId(name, uid = "") {
  const n = String(name || "").trim();
  if (!looksBrokenName(n)) return n.slice(0, 32);
  const seed = hashStr(`${uid || n || "anon"}:display`);
  return FAKE_TRAINERS[seed % FAKE_TRAINERS.length];
}

/** Deterministic ambient ticker line for a time bucket (10 min). */
export function ambientWorldLine(nowMs = Date.now(), salt = 0) {
  const bucket = Math.floor(Math.max(0, Number(nowMs) || 0) / (10 * 60 * 1000));
  const rnd = mulberry32(hashStr(`ambient:${bucket}:${salt}`));
  if (rnd() < 0.18) {
    return rnd() < 0.5 ? "Server: someone is bullying the boss" : "Server: leaderboard scores just refreshed";
  }
  const name = pickTrainer(rnd);
  const action = AMBIENT_ACTIONS[Math.floor(rnd() * AMBIENT_ACTIONS.length) % AMBIENT_ACTIONS.length];
  return `${name}: ${action}`;
}

/** Several ambient lines for padding an empty feed. */
export function ambientWorldBatch(nowMs = Date.now(), count = 3) {
  const n = Math.max(1, Math.min(8, Math.floor(count) || 3));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ type: "ambient", msg: ambientWorldLine(nowMs, i + 1) });
  }
  return out;
}

/** Soft social feed cards when real achievements are empty. */
export function fakeSocialFeed(dateStr = localDateStr(), count = 5) {
  const rnd = mulberry32(hashStr(`social-feed:${dateStr}`));
  const n = Math.max(1, Math.min(8, Math.floor(count) || 5));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const name = pickTrainer(rnd);
    const kind = Math.floor(rnd() * 4);
    let text = "";
    if (kind === 0) text = `Dex reached ${Math.floor(20 + rnd() * 120)} species`;
    else if (kind === 1) text = `Caught another mon — team power up`;
    else if (kind === 2) text = `Shiny gallery +${1 + Math.floor(rnd() * 2)}`;
    else text = `Expedition return with a berry haul`;
    out.push({
      id: `fake-${dateStr}-${i}`,
      username: name,
      fake: true,
      text,
      created_at: Date.now() - Math.floor(rnd() * 6 * 3600 * 1000),
    });
  }
  return out;
}

/** Daily-drifting leaderboard ghost rivals. */
export function ghostRivalsForDay(dateStr = localDateStr()) {
  const rnd = mulberry32(hashStr(`lb-ghost:${dateStr}`));
  return BASE_LB_GHOSTS.map((g, i) => {
    const dexJitter = Math.floor((rnd() - 0.35) * (8 + i * 4));
    const powJitter = Math.floor((rnd() - 0.4) * (400 + i * 1200));
    return {
      name: g.name,
      dex: Math.max(5, g.dex + dexJitter),
      power: Math.max(200, g.power + powJitter),
    };
  });
}

/** Daily-drifting season score ghosts. */
export function seasonGhostsForDay(dateStr = localDateStr()) {
  const rnd = mulberry32(hashStr(`season-ghost:${dateStr}`));
  return BASE_SEASON_GHOSTS.map((g, i) => {
    const jitter = Math.floor((rnd() - 0.4) * (40 + i * 80));
    return { name: g.name, score: Math.max(20, g.score + jitter) };
  });
}

function boardRange(board) {
  return BOARD_RANGES[board] || BOARD_RANGES.dex;
}

/** Generate fake leaderboard rows for one board (deterministic per day). */
export function fakeBoardRows(board, dateStr = localDateStr(), count = 12) {
  const rnd = mulberry32(hashStr(`board:${board}:${dateStr}`));
  const range = boardRange(board);
  const n = Math.max(1, Math.min(40, Math.floor(count) || 12));
  const used = new Set();
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    let name = pickTrainer(rnd);
    let guard = 0;
    while (used.has(name) && guard < 20) {
      name = pickTrainer(rnd);
      guard += 1;
    }
    used.add(name);
    const t = rnd();
    const score = Math.max(
      range.min,
      Math.floor(range.min + (range.max - range.min) * (0.15 + t * 0.85) + (rnd() - 0.5) * range.min * 0.2)
    );
    rows.push({
      rank: 0,
      score,
      name,
      attrs: { ownerName: name, fake: true },
      fake: true,
    });
  }
  return rows;
}

/**
 * Merge real leaderboard items with daily fake trainers, re-rank.
 * Fakes always pad thin boards; even busy boards get a few for atmosphere.
 */
export function padLeaderboard(items, board, dateStr = localDateStr(), opts = null) {
  const real = Array.isArray(items) ? items.slice() : [];
  const minRows = typeof opts?.minRows === "number" ? opts.minRows : 14;
  const alwaysFake = typeof opts?.alwaysFake === "number" ? opts.alwaysFake : 6;
  const need = Math.max(alwaysFake, minRows - real.length);
  const fakes = fakeBoardRows(board, dateStr, need);

  const realNames = new Set();
  const cleanedReal = real.map((it) => {
    const rawName =
      typeof it?.attrs?.ownerName === "string"
        ? it.attrs.ownerName
        : typeof it?.name === "string"
          ? it.name
          : "";
    const uid = typeof it?.uid === "string" ? it.uid : typeof it?.attrs?.uid === "string" ? it.attrs.uid : "";
    const ownerName = displayTrainerId(rawName, uid);
    realNames.add(ownerName);
    return {
      ...it,
      name: ownerName,
      fake: false,
      attrs: {
        ...(it.attrs && typeof it.attrs === "object" ? it.attrs : {}),
        ownerName,
        fake: false,
        uid: uid || undefined,
      },
    };
  });

  const merged = cleanedReal.slice();
  for (const f of fakes) {
    if (realNames.has(f.name)) continue;
    merged.push(f);
  }

  merged.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return merged.slice(0, 100).map((it, idx) => ({
    ...it,
    rank: idx + 1,
    fake: Boolean(it.fake || it?.attrs?.fake),
    attrs: {
      ...(it.attrs && typeof it.attrs === "object" ? it.attrs : {}),
      ownerName:
        typeof it?.attrs?.ownerName === "string"
          ? it.attrs.ownerName
          : typeof it?.name === "string"
            ? it.name
            : "Trainer_Anon",
      fake: Boolean(it.fake || it?.attrs?.fake),
    },
  }));
}

/** One-line HUD for林佬 boss. */
export function bossHudLine(boss) {
  if (!boss || typeof boss !== "object") return "Boss: connecting…";
  const maxHp = typeof boss.maxHp === "number" && Number.isFinite(boss.maxHp) ? Math.max(1, Math.floor(boss.maxHp)) : 0;
  const hp = typeof boss.hp === "number" && Number.isFinite(boss.hp) ? Math.max(0, Math.floor(boss.hp)) : 0;
  if (!maxHp) return "Boss: no data";
  const pct = Math.min(100, Math.round((hp / maxHp) * 100));
  if (hp <= 0) return `Boss: down · round ${Math.max(0, Math.floor(boss.killSeq || 0))}`;
  return `Boss HP ${hp}/${maxHp} (${pct}%)`;
}
