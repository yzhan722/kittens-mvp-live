/**
 * World presence helpers — fake + soft liveliness without requiring live peers.
 * ponytail: ambient lines are seeded theater; upgrade path = real events table heat.
 */

const AMBIENT_LINES = [
  "训练家·小叶：刚登记了一种新图鉴",
  "训练家·阿哲：远征带回了不少球果",
  "训练家·迷你裙：捕捉成功，队伍又壮了一点",
  "训练家·短裤小子：研究完成，开始搓球",
  "训练家·道馆影子：试炼塔又爬了一层",
  "训练家·火：生蛋计时还在走",
  "训练家·水：果树浇了一轮",
  "全服：有人正在恐吓林佬",
  "全服：排行榜分数刚被刷新",
  "训练家·风：解锁了新的捕捉区域",
  "训练家·光：进化成功，亲密度还在涨",
  "训练家·影：闪光收藏又多了一只",
];

const BASE_LB_GHOSTS = [
  { name: "幽灵·短裤小子", dex: 12, power: 800 },
  { name: "幽灵·迷你裙", dex: 35, power: 2200 },
  { name: "幽灵·精英阿哲", dex: 80, power: 12000 },
  { name: "幽灵·道馆影子", dex: 120, power: 28000 },
];

const BASE_SEASON_GHOSTS = [
  { name: "短裤小子", score: 80 },
  { name: "迷你裙", score: 220 },
  { name: "精英阿哲", score: 900 },
  { name: "道馆影子", score: 1800 },
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

/** Deterministic ambient ticker line for a time bucket (10 min). */
export function ambientWorldLine(nowMs = Date.now(), salt = 0) {
  const bucket = Math.floor(Math.max(0, Number(nowMs) || 0) / (10 * 60 * 1000));
  const idx = hashStr(`${bucket}:${salt}`) % AMBIENT_LINES.length;
  return AMBIENT_LINES[idx];
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
