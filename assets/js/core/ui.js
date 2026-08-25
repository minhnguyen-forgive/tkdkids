/* =============================================================
   BỘ GIAO DIỆN DÙNG CHUNG — modal, toast, hộp thoại xác nhận.
   Thay cho 42 lệnh alert()/confirm()/prompt() rải rác trước đây.
   Modal: đóng bằng ESC, click nền, khoá cuộn nền, trả tiêu điểm
   về đúng nút đã mở nó (yêu cầu cơ bản về khả năng tiếp cận).
   ============================================================= */

import { $, $$, esc, el } from './dom.js';

/* ---------------- KHOÁ CUỘN NỀN ---------------- */
let scrollLocks = 0;
function lockScroll() {
  if (scrollLocks++ === 0) {
    document.body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + 'px';
    document.body.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  if (--scrollLocks <= 0) {
    scrollLocks = 0;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

/* ---------------- MODAL ---------------- */
const openModals = [];

export function openModal(idOrEl, { onClose } = {}) {
  const modal = typeof idOrEl === 'string' ? $('#' + idOrEl) : idOrEl;
  if (!modal || modal.classList.contains('active')) return null;

  const entry = { modal, onClose, opener: document.activeElement };
  openModals.push(entry);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  lockScroll();

  // Đưa tiêu điểm vào ô nhập đầu tiên để dùng bàn phím được ngay.
  requestAnimationFrame(() => {
    const first = modal.querySelector('input:not([type=hidden]):not([disabled]), select, textarea, button.btn-save');
    first?.focus();
  });
  return entry;
}

export function closeModal(idOrEl) {
  const modal = typeof idOrEl === 'string' ? $('#' + idOrEl) : idOrEl;
  const idx = openModals.findIndex(e => e.modal === modal);
  if (idx === -1) return;

  const [entry] = openModals.splice(idx, 1);
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  unlockScroll();
  entry.opener?.focus?.();
  entry.onClose?.();
}

export function closeTopModal() {
  const top = openModals[openModals.length - 1];
  if (top) closeModal(top.modal);
}

/** Gắn hành vi chung cho mọi modal: ESC, click nền, nút có [data-close]. */
export function initModals() {
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && openModals.length) { ev.preventDefault(); closeTopModal(); }
  });

  document.addEventListener('mousedown', ev => {
    // Chỉ đóng khi bấm đúng lớp nền, không phải khi bôi đen chữ rồi thả chuột ra ngoài.
    if (ev.target.classList?.contains('modal-overlay') && ev.target.classList.contains('active')) {
      closeModal(ev.target);
    }
  });

  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-close]');
    if (!btn) return;
    const modal = btn.closest('.modal-overlay');
    if (modal) { ev.preventDefault(); closeModal(modal); }
  });
}

/* ---------------- TOAST ---------------- */
const TOAST_ICONS = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };

