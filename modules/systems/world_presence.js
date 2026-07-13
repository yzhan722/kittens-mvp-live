/**
 * World presence helpers — fake + soft liveliness without requiring live peers.
 * ponytail: ambient / board padding is seeded theater; upgrade = real events + scores heat.
 */

export const FAKE_TRAINERS = Object.freeze([
  "小叶",
  "阿哲",
  "迷你裙",
  "短裤小子",
  "道馆影子",
  "青柠",
  "卡比控",
  "闪光猎人",
  "蛋蛋大师",
  "球球",
  "夜行者",
  "林间",
  "沙暴",
  "雷云",
  "波波",
  "呆呆",
  "火龙仔",
  "龟龟",
  "妙妙",
  "伊布控",
  "钢钢",
  "幽灵屋",
  "道馆新人",
  "周末战士",
  "挂机达人",
  "图鉴强迫症",
  "远征队长",
  "果园主",
  "搓球手",
  "试炼爬塔",
]);

const AMBIENT_ACTIONS = [
  "刚登记了一种新图鉴",
  "远征带回了不少球果",
  "捕捉成功，队伍又壮了一点",
  "研究完成，开始搓球",
  "试炼塔又爬了一层",
  "生蛋计时还在走",
  "果树浇了一轮",
  "解锁了新的捕捉区域",
  "进化成功，亲密度还在涨",
  "闪光收藏又多了一只",
  "提交了排行榜成绩",
  "恐吓了全服林佬",
  "领了每日双礼",
  "在商店拧了一次转盘",
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
  { name: "氛围·短裤小子", dex: 18, power: 1200 },
  { name: "氛围·迷你裙", dex: 42, power: 2800 },
  { name: "氛围·青柠", dex: 65, power: 6500 },
  { name: "氛围·阿哲", dex: 95, power: 14000 },
  { name: "氛围·道馆影子", dex: 130, power: 28000 },
  { name: "氛围·挂机达人", dex: 160, power: 42000 },
];

const BASE_SEASON_GHOSTS = [
  { name: "短裤小子", score: 90 },
  { name: "迷你裙", score: 240 },
  { name: "青柠", score: 520 },
  { name: "阿哲", score: 980 },
  { name: "道馆影子", score: 1600 },
  { name: "挂机达人", score: 2400 },
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

/** Deterministic ambient ticker line for a time bucket (10 min). */
export function ambientWorldLine(nowMs = Date.now(), salt = 0) {
  const bucket = Math.floor(Math.max(0, Number(nowMs) || 0) / (10 * 60 * 1000));
  const rnd = mulberry32(hashStr(`ambient:${bucket}:${salt}`));
  if (rnd() < 0.18) {
    return rnd() < 0.5 ? "全服：有人正在恐吓林佬" : "全服：排行榜分数刚被刷新";
  }
  const name = pickTrainer(rnd);
  const action = AMBIENT_ACTIONS[Math.floor(rnd() * AMBIENT_ACTIONS.length) % AMBIENT_ACTIONS.length];
  return `训练家·${name}：${action}`;
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
    if (kind === 0) text = `图鉴达到 ${Math.floor(20 + rnd() * 120)} 种`;
    else if (kind === 1) text = `捕捉成功，队伍战力又涨了一截`;
    else if (kind === 2) text = `闪光收藏 +${1 + Math.floor(rnd() * 2)}`;
    else text = `远征归来，带回一堆球果`;
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

  const realNames = new Set(
    real.map((it) => {
      const n =
        typeof it?.attrs?.ownerName === "string"
          ? it.attrs.ownerName
          : typeof it?.name === "string"
            ? it.name
            : "";
      return n.trim();
    })
  );

  const merged = real.map((it) => ({ ...it, fake: Boolean(it?.attrs?.fake || it?.fake) }));
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
            : "",
      fake: Boolean(it.fake || it?.attrs?.fake),
    },
  }));
}

/** One-line HUD for林佬 boss. */
export function bossHudLine(boss) {
  if (!boss || typeof boss !== "object") return "林佬：连线中…";
  const maxHp = typeof boss.maxHp === "number" && Number.isFinite(boss.maxHp) ? Math.max(1, Math.floor(boss.maxHp)) : 0;
  const hp = typeof boss.hp === "number" && Number.isFinite(boss.hp) ? Math.max(0, Math.floor(boss.hp)) : 0;
  if (!maxHp) return "林佬：暂无数据";
  const pct = Math.min(100, Math.round((hp / maxHp) * 100));
  if (hp <= 0) return `林佬：已倒下 · 第 ${Math.max(0, Math.floor(boss.killSeq || 0))} 轮`;
  return `林佬 HP ${hp}/${maxHp}（${pct}%）`;
}
