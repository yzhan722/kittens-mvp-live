/** Shared catch-ball multipliers for throw + UI preview. */
export function ballCatchMult(ballType, { types = null, caughtCount = 0, hour = new Date().getHours() } = {}) {
  if (ballType === "ultraball") return 2;
  if (ballType === "quickball") return caughtCount === 0 ? 5 : 1;
  if (ballType === "luxuryball") return 1;
  if (ballType === "netball") {
    const list = Array.isArray(types) ? types : [];
    for (const t of list) {
      const x = String(t || "").toLowerCase();
      if (x === "bug" || x === "water" || x === "grass") return 3;
    }
    return 1;
  }
  if (ballType === "duskball") {
    const h = typeof hour === "number" && Number.isFinite(hour) ? hour : new Date().getHours();
    return h >= 18 || h < 6 ? 3 : 1.2;
  }
  return 1;
}
