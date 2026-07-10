import { nowMs, escapeHtml } from "./utils.js";
import { debounce } from "./performance.js";

function readLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function formatLocalYmd(t = nowMs()) {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const getPokemonSpriteUrlLocal = (dex) => `../assets/pokemon/${dex}.png`;
const getPokemonSpriteUrlShinyLocal = (dex) => `../assets/pokemon_shiny/${dex}.png`;
const getPokemonSpriteUrl = (dex) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
const getPokemonSpriteUrlMirror = (dex) =>
  `https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${dex}.png`;
const getPokemonSpriteUrlShiny = (dex) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${dex}.png`;
const getPokemonSpriteUrlShinyMirror = (dex) =>
  `https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${dex}.png`;

const SPRITE_FAIL_KEY = "kittens_mvp_sprite_fail_v1";
const SHINY_SPRITE_FAIL_KEY = "kittens_mvp_shiny_sprite_fail_v1";
const SPRITE_STAGE_KEY = "kittens_mvp_sprite_stage_v1";
let __spriteFailSet = null;
let __spriteStageMap = null;
let __shinySpriteFailSet = null;

function __getShinySpriteFailSet() {
  if (__shinySpriteFailSet) return __shinySpriteFailSet;
  const raw = readLocalStorage(SHINY_SPRITE_FAIL_KEY);
  let obj = {};
  try {
    obj = raw ? JSON.parse(raw) : {};
  } catch {
    obj = {};
  }
  if (!obj || typeof obj !== "object") obj = {};
  const today = formatLocalYmd();
  const set = new Set();
  for (const k of Object.keys(obj)) {
    if (k.endsWith(`@${today}`)) set.add(k);
  }
  __shinySpriteFailSet = set;
  return __shinySpriteFailSet;
}

function __markShinySpriteFailed(dex) {
  const key = `${String(dex ?? "")}@${formatLocalYmd()}`;
  if (!key) return;
  const set = __getShinySpriteFailSet();
  if (set.has(key)) return;
  set.add(key);
  __flushShinyFails();
}

const __flushShinyFails = debounce(() => {
  try {
    const set = __getShinySpriteFailSet();
    const obj = {};
    for (const k of set) obj[k] = 1;
    localStorage.setItem(SHINY_SPRITE_FAIL_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}, 2000);

function __getSpriteFailSet() {
  if (__spriteFailSet) return __spriteFailSet;
  const raw = readLocalStorage(SPRITE_FAIL_KEY);
  let arr = [];
  try {
    arr = raw ? JSON.parse(raw) : [];
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) arr = [];
  const today = formatLocalYmd();
  const filtered = arr
    .map((x) => String(x))
    .filter((x) => x.endsWith(`@${today}`));
  __spriteFailSet = new Set(filtered);
  return __spriteFailSet;
}

function __markSpriteFailed(dex) {
  const key = `${String(dex ?? "")}@${formatLocalYmd()}`;
  if (!key) return;
  const set = __getSpriteFailSet();
  if (set.has(key)) return;
  set.add(key);
  __flushFails();
}

const __flushFails = debounce(() => {
  try {
    const set = __getSpriteFailSet();
    localStorage.setItem(SPRITE_FAIL_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}, 2000);

function __getSpriteStageMap() {
  if (__spriteStageMap) return __spriteStageMap;
  const raw = readLocalStorage(SPRITE_STAGE_KEY);
  let obj = {};
  try {
    obj = raw ? JSON.parse(raw) : {};
  } catch {
    obj = {};
  }
  if (!obj || typeof obj !== "object") obj = {};
  const today = formatLocalYmd();
  const next = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!k.endsWith(`@${today}`)) continue;
    const s = String(v);
    if (s === "gh" || s === "mirror" || s === "none") next[k] = s;
  }
  __spriteStageMap = next;
  return __spriteStageMap;
}

function __setSpriteStage(dex, stage) {
  const key = `${String(dex ?? "")}@${formatLocalYmd()}`;
  if (!key) return;
  const map = __getSpriteStageMap();
  const s = String(stage ?? "");
  if (s === "local" || !s) {
    if (map[key]) delete map[key];
  } else if (s === "gh" || s === "mirror" || s === "none") {
    map[key] = s;
  } else {
    return;
  }
  __flushStages();
}

const __flushStages = debounce(() => {
  try {
    const map = __getSpriteStageMap();
    localStorage.setItem(SPRITE_STAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}, 2000);

export function installSpriteHandlers() {
  if (typeof globalThis.__kittensSpriteOnError !== "function") {
    globalThis.__kittensSpriteOnError = (img) => {
      try {
        const dex = img?.getAttribute?.("data-dex");
        if (!dex) return;

        const stage0 = String(img?.getAttribute?.("data-stage") || "local");
        const stage = stage0 === "gh" || stage0 === "mirror" || stage0 === "none" ? stage0 : "local";
        if (stage === "local") {
          img.setAttribute("data-stage", "gh");
          __setSpriteStage(dex, "gh");
          img.src = getPokemonSpriteUrl(dex);
          return;
        }
        if (stage === "gh") {
          img.setAttribute("data-stage", "mirror");
          __setSpriteStage(dex, "mirror");
          img.src = getPokemonSpriteUrlMirror(dex);
          return;
        }

        __setSpriteStage(dex, "none");
        __markSpriteFailed(dex);
        img.remove?.();
      } catch {
        try {
          img?.remove?.();
        } catch {
          // ignore
        }
      }
    };
  }

  if (typeof globalThis.__kittensShinySpriteOnError !== "function") {
    globalThis.__kittensShinySpriteOnError = (img) => {
      try {
        const dex = img?.getAttribute?.("data-dex");
        if (!dex) return;

        const stage0 = String(img?.getAttribute?.("data-stage") || "local");
        const stage = stage0 === "gh" || stage0 === "mirror" || stage0 === "none" ? stage0 : "local";
        if (stage === "local") {
          img.setAttribute("data-stage", "gh");
          img.src = getPokemonSpriteUrlShiny(dex);
          return;
        }
        if (stage === "gh") {
          img.setAttribute("data-stage", "mirror");
          img.src = getPokemonSpriteUrlShinyMirror(dex);
          return;
        }

        __markShinySpriteFailed(dex);
        img.setAttribute("data-shiny", "0");
        img.setAttribute("data-stage", "local");
        img.onerror = () =>
          globalThis.__kittensSpriteOnError && globalThis.__kittensSpriteOnError(img);
        img.src = getPokemonSpriteUrlLocal(dex);
      } catch {
        // ignore
      }
    };
  }
}

export const renderPokemonIcon = (dex, alt, isShiny = false) => {
  const a = escapeHtml(alt ?? "");
  if (isShiny) {
    const key = `${String(dex ?? "")}@${formatLocalYmd()}`;
    const shinyFailSet = __getShinySpriteFailSet();
    if (shinyFailSet.has(key)) return renderPokemonIcon(dex, alt, false);
    const srcShiny = getPokemonSpriteUrlShinyLocal(dex);
    return `<img class="pk-icon" src="${srcShiny}" data-dex="${escapeHtml(
      String(dex),
    )}" data-shiny="1" data-stage="local" alt="${a}" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="globalThis.__kittensShinySpriteOnError && globalThis.__kittensShinySpriteOnError(this)" />`;
  }

  const key = `${String(dex ?? "")}@${formatLocalYmd()}`;
  const stage0 = __getSpriteStageMap()?.[key] ?? "local";
  const stage = stage0 === "none" ? "none" : stage0 === "mirror" ? "mirror" : stage0 === "gh" ? "gh" : "local";
  if (stage === "none") return "";
  const src =
    stage === "mirror"
      ? getPokemonSpriteUrlMirror(dex)
      : stage === "gh"
        ? getPokemonSpriteUrl(dex)
        : getPokemonSpriteUrlLocal(dex);
  return `<img class="pk-icon" src="${src}" data-dex="${escapeHtml(
    String(dex),
  )}" data-stage="${escapeHtml(stage)}" alt="${a}" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="globalThis.__kittensSpriteOnError && globalThis.__kittensSpriteOnError(this)" />`;
};
