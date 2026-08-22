/* =============================================================
   HỆ THỐNG CƠ SỞ + POPUP ĐĂNG KÝ
   - Danh sách cơ sở dựng từ config.js (một nguồn sự thật)
   - Mỗi cơ sở: ảnh, địa chỉ, bản đồ bấm vào là chỉ đường
   - Popup cho phép 1 phụ huynh đăng ký NHIỀU võ sinh (nút +)
   ============================================================= */

import { BRANCHES, directionsUrl, embedMapUrl } from '../core/config.js';
import { $, esc, setHTML, el } from '../core/dom.js';
import { openModal, closeModal, toastSuccess, toastError } from '../core/ui.js';
import { callApi } from '../core/api.js';
import { isValidPhone, isValidEmail, normalizePhone, toISODate } from '../core/format.js';

const MAX_STUDENTS = 5;
let studentSeq = 0;

/* ---------------- DANH SÁCH CƠ SỞ TRÊN TRANG CHỦ ---------------- */

export function renderBranchList(containerSel = '#locationsBody') {
  const host = $(containerSel);
  if (!host) return;

  // Nhóm theo khu vực, giữ nguyên thứ tự xuất hiện trong config
  const regions = [];
  for (const b of BRANCHES) {
    let g = regions.find(r => r.name === b.region);
    if (!g) regions.push((g = { name: b.region, items: [] }));
    g.items.push(b);
  }

  host.innerHTML = regions.map(region => `
    <h3 class="region-title">
      <i class="fa-solid fa-location-dot" aria-hidden="true" style="color:var(--red)"></i>
      ${esc(region.name)}
      <span class="count">${region.items.length} cơ sở</span>
    </h3>
    <div class="locations-grid">
      ${region.items.map((b, i) => branchCardHTML(b, i)).join('')}
    </div>
  `).join('');
}

function branchCardHTML(b, index) {
  const delay = ['', 'delay-1', 'delay-2'][index % 3];
  return `
  <article class="loc-card reveal ${delay}">
    <div class="loc-img-wrap">
      <span class="loc-tag">${esc(b.code)}</span>
      <span class="loc-since">Từ ${esc(b.since)}</span>
      <img src="${esc(b.image)}" alt="Phòng tập ${esc(b.name)}"
           loading="lazy" decoding="async" width="600" height="400"
           onerror="this.onerror=null;this.src='assets/img/placeholder-branch.svg'">
    </div>
    <div class="loc-info">
      <h4 class="loc-name">${esc(b.name.toUpperCase())}</h4>
      <p class="loc-addr">
        <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
        <span>${esc(b.shortAddress)}</span>
      </p>
      <div class="loc-actions">
        <a class="loc-btn loc-btn-map" href="${esc(directionsUrl(b))}" target="_blank" rel="noopener"
           aria-label="Chỉ đường tới ${esc(b.name)}">
          <i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i>Chỉ đường
        </a>
        <button type="button" class="loc-btn loc-btn-reg" data-branch="${esc(b.id)}"
                aria-label="Đăng ký học tại ${esc(b.name)}">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>Đăng ký
        </button>
      </div>
    </div>
  </article>`;
}

/* ---------------- POPUP ĐĂNG KÝ THEO CƠ SỞ ---------------- */

