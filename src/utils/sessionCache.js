import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = '@recent_sessions';
const DATA_PREFIX = '@session_data_';
const MAX_RECENT = 10;

export async function saveSession(session) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s.id === session.id);
    const entry = { id: session.id, name: session.name, shortCode: session.shortCode, lastAccessed: Date.now() };
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    list.unshift(entry);
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

export async function getRecentSessions() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearRecentSessions() {
  try { await AsyncStorage.removeItem(RECENT_KEY); } catch {}
}

export async function saveSessionData(sessionId, data) {
  try {
    await AsyncStorage.setItem(DATA_PREFIX + sessionId, JSON.stringify(data));
  } catch {}
}

export async function getSessionData(sessionId) {
  try {
    const raw = await AsyncStorage.getItem(DATA_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearSessionData(sessionId) {
  try { await AsyncStorage.removeItem(DATA_PREFIX + sessionId); } catch {}
}
