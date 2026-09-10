/** Draw a downloadable shiny gallery share card. Browser-only; Node tests use shinyShareCardPayload. */

export function drawShinyShareCard(payload) {
  if (typeof document === "undefined") return null;
  const unique = Math.max(0, Math.floor(payload?.unique || 0));
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  if (unique <= 0 || entries.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("闪光馆", 32, 56);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${unique} 只独特闪光 — 宝可梦放置冒险`, 32, 92);
  ctx.font = "18px sans-serif";
  entries.slice(0, 8).forEach((e, i) => {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.7)";
    ctx.fillText(String(e?.name || ""), 32, 140 + i * 26);
  });
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function downloadDataUrl(dataUrl, filename = "kittens-shiny-gallery.png") {
  if (typeof document === "undefined" || !dataUrl) return false;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
