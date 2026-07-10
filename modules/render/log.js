export function createRenderLog({ elLog, escapeHtml, getState }) {
  let lastLines = [];
  let nodes = [];

  const rebuild = (lines) => {
    if (!elLog) return;
    elLog.innerHTML = "";
    nodes = [];
    const frag = document.createDocumentFragment();
    for (const line of lines) {
      const row = document.createElement("div");
      row.textContent = line;
      frag.append(row);
      nodes.push(row);
    }
    elLog.append(frag);
    lastLines = lines.slice();
  };

  return function renderLog() {
    if (!elLog) return;
    const state = getState();
    const lines = Array.isArray(state.log) ? state.log : [];
    if (lines.length !== lastLines.length || nodes.length !== lastLines.length) {
      rebuild(lines);
      return;
    }

    let changed = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (lastLines[i] !== line) {
        nodes[i].textContent = line;
        lastLines[i] = line;
        changed = true;
      }
    }

    if (!changed && typeof escapeHtml === "function") {
      return;
    }
  };
}
