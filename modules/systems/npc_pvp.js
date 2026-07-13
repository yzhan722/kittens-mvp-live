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
