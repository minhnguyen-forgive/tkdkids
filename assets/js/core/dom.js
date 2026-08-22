/* =============================================================
   TIỆN ÍCH DOM — mọi thao tác DOM đi qua đây.
   Quan trọng: KHÔNG BAO GIỜ chèn dữ liệu từ server vào HTML
   mà không bọc qua esc(). Đây là hàng rào chống XSS của hệ thống.
   ============================================================= */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape dữ liệu trước khi đưa vào HTML. Dùng cho MỌI giá trị từ server/người dùng. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}

/** Escape để nhét an toàn vào thuộc tính JS inline, VD onclick="f('...')". */
export function escAttr(value) {
  return esc(value).replace(/\n/g, '&#10;');
}

/**
 * Template literal tự động escape mọi biến chèn vào.
 *   html`<div>${tenNguoiDung}</div>`   → an toàn
 * Muốn chèn HTML đã dựng sẵn (đã escape bên trong) thì dùng raw().
 */
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i === 0) return str;
    const v = values[i - 1];
    const safe = v && v.__raw ? v.value : Array.isArray(v) ? v.map(x => (x && x.__raw ? x.value : esc(x))).join('') : esc(v);
    return out + safe + str;
  }, '');
}

/** Đánh dấu một chuỗi là HTML đã an toàn, để html`` không escape lần nữa. */
export const raw = value => ({ __raw: true, value: value ?? '' });

/** Gán HTML vào một phần tử (thay cho innerHTML rải rác khắp nơi). */
export function setHTML(elOrSel, markup) {
  const el = typeof elOrSel === 'string' ? $(elOrSel) : elOrSel;
  if (el) el.innerHTML = markup;
  return el;
}

/** Tạo phần tử: el('div', {class:'x', onclick:fn}, [con1, 'text']) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Bật/tắt trạng thái đang xử lý của nút bấm, tự khôi phục nội dung cũ. */
export function busy(btnOrSel, label = 'ĐANG XỬ LÝ...') {
  const btn = typeof btnOrSel === 'string' ? $(btnOrSel) : btnOrSel;
  if (!btn) return () => {};
  const original = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${esc(label)}`;
  btn.disabled = true;
  return () => { btn.innerHTML = original; btn.disabled = false; };
}

/** Uỷ quyền sự kiện: on(document, 'click', '.nut', handler) */
export function on(root, type, selector, handler) {
  root.addEventListener(type, ev => {
    const target = ev.target.closest(selector);
    if (target && root.contains(target)) handler(ev, target);
  });
}

export const show = elOrSel => { const e = typeof elOrSel === 'string' ? $(elOrSel) : elOrSel; if (e) e.style.display = ''; };
export const hide = elOrSel => { const e = typeof elOrSel === 'string' ? $(elOrSel) : elOrSel; if (e) e.style.display = 'none'; };
