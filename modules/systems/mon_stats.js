import {
  addExpToMon as addExpToMon0,
  createMonInstance as createMonInstance0,
  evolveMon as evolveMon0,
  getMonCurrentStats as getMonCurrentStats0,
} from "../mons.js";

/** @typedef {{ state: object, ui: object, getPokeApiDataByDex: Function, getSpeciesByPid: Function, serverBuffMul: Function, addLog: Function }} MonStatsDeps */

export function getMonCurrentStatsWith(deps, mon) {
  return getMonCurrentStats0(mon, deps.getPokeApiDataByDex);
}

export function createMonInstanceWith(deps, species, idOverride = null) {
  const m = createMonInstance0(species, {
    idOverride,
    idFallback: deps.state?.mons?.nextId ?? 1,
  });
  m.skillCdRemainingSec = 0;
  m.skillActiveType = null;
  m.skillActiveRemainingSec = 0;
  return m;
}

export function addExpToMonWith(deps, mon, expAdd) {
  const add0 = typeof expAdd === "number" && Number.isFinite(expAdd) ? expAdd : 0;
  const boostOn =
    typeof deps.state.expBoostRemainingSec === "number" &&
    Number.isFinite(deps.state.expBoostRemainingSec) &&
    deps.state.expBoostRemainingSec > 0;
  const luckyEggOn = typeof mon?.buffs?.luckyEgg === "number" && mon.buffs?.luckyEgg > Date.now();
  const permExpLvl =
    typeof deps.state.permanentBoosts?.exp === "number"
      ? Math.max(0, Math.min(10, Math.floor(deps.state.permanentBoosts.exp)))
      : 0;
  const permExpMul = 1 + permExpLvl * 0.1;
  const mul = (boostOn ? 2 : 1) * (luckyEggOn ? 1.5 : 1) * deps.serverBuffMul("exp") * permExpMul;
  return addExpToMon0(mon, Math.floor(add0 * mul));
}

export function evolveMonWith(deps, mon, toPid) {
  const ok = evolveMon0(mon, toPid, deps.getSpeciesByPid);
  if (!ok) return false;

  if (!deps.state.dex || typeof deps.state.dex !== "object") deps.state.dex = { caught: {} };
  if (!deps.state.dex.caught || typeof deps.state.dex.caught !== "object") deps.state.dex.caught = {};
  const sp = deps.getSpeciesByPid(toPid);
  if (sp) {
    const caught = deps.state.dex.caught;
    const prev = typeof caught[sp.id] === "number" ? caught[sp.id] : 0;
    caught[sp.id] = prev + 1;
    if (prev === 0) {
      deps.addLog(`图鉴登记：${sp.name}（进化解锁）`, true);
    }
  }

  deps.ui.dexDirty = true;
  return true;
}
