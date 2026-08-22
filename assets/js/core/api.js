/* =============================================================
   LỚP GIAO TIẾP MÁY CHỦ
   Toàn bộ hệ thống chỉ nói chuyện với backend qua file này.
   Sau này đổi nền tảng (Supabase, server riêng...) chỉ sửa ở đây.
   ============================================================= */

import { API_URL } from './config.js';

/** Lỗi có phân loại, để chỗ gọi biết nên hiện thông báo gì. */
export class ApiError extends Error {
  constructor(message, { kind = 'server', code = '', data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;   // 'network' | 'timeout' | 'server' | 'business'
    this.code = code;   // mã nghiệp vụ, VD 'GPS_OUT_OF_RANGE'
    this.data = data;   // toàn bộ payload để chỗ gọi tự xử lý
  }
}

const DEFAULT_TIMEOUT = 30000;

/**
 * Gọi một action của backend.
 * @param {string} action  tên action, VD 'login', 'dangKyTuVan'
 * @param {object} params  tham số; object/array tự động chuyển JSON
 * @returns {Promise<object>} phần dữ liệu khi status === 'success'
 * @throws  {ApiError}
 */
export async function callApi(action, params = {}, { timeout = DEFAULT_TIMEOUT } = {}) {
  const body = new URLSearchParams();
  body.append('action', action);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(API_URL, { method: 'POST', body, signal: controller.signal });
  } catch (err) {
    throw new ApiError(
      err.name === 'AbortError'
        ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
        : 'Không kết nối được máy chủ. Kiểm tra đường truyền và thử lại.',
      { kind: err.name === 'AbortError' ? 'timeout' : 'network' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ApiError(`Máy chủ báo lỗi (HTTP ${res.status}). Vui lòng thử lại sau.`, { kind: 'server' });
  }

  let json;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    // Apps Script trả HTML khi script lỗi hoặc chưa cấp quyền truy cập.
    throw new ApiError(
      'Máy chủ trả về dữ liệu không hợp lệ. Nhiều khả năng Apps Script chưa được deploy đúng quyền "Anyone".',
      { kind: 'server', data: text.slice(0, 300) }
    );
  }

  if (json.status !== 'success') {
    throw new ApiError(json.message || 'Thao tác không thành công.', {
      kind: 'business',
      code: json.code || '',
      data: json,
    });
  }

  return json;
}

/** Gọi API nhưng không ném lỗi — trả { ok, data, error } để hiển thị trạng thái rỗng. */
export async function tryApi(action, params, options) {
  try {
    return { ok: true, data: await callApi(action, params, options), error: null };
  } catch (error) {
    return { ok: false, data: null, error };
  }
}
