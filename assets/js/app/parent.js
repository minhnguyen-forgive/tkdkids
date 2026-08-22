/* =============================================================
   BẢNG ĐIỀU KHIỂN PHỤ HUYNH
   Hiện hồ sơ từng võ sinh + nhận xét của HLV.
   ============================================================= */

import { esc, setHTML, html } from '../core/dom.js';
import { tryApi } from '../core/api.js';
import { loadingHTML, emptyHTML, errorHTML } from '../core/ui.js';
import { formatDob } from '../core/format.js';
import { findBranch, findBelt } from '../core/config.js';

function beltChip(beltName) {
  const belt = findBelt(beltName);
  if (!belt) return `<span class="db-belt-badge">Cấp đai: ${esc(beltName || 'Chưa cập nhật')}</span>`;
  return `<span class="belt-chip" style="background:${belt.color};color:${belt.text}">
            <span class="belt-swatch" style="background:${belt.color}"></span>${esc(belt.name)}
          </span>`;
}

function studentCard(s) {
  const branch = findBranch(s.branch || s.coSo);
  return `
  <section class="pdb-card">
    <div class="db-avatar-panel">
      <img class="db-avatar" src="${esc(s.anhDaiDien || 'assets/img/avatar-default.svg')}"
           alt="Ảnh ${esc(s.student_name || s.hoTen)}" onerror="this.src='assets/img/avatar-default.svg'">
      <h3 class="db-name" style="color:var(--primary-blue)">${esc(s.student_name || s.hoTen)}</h3>
      <p class="db-position">Mã học viên: ${esc(s.maHV)}</p>
      ${beltChip(s.belt_level || s.capDaiHienTai)}
    </div>
    <div class="db-info-panel">
      <h4 class="db-info-title">Thông tin học viên</h4>
      <div class="db-info-grid">
        <div><div class="db-info-label">Ngày sinh</div><div class="db-info-value">${esc(formatDob(s.dob || s.ngaySinh))}</div></div>
        <div><div class="db-info-label">Số buổi / tuần</div><div class="db-info-value">${esc(s.sessions_per_week || s.soBuoiTuan || '—')}</div></div>
        <div><div class="db-info-label">Cơ sở học</div><div class="db-info-value">${esc(branch ? branch.name : (s.branch || 'Chưa phân công'))}</div></div>
        <div><div class="db-info-label">Người giám hộ</div><div class="db-info-value">${esc(s.guardian_name || '—')}${s.relationship ? ' (' + esc(s.relationship) + ')' : ''}</div></div>
      </div>
      <h4 class="db-info-title" style="margin-top:8px">Nhận xét từ Huấn luyện viên</h4>
      <div id="reviews-${esc(s.maHV)}">${loadingHTML()}</div>
    </div>
  </section>`;
}

async function loadReviews(maHV) {
  const box = document.getElementById('reviews-' + maHV);
  if (!box) return;

  const { ok, data, error } = await tryApi('listStudentReviews', { maHV });
  if (!ok) { box.innerHTML = errorHTML(error.message); return; }

  const reviews = data.reviews || [];
  if (!reviews.length) { box.innerHTML = emptyHTML('Chưa có nhận xét nào.', 'fa-comment-dots'); return; }

  box.innerHTML = reviews.map(r => `
    <div class="leave-history-item" style="display:block">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:5px">
        <strong style="color:var(--primary-blue);font-size:12px">Tháng ${esc(r.thang)}/${esc(r.nam)}</strong>
        <span style="color:var(--text-muted);font-size:11px">HLV: ${esc(r.hoTenNV)}</span>
      </div>
      <div style="color:var(--text-main);font-size:14px;line-height:1.6">${esc(r.noiDung)}</div>
    </div>`).join('');
}

export function renderParentDashboard(user) {
  const students = user.students || [];
  if (!students.length) {
    setHTML('#appContent', emptyHTML('Tài khoản của bạn chưa được gắn với võ sinh nào. Vui lòng liên hệ lễ tân của cơ sở.', 'fa-user-slash'));
    return;
  }
  setHTML('#appContent', students.map(studentCard).join(''));
  students.forEach(s => loadReviews(s.maHV));
}