function ensureModal() {
  let modal = $('#branchModal');
  if (modal) return modal;

  modal = el('div', { id: 'branchModal', class: 'modal-overlay', 'aria-hidden': 'true' });
  modal.innerHTML = `
    <div class="modal-content" style="max-width:560px" role="dialog" aria-modal="true" aria-labelledby="bmTitle">
      <div class="modal-header">
        <div class="modal-title" id="bmTitle">Đăng ký học</div>
        <button class="modal-close" type="button" data-close aria-label="Đóng">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <form id="branchForm" novalidate>
        <div class="modal-body">
          <div class="branch-address-box" style="margin-bottom:14px">
            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            <span id="bmAddress"></span>
          </div>

          <div style="position:relative;margin-bottom:24px">
            <div id="bmMapHost"></div>
            <a id="bmDirections" href="#" target="_blank" rel="noopener"
               style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;
                      padding-bottom:14px;text-decoration:none;border-radius:var(--r-md)">
              <span style="background:var(--primary-blue);color:#fff;font-size:12px;font-weight:800;
                           letter-spacing:.5px;text-transform:uppercase;padding:9px 18px;border-radius:var(--r-pill);
                           box-shadow:0 6px 18px rgba(0,0,0,.25);display:inline-flex;align-items:center;gap:8px">
                <i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i>Bấm để chỉ đường
              </span>
            </a>
          </div>

          <div class="form-group">
            <label for="bmParentName">Họ và tên phụ huynh *</label>
            <input type="text" id="bmParentName" name="parentName" autocomplete="name"
                   placeholder="VD: Nguyễn Văn An" required>
            <div class="validation-msg" data-err="parentName">Vui lòng nhập họ tên phụ huynh.</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="bmPhone">Số điện thoại *</label>
              <input type="tel" id="bmPhone" name="phone" inputmode="numeric" autocomplete="tel"
                     placeholder="0xxxxxxxxx" required>
              <div class="validation-msg" data-err="phone">Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09).</div>
            </div>
            <div class="form-group">
              <label for="bmEmail">Email *</label>
              <input type="email" id="bmEmail" name="email" autocomplete="email"
                     placeholder="email@example.com" required>
              <div class="validation-msg" data-err="email">Email không hợp lệ.</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:26px 0 12px">
            <h4 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text-main)">
              Thông tin võ sinh
            </h4>
            <span style="font-size:12px;color:var(--text-muted)" id="bmStudentCount"></span>
          </div>

          <div id="bmStudents"></div>
          <button type="button" class="btn-add-student" id="bmAddStudent">
            <i class="fa-solid fa-plus" aria-hidden="true"></i> Thêm võ sinh
          </button>
          <p class="form-hint" style="margin-top:10px">
            Một phụ huynh có thể đăng ký cho nhiều con cùng lúc (tối đa ${MAX_STUDENTS} võ sinh).
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" data-close>Huỷ bỏ</button>
          <button type="submit" class="btn-save" id="bmSubmit">Gửi đăng ký</button>
        </div>
      </form>
    </div>`;

  document.body.append(modal);
  $('#bmAddStudent', modal).addEventListener('click', () => addStudentRow());
  $('#branchForm', modal).addEventListener('submit', handleSubmit);
  return modal;
}

/* ---------- Khối võ sinh động ---------- */

function addStudentRow(focus = true) {
  const host = $('#bmStudents');
  if (!host || host.children.length >= MAX_STUDENTS) return;

  const idx = ++studentSeq;
  const block = el('div', { class: 'student-block', 'data-student': '' });
  const today = toISODate(new Date());
  const minDob = toISODate(new Date(new Date().getFullYear() - 20, 0, 1));

  block.innerHTML = `
    <div class="student-block-head">
      <span class="student-block-title">Võ sinh <span data-order></span></span>
      <button type="button" class="student-remove" data-remove aria-label="Xoá võ sinh này">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Xoá
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="stName${idx}">Họ và tên võ sinh *</label>
        <input type="text" id="stName${idx}" data-field="hoTen" placeholder="VD: Nguyễn Minh Khang" required>
        <div class="validation-msg" data-err="hoTen">Vui lòng nhập họ tên võ sinh.</div>
      </div>
      <div class="form-group">
        <label for="stDob${idx}">Ngày sinh *</label>
        <input type="date" id="stDob${idx}" data-field="ngaySinh" max="${today}" min="${minDob}" required>
        <div class="validation-msg" data-err="ngaySinh">Vui lòng chọn ngày sinh hợp lệ.</div>
      </div>
    </div>`;

  block.querySelector('[data-remove]').addEventListener('click', () => {
    block.remove();
    refreshStudentUI();
  });

  host.append(block);
  refreshStudentUI();
  if (focus) block.querySelector('input')?.focus();
}

function refreshStudentUI() {
  const blocks = [...document.querySelectorAll('#bmStudents [data-student]')];
  blocks.forEach((b, i) => {
    b.querySelector('[data-order]').textContent = i + 1;
    // Võ sinh đầu tiên không cho xoá — form luôn cần ít nhất 1
    b.querySelector('[data-remove]').style.display = blocks.length > 1 ? '' : 'none';
  });
  const addBtn = $('#bmAddStudent');
  if (addBtn) {
    addBtn.disabled = blocks.length >= MAX_STUDENTS;
    addBtn.innerHTML = blocks.length >= MAX_STUDENTS
      ? '<i class="fa-solid fa-circle-info" aria-hidden="true"></i> Tối đa ' + MAX_STUDENTS + ' võ sinh mỗi lần đăng ký'
      : '<i class="fa-solid fa-plus" aria-hidden="true"></i> Thêm võ sinh';
  }
  const counter = $('#bmStudentCount');
  if (counter) counter.textContent = `${blocks.length}/${MAX_STUDENTS} võ sinh`;
}

