function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function nowMs() {
  return Date.now();
}

function clampStr(v, maxLen) {
  const s = typeof v === "string" ? v : String(v ?? "");
  return s.trim().slice(0, maxLen);
}

function keyPart(v) {
  return encodeURIComponent(clampStr(v, 64) || "");
}

export function createCloudSave({
  encodeSaveText,
  decodeSaveText,
  autosaveKey,
  slotKeys,
  applyAutosaveRaw,
  refreshSaveUI,
}) {
  const TOKEN_KEY = "kittens_mvp_cloud_token_v1";
  const USER_KEY = "kittens_mvp_cloud_user_v1";

  let syncTimer = 0;
  let lastPushedAutosaveAt = 0;

  // 同步状态跟踪
  let lastSyncStatus = "idle"; // idle | syncing | success | partial | error
  let lastSyncError = null;
  let lastSyncTime = 0;

  function getSyncStatus() {
    return {
      status: lastSyncStatus,
      error: lastSyncError,
      lastSyncTime,
      lastPushedAutosaveAt,
    };
  }

  function getToken() {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      return t ? String(t) : "";
    } catch {
      return "";
    }
  }

  function setToken(token, username) {
    try {
      localStorage.setItem(TOKEN_KEY, String(token || ""));
      localStorage.setItem(USER_KEY, String(username || ""));
    } catch {}
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  }

  function getUsername() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? String(u) : "";
    } catch {
      return "";
    }
  }

  async function apiFetch(path, { method = "GET", body = null } = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : null });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errMsg = data && typeof data.error === "string" ? data.error : `http ${res.status}`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.data = data;
      if (res.status === 401) clearToken();
      throw err;
    }

    return data;
  }

  async function register(username, password) {
    const data = await apiFetch("/api/auth/register", { method: "POST", body: { username, password } });
    if (!data || !data.token) throw new Error("bad response");
    setToken(data.token, data.username || username);
    return data;
  }

  async function login(username, password) {
    const data = await apiFetch("/api/auth/login", { method: "POST", body: { username, password } });
    if (!data || !data.token) throw new Error("bad response");
    setToken(data.token, data.username || username);
    return data;
  }

  async function logout() {
    const token = getToken();
    if (token) {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {}
    }
    stopAutoSync();
    clearToken();
    try {
      await refreshSlotPanel();
    } catch {}
  }

  function localEncoded(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function localPlayMs(key) {
    try {
      const enc = localEncoded(key);
      if (!enc) return 0;
      const raw = decodeSaveText(enc);
      const data = safeJsonParse(raw);
      const t = data && typeof data.totalPlayMs === "number" ? data.totalPlayMs : 0;
      return Number.isFinite(t) ? Math.max(0, Math.floor(t)) : 0;
    } catch {
      return 0;
    }
  }

  function localUpdatedAt(key) {
    try {
      const enc = localEncoded(key);
      if (!enc) return 0;
      const raw = decodeSaveText(enc);
      const data = safeJsonParse(raw);
      const t = data && typeof data.t === "number" ? data.t : 0;
      return Number.isFinite(t) ? Math.floor(t) : 0;
    } catch {
      return 0;
    }
  }

  function localRawJson(key) {
    try {
      const enc = localEncoded(key);
      if (!enc) return null;
      const raw = decodeSaveText(enc);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocalEncoded(key, rawJson) {
    const enc = encodeSaveText(rawJson);
    localStorage.setItem(key, enc);
  }

  function backupOnce() {
    const username = getUsername();
    const markKey = `kittens_mvp_cloud_backup_done_v1_${keyPart(username)}`;
    try {
      const done = localStorage.getItem(markKey);
      if (done) return;
    } catch {
      return;
    }

    const ts = nowMs();
    const keys = [autosaveKey, ...slotKeys];
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (!v) continue;
        localStorage.setItem(`${k}_legacy_backup_${ts}`, v);
      } catch {}
    }

    try {
      localStorage.setItem(markKey, String(ts));
    } catch {}
  }

  async function getMeta() {
    const data = await apiFetch("/api/save/meta");
    const m = new Map();
    const slots = data && Array.isArray(data.slots) ? data.slots : [];
    for (const it of slots) {
      const s = typeof it.slot === "number" ? it.slot : Number(it.slot || 0);
      const t = typeof it.updatedAt === "number" ? it.updatedAt : Number(it.updatedAt || 0);
      if (Number.isFinite(s) && Number.isFinite(t)) m.set(s, Math.max(0, Math.floor(t)));
    }
    return m;
  }

  async function fetchSlotJson(slot) {
    const data = await apiFetch(`/api/save?slot=${slot}`);
    const saveJson = data && typeof data.saveJson === "string" ? data.saveJson : "";
    if (!saveJson) return null;
    try {
      return JSON.parse(saveJson);
    } catch {
      return null;
    }
  }

  async function pullSlot(slot, key) {
    const data = await apiFetch(`/api/save?slot=${slot}`);
    const saveJson = data && typeof data.saveJson === "string" ? data.saveJson : "";
    const updatedAt = data && typeof data.updatedAt === "number" ? data.updatedAt : Number(data.updatedAt || 0);
    if (!saveJson) return { applied: false, updatedAt: 0 };

    writeLocalEncoded(key, saveJson);
    if (slot === 0 && typeof applyAutosaveRaw === "function") {
      try {
        applyAutosaveRaw(saveJson);
      } catch {}
    }
    if (typeof refreshSaveUI === "function") {
      try {
        refreshSaveUI();
      } catch {}
    }
    return { applied: true, updatedAt: Math.max(0, Math.floor(updatedAt)) };
  }

  async function pushSlot(slot, key) {
    const raw = localRawJson(key);
    if (!raw) return { applied: false, updatedAt: 0 };
    const t = localUpdatedAt(key);
    if (t <= 0) return { applied: false, updatedAt: 0 };

    try {
      const data = await apiFetch(`/api/save?slot=${slot}`, { method: "PUT", body: { saveJson: raw, updatedAt: t } });
      const applied = !!(data && data.applied);
      return { applied, updatedAt: t };
    } catch (e) {
      if (e && e.status === 409) {
        return { applied: false, updatedAt: t, conflict: true, remoteAt: e.data?.updatedAt };
      }
      throw e;
    }
  }

  const SLOT_LABELS = { 0: "自动存档", 1: "手动存档 1", 2: "手动存档 2" };

  function wiredSlots() {
    const items = [{ slot: 0, key: autosaveKey, label: SLOT_LABELS[0] }];
    if (slotKeys[0]) items.push({ slot: 1, key: slotKeys[0], label: SLOT_LABELS[1] });
    if (slotKeys[1]) items.push({ slot: 2, key: slotKeys[1], label: SLOT_LABELS[2] });
    return items;
  }

  function slotItem(slot) {
    return wiredSlots().find((it) => it.slot === slot) || null;
  }

  function formatTs(t) {
    if (!t || t <= 0) return "—";
    try {
      return new Date(t).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(t);
    }
  }

  async function forcePushSlot(slot, key, remoteAt) {
    const raw = localRawJson(key);
    if (!raw) return { applied: false };
    const bumped = Math.max((Number(remoteAt) || 0) + 1, nowMs());
    const data = safeJsonParse(raw);
    if (!data) return { applied: false };
    data.t = bumped;
    const newRaw = JSON.stringify(data);
    writeLocalEncoded(key, newRaw);
    try {
      const res = await apiFetch(`/api/save?slot=${slot}`, { method: "PUT", body: { saveJson: newRaw, updatedAt: bumped } });
      return { applied: !!(res && res.applied), updatedAt: bumped };
    } catch (e) {
      if (e && e.status === 409) {
        return { applied: false, conflict: true, remoteAt: e.data?.updatedAt };
      }
      throw e;
    }
  }

  let panelHooks = { setStatus: null, refreshGame: null };
  let slotPanelWired = false;

  function showConflictModal({ slot, localAt, remoteAt }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("cloudConflictOverlay");
      const desc = document.getElementById("cloudConflictDesc");
      const btnLocal = document.getElementById("btnConflictKeepLocal");
      const btnServer = document.getElementById("btnConflictKeepServer");
      const btnCancel = document.getElementById("btnConflictCancel");
      if (!overlay || !desc) {
        resolve("cancel");
        return;
      }
      const label = SLOT_LABELS[slot] ?? `槽位 ${slot}`;
      desc.textContent = `${label}：本地 ${formatTs(localAt)}，云端 ${formatTs(remoteAt)}。选择要保留的版本。`;
      const done = (choice) => {
        overlay.hidden = true;
        btnLocal?.removeEventListener("click", onLocal);
        btnServer?.removeEventListener("click", onServer);
        btnCancel?.removeEventListener("click", onCancel);
        resolve(choice);
      };
      const onLocal = () => done("local");
      const onServer = () => done("server");
      const onCancel = () => done("cancel");
      btnLocal?.addEventListener("click", onLocal);
      btnServer?.addEventListener("click", onServer);
      btnCancel?.addEventListener("click", onCancel);
      overlay.hidden = false;
    });
  }

  async function handleConflict(slot, key, remoteAt) {
    const choice = await showConflictModal({ slot, localAt: localUpdatedAt(key), remoteAt: remoteAt || 0 });
    if (choice === "server") {
      await pullSlot(slot, key);
      if (slot === 0 && typeof panelHooks.refreshGame === "function") panelHooks.refreshGame();
      return true;
    }
    if (choice === "local") {
      const pushed = await forcePushSlot(slot, key, remoteAt || 0);
      if (pushed.conflict) return handleConflict(slot, key, pushed.remoteAt);
      if (slot === 0 && pushed.applied) lastPushedAutosaveAt = localUpdatedAt(key);
      return !!pushed.applied;
    }
    return false;
  }

  async function refreshSlotPanel() {
    const panel = document.getElementById("cloudSlotPanel");
    const list = document.getElementById("cloudSlotList");
    if (!panel || !list) return;
    if (!getToken()) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    let meta = new Map();
    try {
      meta = await getMeta();
    } catch {}
    list.innerHTML = wiredSlots()
      .map((it) => {
        const localT = localUpdatedAt(it.key);
        const remoteT = meta.get(it.slot) || 0;
        const hasLocal = !!localEncoded(it.key);
        return `<div class="row" data-cloud-slot="${it.slot}">
        <div class="row__left">
          <div class="row__title">${it.label}（槽 ${it.slot}）</div>
          <div class="row__desc muted">本地 ${hasLocal ? formatTs(localT) : "无"} · 云端 ${remoteT ? formatTs(remoteT) : "无"}</div>
        </div>
        <div class="row__right actions">
          <button class="btn btn--small" type="button" data-cloud-pull="${it.slot}">拉取</button>
          <button class="btn btn--small" type="button" data-cloud-push="${it.slot}">上传</button>
        </div>
      </div>`;
      })
      .join("");
  }

  function installCloudPanelUI({ setStatus, refreshGame } = {}) {
    panelHooks = { setStatus, refreshGame };
    const list = document.getElementById("cloudSlotList");
    if (!list || slotPanelWired) return;
    slotPanelWired = true;
    // ponytail: no email infra — recovery is admin contact + local export only; do not fake 2FA/reset links
    list.addEventListener("click", async (ev) => {
      const pull = ev.target?.closest?.("[data-cloud-pull]");
      const push = ev.target?.closest?.("[data-cloud-push]");
      const slot = Number(pull?.getAttribute("data-cloud-pull") || push?.getAttribute("data-cloud-push"));
      if (!Number.isFinite(slot)) return;
      const it = slotItem(slot);
      if (!it || !getToken()) return;
      const say = (t) => {
        if (typeof panelHooks.setStatus === "function") panelHooks.setStatus(t);
      };
      try {
        if (pull) {
          say(`拉取槽 ${slot}…`);
          await pullSlot(slot, it.key);
          if (slot === 0 && typeof panelHooks.refreshGame === "function") panelHooks.refreshGame();
          say(`已拉取 ${it.label}`);
        } else if (push) {
          say(`上传槽 ${slot}…`);
          const pushed = await pushSlot(slot, it.key);
          if (pushed.conflict) {
            const ok = await handleConflict(slot, it.key, pushed.remoteAt);
            say(ok ? `已解决冲突并上传 ${it.label}` : `槽 ${slot} 冲突已取消`);
          } else if (pushed.applied) {
            if (slot === 0) lastPushedAutosaveAt = localUpdatedAt(it.key);
            say(`已上传 ${it.label}`);
          } else {
            say(`槽 ${slot} 无本地存档可上传`);
          }
        }
        await refreshSlotPanel();
      } catch (e) {
        say(`操作失败：${e?.message || "unknown"}`);
      }
    });
    refreshSlotPanel();
  }

  // Wired slots: 0=autosave, 1=manual; slot 2 if second key; API slot 3 reserved.
  async function syncAll() {
    lastSyncStatus = "syncing";
    lastSyncError = null;

    try {
      backupOnce();
      const meta = await getMeta();
      const items = wiredSlots();

      let hasConflict = false;

      for (const it of items) {
        if (!it.key) continue;
        const localT = localUpdatedAt(it.key);
        const localPlay = localPlayMs(it.key);
        const remoteT = meta.get(it.slot) || 0;

        if (remoteT > localT) {
          try {
            const remoteData = await fetchSlotJson(it.slot);
            if (!remoteData) {
              hasConflict = true;
              lastSyncError = `存档槽 ${it.slot} 远端数据解析失败`;
              continue;
            }
            const remotePlay = typeof remoteData.totalPlayMs === "number" ? remoteData.totalPlayMs : 0;
            if (remotePlay >= localPlay) {
              await pullSlot(it.slot, it.key);
            } else {
              const pushed = await pushSlot(it.slot, it.key);
              if (pushed.conflict) {
                const ok = await handleConflict(it.slot, it.key, pushed.remoteAt);
                if (!ok) {
                  hasConflict = true;
                  lastSyncError = `存档槽 ${it.slot} 冲突（已取消）`;
                } else if (it.slot === 0) {
                  lastPushedAutosaveAt = localUpdatedAt(it.key);
                }
              } else if (it.slot === 0 && pushed.applied) {
                lastPushedAutosaveAt = localT;
              }
            }
          } catch (e) {
            hasConflict = true;
            lastSyncError = `存档槽 ${it.slot} 同步失败: ${e.message}`;
          }
        } else if (localT > remoteT) {
          try {
            const pushed = await pushSlot(it.slot, it.key);
            if (pushed.conflict) {
              const ok = await handleConflict(it.slot, it.key, pushed.remoteAt);
              if (!ok) {
                hasConflict = true;
                lastSyncError = `存档槽 ${it.slot} 冲突（已取消）`;
              } else if (it.slot === 0) {
                lastPushedAutosaveAt = localUpdatedAt(it.key);
              }
            } else if (it.slot === 0 && pushed.applied) {
              lastPushedAutosaveAt = localT;
            }
          } catch (e) {
            hasConflict = true;
            lastSyncError = `存档槽 ${it.slot} 推送失败: ${e.message}`;
          }
        }
      }

      lastSyncStatus = hasConflict ? "partial" : "success";
      lastSyncTime = nowMs();
      try {
        await refreshSlotPanel();
      } catch {}
    } catch (e) {
      lastSyncStatus = "error";
      lastSyncError = e.message || "同步失败";
    }
  }

  /** Flush autosave on hide/close. keepalive so the request can outlive the page. */
  async function pushAutosaveFlush() {
    const token = getToken();
    if (!token) return { applied: false };
    const raw = localRawJson(autosaveKey);
    const t = localUpdatedAt(autosaveKey);
    if (!raw || t <= 0 || t <= lastPushedAutosaveAt) return { applied: false };
    try {
      const res = await fetch(`/api/save?slot=0`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ saveJson: raw, updatedAt: t }),
        keepalive: true,
      });
      if (res.status === 401) {
        clearToken();
        return { applied: false };
      }
      if (res.ok) {
        lastPushedAutosaveAt = t;
        return { applied: true };
      }
      return { applied: false };
    } catch {
      return { applied: false };
    }
  }

  function startAutoSync() {
    stopAutoSync();
    syncTimer = window.setInterval(async () => {
      try {
        const token = getToken();
        if (!token) return;
        const t = localUpdatedAt(autosaveKey);
        if (t > 0 && t > lastPushedAutosaveAt) {
          const pushed = await pushSlot(0, autosaveKey);
          if (pushed.applied) lastPushedAutosaveAt = t;
        }
      } catch {}
    }, 30000);
  }

  function stopAutoSync() {
    if (syncTimer) {
      try {
        window.clearInterval(syncTimer);
      } catch {}
    }
    syncTimer = 0;
  }

  let lifecycleInstalled = false;
  function installLifecycleFlush() {
    if (lifecycleInstalled || typeof window === "undefined") return;
    lifecycleInstalled = true;
    const flush = () => {
      try {
        pushAutosaveFlush();
      } catch {}
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);
  }

  return {
    getToken,
    getUsername,
    register,
    login,
    logout,
    syncAll,
    startAutoSync,
    stopAutoSync,
    getSyncStatus,
    pushAutosaveFlush,
    installLifecycleFlush,
    installCloudPanelUI,
    refreshSlotPanel,
    wiredSlots,
  };
}
