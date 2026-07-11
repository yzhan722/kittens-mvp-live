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

  // Wired slots: 0=autosave, 1=optional manual key. API accepts 0–3; 2–3 unused.
  async function syncAll() {
    lastSyncStatus = "syncing";
    lastSyncError = null;

    try {
      backupOnce();
      const meta = await getMeta();
      const items = [
        { slot: 0, key: autosaveKey },
        { slot: 1, key: slotKeys[0] },
        { slot: 2, key: slotKeys[1] },
        { slot: 3, key: slotKeys[2] },
      ];

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
                hasConflict = true;
                lastSyncError = `存档槽 ${it.slot} 冲突，已改拉远端`;
                await pullSlot(it.slot, it.key);
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
              hasConflict = true;
              lastSyncError = `存档槽 ${it.slot} 冲突，已改拉远端`;
              await pullSlot(it.slot, it.key);
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
  };
}
