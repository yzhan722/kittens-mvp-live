const SAVE_OBF_PREFIX = "KMP1:";
const SAVE_OBF_KEY = "KMP_SAVE";

function xorBytes(bytes) {
  const klen = SAVE_OBF_KEY.length;
  if (klen <= 0) return bytes;
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = bytes[i] ^ SAVE_OBF_KEY.charCodeAt(i % klen);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode(...sub);
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSaveText(rawJson) {
  const bytes = new TextEncoder().encode(String(rawJson ?? ""));
  xorBytes(bytes);
  return `${SAVE_OBF_PREFIX}${bytesToBase64(bytes)}`;
}

export function decodeSaveText(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  if (!t.startsWith(SAVE_OBF_PREFIX)) return t;
  const b64 = t.slice(SAVE_OBF_PREFIX.length).trim();
  if (!b64) return "";
  try {
    const bytes = base64ToBytes(b64);
    xorBytes(bytes);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}
