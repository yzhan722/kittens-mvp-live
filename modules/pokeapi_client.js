const DEFAULT_POKEAPI_CACHE_KEY = "kittens_mvp_pokeapi_cache_v1";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createPokeApiClient(options = {}) {
  const cacheKey =
    typeof options.cacheKey === "string" && options.cacheKey.trim() ? options.cacheKey.trim() : DEFAULT_POKEAPI_CACHE_KEY;
  const onUpdate = typeof options.onUpdate === "function" ? options.onUpdate : null;

  let cache = null;
  const inFlight = {};

  function loadCache() {
    if (cache) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      const data = raw ? safeJsonParse(raw) : null;
      cache = data && typeof data === "object" ? data : {};
    } catch {
      cache = {};
    }
  }

  function saveCache() {
    try {
      if (!cache) return;
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch {
      // ignore
    }
  }

  function getPokeApiDataByDex(dex) {
    if (typeof dex !== "number" || !Number.isFinite(dex)) return null;
    const d = Math.floor(dex);
    if (d <= 0) return null;

    loadCache();
    const hit = cache?.[d];
    if (hit && typeof hit === "object") return hit;
    if (inFlight[d]) return null;

    inFlight[d] = true;
    fetch(`https://pokeapi.co/api/v2/pokemon/${d}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => {
        if (!j || typeof j !== "object") return;
        const types = Array.isArray(j.types)
          ? [...j.types]
              .sort((a, b) => (a?.slot ?? 0) - (b?.slot ?? 0))
              .map((t) => t?.type?.name)
              .filter((x) => typeof x === "string" && x)
          : [];

        const baseStats = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
        if (Array.isArray(j.stats)) {
          for (const s of j.stats) {
            const name = s?.stat?.name;
            const v = s?.base_stat;
            if (typeof v !== "number" || !Number.isFinite(v)) continue;
            if (name === "hp") baseStats.hp = Math.floor(v);
            else if (name === "attack") baseStats.atk = Math.floor(v);
            else if (name === "defense") baseStats.def = Math.floor(v);
            else if (name === "special-attack") baseStats.spa = Math.floor(v);
            else if (name === "special-defense") baseStats.spd = Math.floor(v);
            else if (name === "speed") baseStats.spe = Math.floor(v);
          }
        }

        cache[d] = { types, baseStats };
        saveCache();
        onUpdate?.(d);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        delete inFlight[d];
      });

    return null;
  }

  return { getPokeApiDataByDex };
}
