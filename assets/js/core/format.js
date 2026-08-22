/* =============================================================
   ĐỊNH DẠNG — ngày tháng, tiền tệ, số điện thoại.
   Chuẩn nội bộ: ngày lưu dạng ISO 'YYYY-MM-DD', hiển thị 'DD/MM/YYYY'.
   ============================================================= */

/** Date → 'YYYY-MM-DD' theo giờ địa phương (KHÔNG dùng toISOString vì lệch múi giờ). */
export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date)) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → Date lúc 00:00 giờ địa phương. */
export function fromISODate(s) {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? null : d;
}

/** 'YYYY-MM-DD' → '25/12/2026' */
export function formatDate(s) {
  if (!s) return '—';
  const parts = String(s).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(s);
}

/** Khoảng ngày: '01/07 → 05/07/2026' */
export function formatDateRange(from, to) {
  return `${formatDate(from)} → ${formatDate(to)}`;
}

/** Thứ trong tuần tiếng Việt. */
export function weekdayLabel(dateOrISO) {
  const d = dateOrISO instanceof Date ? dateOrISO : fromISODate(dateOrISO);
  if (!d) return '';
  return ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
}

/** Tuổi tính theo ngày sinh, chính xác tới ngày. */
export function calcAge(dobISO) {
  const dob = fromISODate(dobISO);
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

/** '15 tuổi (25/12/2010)' */
export function formatDob(dobISO) {
  if (!dobISO) return '—';
  const age = calcAge(dobISO);
  return age === null ? formatDate(dobISO) : `${age} tuổi (${formatDate(dobISO)})`;
}

/** Thứ Hai của tuần chứa ngày d, dạng 'YYYY-MM-DD'. */
export function getMonday(d) {
  const date = d instanceof Date ? new Date(d) : fromISODate(d) || new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toISODate(date);
}

/** 'Tuần: 20/07 - 26/07/2026' */
export function formatWeekLabel(mondayISO) {
  const start = fromISODate(mondayISO);
  if (!start) return 'Tuần: —';
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const f = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Tuần: ${f(start)} - ${f(end)}/${end.getFullYear()}`;
}

export const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                            'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

/** 1500000 → '1.500.000 đ' */
export function formatMoney(n) {
  const num = Number(n);
  return (isNaN(num) ? 0 : num).toLocaleString('vi-VN') + ' đ';
}

/** 1500000 → '1.500.000' (không kèm đơn vị) */
export function formatNumber(n) {
  const num = Number(n);
  return (isNaN(num) ? 0 : num).toLocaleString('vi-VN');
}

/** '0978931747' → '097 893 1747' */
export function formatPhone(p) {
  const digits = String(p || '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(p || '');
}

/* ---------- KIỂM TRA DỮ LIỆU ---------- */

/** SĐT di động Việt Nam: 10 số, bắt đầu 03/05/07/08/09. Chấp nhận cả +84. */
export function isValidPhone(p) {
  const digits = String(p || '').replace(/\D/g, '').replace(/^84/, '0');
  return /^0(3|5|7|8|9)\d{8}$/.test(digits);
}

export function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').replace(/^84/, '0');
}

export function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(e || '').trim());
}

/** Mật khẩu: tối thiểu 6 ký tự, chỉ chữ và số, có ít nhất 1 chữ hoa VÀ 1 chữ số. */
export function isValidPassword(p) {
  const s = String(p || '');
  return /^[A-Za-z0-9]{6,}$/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s);
}

/** BMI + phân loại theo chuẩn WHO cho trẻ em (tham khảo, không thay thế y tế). */
export function calcBMI(heightCm, weightKg) {
  const h = Number(heightCm) / 100, w = Number(weightKg);
  if (!h || !w || h <= 0) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}
