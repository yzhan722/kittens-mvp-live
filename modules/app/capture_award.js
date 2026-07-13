/**
 * Award a caught Pokémon — shared by app.js and headless player-sim.
 */
import { bumpSessionCatch } from "../systems/gameplay_fun.js";
import { noteShinySpecies } from "../systems/collection_fun.js";

export function awardCaughtPokemon(state, species, opts, ctx) {
  const p = species;
  if (!p?.id) return null;

  const isShiny = Boolean(opts && typeof opts === "object" && opts.isShiny);
  const {
    createMonInstance,
    ui,
    addLog,
    addRes,
    bumpEraCounter,
    syncEraProgress,
    afterAward,
  } = ctx || {};

  if (!state.dex?.caught) {
    if (!state.dex) state.dex = {};
    state.dex.caught = {};
  }
  const caught = state.dex.caught;
  const prev = typeof caught[p.id] === "number" ? caught[p.id] : 0;
  caught[p.id] = prev + 1;

  const prevCatch =
    typeof state.catchCount === "number" && Number.isFinite(state.catchCount)
      ? state.catchCount
      : 0;
  state.catchCount = Math.max(0, Math.floor(prevCatch)) + 1;
  bumpSessionCatch(state);

  if (typeof bumpEraCounter === "function") bumpEraCounter(state, "catch_count", 1);
  if (typeof syncEraProgress === "function") syncEraProgress();

  if (isShiny) {
    const prevShiny =
      typeof state.shinyCount === "number" && Number.isFinite(state.shinyCount)
        ? state.shinyCount
        : 0;
    state.shinyCount = Math.max(0, Math.floor(prevShiny)) + 1;
    const mile = noteShinySpecies(state, p);
    if (mile?.item && typeof addRes === "function") {
      addRes(mile.item, 1);
      if (typeof addLog === "function") addLog(mile.label, true);
    }
  }

  if (!state.mons) state.mons = { nextId: 1, list: [] };
  const mon = typeof createMonInstance === "function"
    ? createMonInstance(p, {
        nature: opts && typeof opts === "object" && typeof opts.nature === "string" ? opts.nature : undefined,
        ability: opts && typeof opts === "object" && typeof opts.ability === "string" ? opts.ability : undefined,
      })
    : null;
  if (!mon) return null;
  mon.isShiny = isShiny;
  const caughtWithBall =
    opts && typeof opts === "object" && typeof opts.ballType === "string"
      ? opts.ballType
      : "pokeball";
  mon.caughtWith = caughtWithBall;
  state.mons.list.push(mon);
  state.mons.nextId = Math.max(state.mons.nextId, mon.id + 1);

  if (ui && typeof ui === "object") {
    ui.dexDirty = true;
    ui.captureDirty = true;
    ui.monsDirty = true;
    ui.functionsDirty = true;
  }

  if (typeof addLog === "function") {
    if (prev === 0) addLog(`图鉴登记：${p.name}（首次捕获）`, true);
    else addLog(`捕获：${p.name} +1`);
    if (isShiny) addLog(`！！！闪光入队：${p.name}！！！`, true);
  }

  if (typeof afterAward === "function") {
    afterAward({ species: p, prev, isShiny, mon, prevCatchCount: prevCatch });
  }

  return mon;
}
