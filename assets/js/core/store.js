/* =============================================================
   PHIÊN ĐĂNG NHẬP & TRẠNG THÁI ỨNG DỤNG
   Sửa lỗi cũ: đăng xuất trước đây chỉ xoá currentUser, để sót
   lịch dạy / ghi chú / sự kiện của người trước → rò sang người sau.
   Ở đây mọi trạng thái nằm chung một chỗ và bị xoá sạch khi đăng xuất.
   ============================================================= */

import { normalizeRole } from './config.js';

const SESSION_KEY = 'tkd.session.v1';

/** Trạng thái tạm trong phiên làm việc — luôn bị xoá khi đăng xuất. */
const initialState = () => ({
  scheduleByWeek: {},
  allSchedules: [],
  calendarNotes: {},
  commonEvents: [],
  students: [],
  cache: {},
});

export const state = initialState();

let session = null;

/** Đọc phiên từ sessionStorage (F5 không mất đăng nhập, đóng tab là hết). */
export function loadSession() {
  if (session) return session;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch { session = null; }
  return session;
}

export function saveSession(user) {
  session = { ...user, role: normalizeRole(user.role || user.vaiTro) };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}

/** Cập nhật vài trường của người dùng đang đăng nhập (VD sau khi sửa hồ sơ). */
export function patchSession(patch) {
  if (!session) return null;
  session = { ...session, ...patch };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}

export const currentUser = () => loadSession();
export const currentRole = () => loadSession()?.role || null;
export const isLoggedIn  = () => !!loadSession();

/** Xoá sạch phiên VÀ toàn bộ trạng thái tạm. */
export function clearSession() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  Object.assign(state, initialState());
}