function toastHost() {
  let host = $('#toastHost');
  if (!host) {
    host = el('div', { id: 'toastHost', class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  return host;
}

export function toast(message, type = 'info', duration = 4000) {
  const node = el('div', { class: `toast toast-${type}` });
  node.innerHTML = `<i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}" aria-hidden="true"></i><span>${esc(message)}</span>`;
  const close = () => {
    node.classList.add('toast-out');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  };
  node.addEventListener('click', close);
  toastHost().append(node);
  if (duration) setTimeout(close, duration);
  return close;
}

export const toastSuccess = (m, d) => toast(m, 'success', d);
export const toastError   = (m, d) => toast(m, 'error', d ?? 6000);
export const toastWarning = (m, d) => toast(m, 'warning', d ?? 5000);

/** Hiển thị lỗi từ callApi đúng ngữ cảnh. */
export function toastApiError(error, fallback = 'Có lỗi xảy ra, vui lòng thử lại.') {
  toastError(error?.message || fallback);
}

/* ---------------- HỘP THOẠI XÁC NHẬN / NHẬP LIỆU ---------------- */
function buildDialog({ title, body, actions }) {
  const overlay = el('div', { class: 'modal-overlay dialog-overlay' });
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:440px" role="dialog" aria-modal="true">
      <div class="modal-header"><div class="modal-title">${esc(title)}</div></div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">${actions}</div>
    </div>`;
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
  lockScroll();
  return overlay;
}

function teardown(overlay, resolve, value) {
  overlay.classList.remove('active');
  unlockScroll();
  setTimeout(() => overlay.remove(), 250);
  resolve(value);
}

/** Thay confirm() — trả Promise<boolean>. */
export function confirmDialog(message, { title = 'Xác nhận', okText = 'Đồng ý', cancelText = 'Huỷ bỏ', danger = false } = {}) {
  return new Promise(resolve => {
    const overlay = buildDialog({
      title,
      body: `<p style="font-size:15px;line-height:1.6;color:var(--text-main)">${esc(message)}</p>`,
      actions: `<button type="button" class="btn-cancel" data-act="cancel">${esc(cancelText)}</button>
                <button type="button" class="${danger ? 'btn-reject' : 'btn-save'}" data-act="ok">${esc(okText)}</button>`,
    });
    overlay.querySelector('[data-act=ok]').focus();
    overlay.addEventListener('click', ev => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act) teardown(overlay, resolve, act === 'ok');
      else if (ev.target === overlay) teardown(overlay, resolve, false);
    });
    overlay.addEventListener('keydown', ev => { if (ev.key === 'Escape') teardown(overlay, resolve, false); });
  });
}

/** Thay prompt() — trả Promise<string|null>. required:true thì không cho gửi rỗng. */
export function promptDialog(message, { title = 'Nhập thông tin', placeholder = '', required = false, multiline = true, okText = 'Xác nhận' } = {}) {
  return new Promise(resolve => {
    const field = multiline
      ? `<textarea id="dlgInput" rows="3" placeholder="${esc(placeholder)}"></textarea>`
      : `<input type="text" id="dlgInput" placeholder="${esc(placeholder)}">`;
    const overlay = buildDialog({
      title,
      body: `<div class="form-group"><label>${esc(message)}${required ? ' *' : ''}</label>${field}
             <div class="validation-msg" id="dlgErr">Trường này là bắt buộc.</div></div>`,
      actions: `<button type="button" class="btn-cancel" data-act="cancel">Huỷ bỏ</button>
                <button type="button" class="btn-save" data-act="ok">${esc(okText)}</button>`,
    });
    const input = overlay.querySelector('#dlgInput');
    const err = overlay.querySelector('#dlgErr');
    requestAnimationFrame(() => input.focus());

    const submit = () => {
      const value = input.value.trim();
      if (required && !value) { err.classList.add('visible'); input.focus(); return; }
      teardown(overlay, resolve, value);
    };
    overlay.addEventListener('click', ev => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') submit();
      else if (act === 'cancel' || ev.target === overlay) teardown(overlay, resolve, null);
    });
    overlay.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') teardown(overlay, resolve, null);
      if (ev.key === 'Enter' && (!multiline || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); submit(); }
    });
  });
}

/* ---------------- TRẠNG THÁI RỖNG / ĐANG TẢI ---------------- */
export const loadingHTML = (text = 'Đang tải...') =>
  `<div class="empty-note"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${esc(text)}</div>`;

export const emptyHTML = (text = 'Chưa có dữ liệu.', icon = 'fa-inbox') =>
  `<div class="empty-note"><i class="fa-solid ${icon}" aria-hidden="true" style="display:block;font-size:28px;opacity:.35;margin-bottom:10px"></i>${esc(text)}</div>`;

export const errorHTML = (text = 'Không tải được dữ liệu.') =>
  `<div class="empty-note" style="color:var(--red)"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> ${esc(text)}</div>`;

/* ---------- HIỆN / ẨN MẬT KHẨU ----------
   Gắn nút con mắt vào mọi ô mật khẩu bên trong `root`. Gọi lại bao nhiêu lần
   cũng được: ô nào đã có nút thì bỏ qua, nên dùng được cả với modal dựng động.

   Lý do cần: mật khẩu tạm do quản trị viên cấp là chuỗi ngẫu nhiên kiểu
   K72md8fp — gõ mù rất dễ sai, mà sai 5 lần là khoá tài khoản 15 phút. */
export function initPasswordEyes(root = document) {
  $$('input[type="password"]', root).forEach(inp => {
    if (inp.dataset.coMat === '1') return;
    inp.dataset.coMat = '1';

    const boc = document.createElement('div');
    boc.className = 'pw-wrap';
    inp.parentNode.insertBefore(boc, inp);
    boc.appendChild(inp);

    const nut = document.createElement('button');
    nut.type = 'button';                 // không thì bấm vào là gửi luôn form
    nut.className = 'pw-eye';
    nut.tabIndex = -1;                   // Tab vẫn nhảy thẳng từ ô này sang ô kia
    const ve = dangAn => {
      nut.innerHTML = `<i class="fa-solid ${dangAn ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>`;
      nut.setAttribute('aria-label', dangAn ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
      nut.setAttribute('aria-pressed', String(!dangAn));
      nut.title = dangAn ? 'Hiện mật khẩu' : 'Ẩn mật khẩu';
    };
    ve(true);

    nut.addEventListener('click', () => {
      const dangAn = inp.type === 'password';
      inp.type = dangAn ? 'text' : 'password';
      ve(!dangAn);
      inp.focus();
      // Con trỏ về cuối chuỗi thay vì nhảy về đầu khi đổi type
      const n = inp.value.length;
      try { inp.setSelectionRange(n, n); } catch (e) {}
    });

    boc.appendChild(nut);
  });
}

/* ---------- ENTER ĐỂ GỬI FORM ----------
   Gõ xong bấm Enter là gửi, không bắt rê chuột xuống nút. Trình duyệt lẽ ra
   tự làm, nhưng đo thực tế thì không phải ô nào cũng ăn, nên làm cho chắc.

   Bỏ qua textarea (Enter ở đó là xuống dòng) và các ô nút/chọn tệp. */
export function initEnterSubmit(root = document) {
  root.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || ev.isComposing || ev.defaultPrevented) return;
    if (ev.shiftKey || ev.altKey) return;
    const o = ev.target;
    if (!o || o.tagName !== 'INPUT') return;
    const kieu = String(o.type || '').toLowerCase();
    if (['submit', 'button', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(kieu)) return;
    const form = o.form || o.closest('form');
    if (!form) return;
    ev.preventDefault();
    form.requestSubmit();
  });
}