/* ---------- Mở popup ---------- */

let activeBranch = null;

export function openBranchModal(branchId) {
  const branch = BRANCHES.find(b => b.id === branchId);
  if (!branch) return;
  activeBranch = branch;

  const modal = ensureModal();
  $('#bmTitle', modal).textContent = `Đăng ký học — ${branch.name}`;
  $('#bmAddress', modal).textContent = branch.address;
  $('#bmDirections', modal).href = directionsUrl(branch);

  // Bản đồ chỉ nạp khi mở popup, tránh kéo iframe nặng lúc tải trang.
  setHTML($('#bmMapHost', modal), `
    <iframe class="branch-map" src="${esc(embedMapUrl(branch))}"
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            title="Bản đồ ${esc(branch.name)}" style="pointer-events:none"></iframe>`);

  // Dựng lại form sạch mỗi lần mở
  $('#branchForm', modal).reset();
  modal.querySelectorAll('.validation-msg').forEach(m => m.classList.remove('visible'));
  modal.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
  setHTML($('#bmStudents', modal), '');
  addStudentRow(false);

  openModal(modal);
}

/* ---------- Kiểm tra & gửi ---------- */

function markError(input, errKey, scope, hasError) {
  const msg = scope.querySelector(`.validation-msg[data-err="${errKey}"]`);
  msg?.classList.toggle('visible', hasError);
  if (hasError) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  return hasError;
}

function collectAndValidate(form) {
  let firstBad = null;
  const fail = input => { if (!firstBad) firstBad = input; };

  const nameEl  = $('#bmParentName', form);
  const phoneEl = $('#bmPhone', form);
  const emailEl = $('#bmEmail', form);

  const parentName = nameEl.value.trim();
  const phone = normalizePhone(phoneEl.value);
  const email = emailEl.value.trim();

  if (markError(nameEl, 'parentName', form, parentName.length < 2)) fail(nameEl);
  if (markError(phoneEl, 'phone', form, !isValidPhone(phone))) fail(phoneEl);
  if (markError(emailEl, 'email', form, !isValidEmail(email))) fail(emailEl);

  const students = [];
  for (const block of form.querySelectorAll('[data-student]')) {
    const nEl = block.querySelector('[data-field="hoTen"]');
    const dEl = block.querySelector('[data-field="ngaySinh"]');
    const hoTen = nEl.value.trim();
    const ngaySinh = dEl.value;

    if (markError(nEl, 'hoTen', block, hoTen.length < 2)) fail(nEl);
    const badDob = !ngaySinh || new Date(ngaySinh) > new Date();
    if (markError(dEl, 'ngaySinh', block, badDob)) fail(dEl);

    if (hoTen && ngaySinh && !badDob) students.push({ hoTen, ngaySinh });
  }

  if (firstBad) {
    firstBad.focus();
    firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return null;
  }
  return { parentName, phone, email, students };
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const data = collectAndValidate(form);
  if (!data) return;

  const btn = $('#bmSubmit', form);
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Đang gửi...';
  btn.disabled = true;

  try {
    await callApi('dangKyTuVan', {
      coSoQuanTam: activeBranch.id,
      tenPhuHuynh: data.parentName,
      soDienThoai: data.phone,
      email: data.email,
      dsVoSinh: data.students,
      nguon: 'popup_coso',
    });

    closeModal('branchModal');
    const n = data.students.length;
    toastSuccess(
      `Đã gửi đăng ký cho ${n} võ sinh tại ${activeBranch.name}. Trung tâm sẽ liên hệ qua số ${data.phone} trong 24 giờ.`,
      8000
    );
  } catch (err) {
    toastError(err.message);
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

/* ---------------- KHỞI TẠO ---------------- */

export function initBranches() {
  renderBranchList();
  // Uỷ quyền sự kiện: card được dựng động nên không gắn trực tiếp
  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-branch]');
    if (btn) { ev.preventDefault(); openBranchModal(btn.dataset.branch); }
  });
}
