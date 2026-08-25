/* =============================================================
   KHỞI ĐỘNG HỆ QUẢN TRỊ
   - Chặn truy cập khi chưa đăng nhập
   - Dựng thanh trên theo vai trò
   - Điều hướng sang giao diện phù hợp
   ============================================================= */

import { $, $$, esc, setHTML } from '../core/dom.js';
import { initModals, initPasswordEyes, initEnterSubmit, toast } from '../core/ui.js';
import { currentUser, clearSession } from '../core/store.js';
import { ROLE_LABELS, findBranch } from '../core/config.js';
import { renderStaffDashboard } from './staff.js';
import { renderParentDashboard } from './parent.js';

/* ---------- Chuyển tab trong modal (dùng chung mọi modal) ---------- */
function initModalTabs() {
  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-mtab], [data-aptab], [data-apatab]');
    if (!btn) return;
    const attr = btn.dataset.mtab ? 'mtab' : btn.dataset.aptab ? 'aptab' : 'apatab';
    const panelAttr = { mtab: 'mpanel', aptab: 'appanel', apatab: 'apapanel' }[attr];
    const modal = btn.closest('.modal-overlay');
    const value = btn.dataset[attr];

    modal.querySelectorAll(`[data-${attr}]`).forEach(b => b.classList.toggle('active', b === btn));
    modal.querySelectorAll(`[data-${panelAttr}]`).forEach(p =>
      p.classList.toggle('active', p.dataset[panelAttr] === value));

    modal.dispatchEvent(new CustomEvent('tabchange', { detail: { group: attr, value } }));
  });
}

function renderTopbar(user) {
  const branch = findBranch(user.coSo || user.branch);
  const roleLabel = ROLE_LABELS[user.role] || 'Thành viên';

  $('#appTitle').textContent = user.role === 'phu_huynh'
    ? 'Bảng điều khiển Phụ huynh'
    : 'Hệ thống Quản lý Nội bộ';
  $('#appSubtitle').textContent = branch ? `${roleLabel} · ${branch.name}` : roleLabel;

  setHTML('#userChip', `
    <img src="${esc(user.anhDaiDien || user.avatar || 'assets/img/avatar-default.svg')}" alt=""
         onerror="this.src='assets/img/avatar-default.svg'">
    <div>
      <div class="name">${esc(user.hoTen || user.full_name || 'Người dùng')}</div>
      <div class="role">${esc(roleLabel)}</div>
    </div>`);
}

function logout() {
  clearSession();            // xoá phiên VÀ toàn bộ dữ liệu tạm — không rò sang người sau
  window.location.href = 'index.html';
}

function boot() {
  const user = currentUser();

  if (!user) {
    setHTML('#appContent', `
      <div class="empty-note" style="padding:80px 20px">
        <i class="fa-solid fa-lock" aria-hidden="true" style="display:block;font-size:34px;opacity:.3;margin-bottom:14px"></i>
        Bạn cần đăng nhập để vào hệ thống.<br>
        <a href="index.html?login=1" class="btn-save" style="margin-top:18px;display:inline-flex;text-decoration:none">Tới trang đăng nhập</a>
      </div>`);
    $('#btnLogout').style.display = 'none';
    $('#userChip').style.display = 'none';
    return;
  }

  initModals();
  initPasswordEyes();
  initEnterSubmit();
  initModalTabs();
  renderTopbar(user);
  $('#btnLogout').addEventListener('click', logout);

  if (user.role === 'phu_huynh') renderParentDashboard(user);
  else renderStaffDashboard(user);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
