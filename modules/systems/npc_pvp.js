/** Offline NPC trainers for social tab — no cloud required. */

export const NPC_TRAINERS = [
  {
    id: "npc_youngster",
    name: "短裤小子小刚",
    blurb: "路边训练家：练手好对手。",
    team: [
      { name: "波波", types: ["normal", "flying"], hp: 80, attack: 28, defense: 22, speed: 40, level: 12 },
      { name: "绿毛虫", types: ["bug"], hp: 70, attack: 22, defense: 20, speed: 25, level: 10 },
    ],
  },
  {
    id: "npc_lass",
    name: "迷你裙美美",
    blurb: "喜欢草系，小心麻痹与缠绕。",
    team: [
      { name: "走路草", types: ["grass", "poison"], hp: 90, attack: 32, defense: 30, speed: 30, level: 16 },
      { name: "喇叭芽", types: ["grass", "poison"], hp: 95, attack: 36, defense: 28, speed: 28, level: 18 },
      { name: "可达鸭", types: ["water"], hp: 100, attack: 34, defense: 30, speed: 38, level: 18 },
    ],
  },
  {
    id: "npc_ace",
    name: "精英训练家阿哲",
    blurb: "赛季练兵：强度接近中期道馆。",
    team: [
      { name: "喷火龙", types: ["fire", "flying"], hp: 160, attack: 70, defense: 55, speed: 72, level: 36 },
      { name: "水箭龟", types: ["water"], hp: 170, attack: 60, defense: 75, speed: 50, level: 36 },
      { name: "妙蛙花", types: ["grass", "poison"], hp: 165, attack: 62, defense: 65, speed: 55, level: 36 },
      { name: "皮卡丘", types: ["electric"], hp: 120, attack: 58, defense: 40, speed: 80, level: 34 },
    ],
  },
];

export function listNpcTrainers() {
  return NPC_TRAINERS.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb, size: t.team.length }));
}

export function getNpcTrainer(id) {
  return NPC_TRAINERS.find((t) => t.id === id) || null;
}

export function buildNpcTeam(trainerId) {
  const t = getNpcTrainer(trainerId);
  if (!t) return [];
  return t.team.map((m, i) => ({
    id: `npc_${trainerId}_${i}`,
    name: m.name,
    types: m.types.slice(),
    hp: m.hp,
    attack: m.attack,
    defense: m.defense,
    speed: m.speed,
    level: m.level,
    stats: { hp: m.hp, atk: m.attack, def: m.defense, spe: m.speed },
  }));
}

/** Persist W/L vs each NPC trainer under state.meta.npcRecord. */
export function ensureNpcRecord(state) {
  if (!state || typeof state !== "object") return {};
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.npcRecord || typeof state.meta.npcRecord !== "object") state.meta.npcRecord = {};
  return state.meta.npcRecord;
}

export function recordNpcFight(state, trainerId, won) {
  const rec = ensureNpcRecord(state);
  const id = typeof trainerId === "string" ? trainerId : "";
  if (!id) return { w: 0, l: 0 };
  const cur = rec[id] && typeof rec[id] === "object" ? rec[id] : { w: 0, l: 0 };
  const w = Math.max(0, Math.floor(cur.w || 0));
  const l = Math.max(0, Math.floor(cur.l || 0));
  const next = won ? { w: w + 1, l } : { w, l: l + 1 };
  rec[id] = next;
  return next;
}

export function npcRecordLine(record, trainerId) {
  const cur = record && typeof record === "object" ? record[trainerId] : null;
  if (!cur || typeof cur !== "object") return "0胜0负";
  const w = Math.max(0, Math.floor(cur.w || 0));
  const l = Math.max(0, Math.floor(cur.l || 0));
  return `${w}胜${l}负`;
}

/** Mon-based week key (same style as lucky week). */
export function npcWeekKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date();
  const day = (x.getDay() + 6) % 7;
  const monday = new Date(x);
  monday.setDate(x.getDate() - day);
  return `${monday.getFullYear()}-W${String(monday.getMonth() + 1).padStart(2, "0")}${String(monday.getDate()).padStart(2, "0")}`;
}

/** Weekly: beat all 3 trainers once → claim +20 FC. */
export function ensureNpcWeekly(state, week = npcWeekKey()) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const cur = state.meta.npcWeekly;
  if (!cur || typeof cur !== "object" || cur.week !== week) {
    state.meta.npcWeekly = { week, beaten: {}, claimed: false };
  }
  if (!state.meta.npcWeekly.beaten || typeof state.meta.npcWeekly.beaten !== "object") {
    state.meta.npcWeekly.beaten = {};
  }
  return state.meta.npcWeekly;
}

export function noteNpcWeeklyWin(state, trainerId) {
  const w = ensureNpcWeekly(state);
  if (!w || !trainerId) return w;
  w.beaten[trainerId] = true;
  return w;
}

export function npcWeeklyProgress(state) {
  const w = ensureNpcWeekly(state);
  const ids = NPC_TRAINERS.map((t) => t.id);
  const beaten = ids.filter((id) => Boolean(w?.beaten?.[id]));
  const allDone = beaten.length >= ids.length;
  return {
    week: w?.week || "",
    beatenIds: beaten,
    total: ids.length,
    allDone,
    claimed: Boolean(w?.claimed),
    canClaim: allDone && !w?.claimed,
  };
}

export function claimNpcWeeklyFc(state, amount = 20) {
  const w = ensureNpcWeekly(state);
  const prog = npcWeeklyProgress(state);
  if (!prog.canClaim || !w) return { ok: false, fc: 0 };
  w.claimed = true;
  return { ok: true, fc: Math.max(0, Math.floor(amount)) };
}
