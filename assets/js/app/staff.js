/* =============================================================
   GIAO DIỆN HLV / NHÂN VIÊN
   Chuyển từ code cũ sang, kèm sửa lỗi:
   · Lịch dạy: thao tác trên BẢN NHÁP, huỷ modal không để lại lịch "ma"
   · Sự kiện lịch: sửa/xoá được MỌI ghi chú trong ngày, không chỉ cái đầu
   · Mọi dữ liệu từ server đều qua esc()
   ============================================================= */

import { $, $$, esc, setHTML } from '../core/dom.js';
import { callApi, tryApi } from '../core/api.js';
import {
  openModal, closeModal, toastSuccess, toastError, toastApiError,
  confirmDialog, promptDialog, loadingHTML, emptyHTML, errorHTML,
} from '../core/ui.js';
import { currentUser, patchSession, state } from '../core/store.js';
import {
  BRANCHES, WEEK_DAYS, SHIFT_SLOTS, findBranch, findBelt,
  isApprover, ROLE_LABELS,
} from '../core/config.js';
import {
  formatDate, formatDob, formatMoney, getMonday, formatWeekLabel,
  toISODate, fromISODate, MONTH_NAMES, isValidPassword, isValidPhone, isValidEmail,
} from '../core/format.js';
import { initAttendance, openMyAttendancePayroll, openApproveAttendancePayroll } from './attendance.js';

let user = null;
let calendarDate = new Date();

/* ═══════════ KHUNG GIAO DIỆN ═══════════ */

export function renderStaffDashboard(u) {
  user = u;
  const approver = isApprover(user.role);
  const branch = findBranch(user.coSo || user.branch);
  const belt = findBelt(user.capDai || user.belt_level);

  setHTML('#appContent', `
    <section class="db-card">
      <div class="db-avatar-panel">
        <img id="avatarImg" class="db-avatar" src="${esc(user.anhDaiDien || user.avatar || 'assets/img/avatar-default.svg')}"
             alt="" onerror="this.src='assets/img/avatar-default.svg'">
        <h2 class="db-name" id="dbName"></h2>
        <p class="db-position" id="dbPosition"></p>
        ${belt
          ? `<span class="belt-chip" style="background:${belt.color};color:${belt.text}">
               <span class="belt-swatch" style="background:${belt.color}"></span>${esc(belt.name)}</span>`
          : `<span class="db-belt-badge">Cấp đai: <span id="dbBelt"></span></span>`}
      </div>
      <div class="db-info-panel">
        <h3 class="db-info-title">Thông tin cá nhân</h3>
        <div class="db-info-grid">
          <div><div class="db-info-label">Số điện thoại</div><div class="db-info-value" id="dbPhone"></div></div>
          <div><div class="db-info-label">Ngày sinh</div><div class="db-info-value" id="dbDob"></div></div>
          <div><div class="db-info-label">Email</div><div class="db-info-value" id="dbEmail"></div></div>
          <div><div class="db-info-label">Cơ sở phụ trách</div>
               <div class="db-info-value" id="dbBranch" style="color:var(--primary-blue)"></div></div>
        </div>
        <button type="button" class="btn-edit" id="btnEditProfile">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Sửa thông tin &amp; mật khẩu
        </button>
      </div>
    </section>

    <h3 class="ops-title">Nghiệp vụ ${esc(ROLE_LABELS[user.role] || 'nhân viên')}</h3>
    <div class="ops-grid">
      <button class="ops-btn" data-op="schedule"><span class="ops-icon">📅</span><span>Đăng ký lịch dạy</span></button>
      <button class="ops-btn" data-op="leave"><span class="ops-icon">📝</span><span>Đăng ký nghỉ phép</span></button>
      <button class="ops-btn" data-op="review"><span class="ops-icon">⭐</span><span>Nhận xét học viên</span></button>
      <button class="ops-btn" data-op="myattendance"><span class="ops-icon">🧾</span><span>Chấm công &amp; Lương</span></button>
      ${approver ? `
      <button class="ops-btn" data-op="approval"><span class="ops-icon">✅</span><span>Duyệt đơn nghỉ phép</span></button>
      <button class="ops-btn" data-op="commonevent"><span class="ops-icon">📢</span><span>Thêm lịch chung</span></button>
      <button class="ops-btn" data-op="approveattendance"><span class="ops-icon">📊</span><span>Duyệt chấm công &amp; lương</span></button>` : ''}
    </div>

    <section class="calendar-wrapper">
      <div class="calendar-top">
        <h3 class="cal-title"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Lịch trình cá nhân</h3>
        <div class="cal-legend">
          <span class="cal-legend-item"><span class="cal-dot teaching"></span> Giảng dạy</span>
          <span class="cal-legend-item"><span class="cal-dot working"></span> Làm việc / Sự kiện</span>
          <span class="cal-legend-item"><span class="cal-dot leave"></span> Nghỉ phép</span>
        </div>
      </div>
      <div class="cal-month-nav">
        <button class="cal-nav-btn" id="calPrev" aria-label="Tháng trước"><i class="fa-solid fa-chevron-left"></i></button>
        <div class="cal-month-label" id="calMonthLabel"></div>
        <button class="cal-nav-btn" id="calNext" aria-label="Tháng sau"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="cal-grid" aria-hidden="true">
        <div class="cal-head">T2</div><div class="cal-head">T3</div><div class="cal-head">T4</div>
        <div class="cal-head">T5</div><div class="cal-head">T6</div><div class="cal-head">T7</div>
        <div class="cal-head" style="color:var(--red)">CN</div>
      </div>
      <div class="cal-grid" id="calendarGridBody"></div>
    </section>`);

  fillProfile();
  bindOps();
  initAttendance(user);

  $('#calPrev').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

  renderCalendar();
  refreshSchedule().then(renderCalendar);
  loadCalendarNotes().then(renderCalendar);
  loadCommonEvents().then(renderCalendar);
}

function fillProfile() {
  const branch = findBranch(user.coSo || user.branch);
  $('#dbName').textContent = user.hoTen || user.full_name || 'Chưa cập nhật';
  $('#dbPosition').textContent = user.chucVu || user.role_label || ROLE_LABELS[user.role] || 'Nhân viên';
  $('#dbPhone').textContent = user.soDienThoai || user.phone || 'Chưa cập nhật';
  $('#dbEmail').textContent = user.email || 'Chưa cập nhật';
  $('#dbBranch').textContent = branch ? branch.name : (user.branch || 'Chưa phân công');
  // Lỗi cũ: khi dob rỗng thì ô này giữ giá trị của người đăng nhập trước
  $('#dbDob').textContent = (user.ngaySinh || user.dob) ? formatDob(user.ngaySinh || user.dob) : 'Chưa cập nhật';
  const beltEl = $('#dbBelt');
  if (beltEl) beltEl.textContent = user.capDai || user.belt_level || 'Chưa cập nhật';
}

function bindOps() {
  const handlers = {
    schedule: openScheduleModal,
    leave: openLeaveModal,
    review: openReviewModal,
    myattendance: openMyAttendancePayroll,
    approval: openApprovalModal,
    commonevent: openCommonEventModal,
    approveattendance: openApproveAttendancePayroll,
  };
  $$('[data-op]').forEach(btn => btn.addEventListener('click', () => handlers[btn.dataset.op]?.()));
  $('#btnEditProfile').addEventListener('click', openEditProfile);
}

/* ═══════════ SỬA HỒ SƠ ═══════════ */

function openEditProfile() {
  $('#epFullName').value = user.hoTen || user.full_name || '';
  $('#epPhone').value    = user.soDienThoai || user.phone || '';
  $('#epEmail').value    = user.email || '';
  $('#epDob').value      = (user.ngaySinh || user.dob || '').slice(0, 10);
  $('#epRole').value     = user.chucVu || user.role_label || '';
  $('#epNewPass').value = ''; $('#epConfirmPass').value = '';
  $$('#editProfileModal .validation-msg').forEach(m => m.classList.remove('visible'));
  $('[data-mtab="info"]').click();
  openModal('editProfileModal');
}

$('#editProfileForm')?.addEventListener('submit', async ev => {
  ev.preventDefault();
  const newPass = $('#epNewPass').value;
  const confirm = $('#epConfirmPass').value;
  $('#passErr').classList.remove('visible');
  $('#passMatchErr').classList.remove('visible');

  if (newPass) {
    if (!isValidPassword(newPass)) {
      $('[data-mtab="pass"]').click(); $('#passErr').classList.add('visible'); return;
    }
    if (newPass !== confirm) {
      $('[data-mtab="pass"]').click(); $('#passMatchErr').classList.add('visible'); return;
    }
  }

  const fullName = $('#epFullName').value.trim();
  const phone = $('#epPhone').value.trim();
  const email = $('#epEmail').value.trim();
  if (!fullName) return toastError('Vui lòng nhập họ tên.');
  if (!isValidPhone(phone)) return toastError('Số điện thoại không hợp lệ.');
  if (!isValidEmail(email)) return toastError('Email không hợp lệ.');

  const btn = $('#epSaveBtn');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang lưu...'; btn.disabled = true;

  try {
    await callApi('updateProfile', {
      maNV: user.maNV, fullName, phone, email,
      dob: $('#epDob').value, role: $('#epRole').value, newPassword: newPass,
    });
    // Cập nhật phiên tại chỗ thay vì tải lại toàn bộ dashboard (tiết kiệm 3 lệnh gọi API)
    user = patchSession({ hoTen: fullName, full_name: fullName, soDienThoai: phone, phone,
                          email, ngaySinh: $('#epDob').value, dob: $('#epDob').value,
                          chucVu: $('#epRole').value });
    fillProfile();
    closeModal('editProfileModal');
    toastSuccess('Đã cập nhật thông tin cá nhân.');
  } catch (err) {
    toastApiError(err);
  } finally {
    btn.innerHTML = original; btn.disabled = false;
  }
});

/* ═══════════ LỊCH DẠY HÀNG TUẦN ═══════════ */

let schWeekStart = null;
let schDraft = null;     // BẢN NHÁP — chỉ ghi vào state khi lưu thành công

export function refreshSchedule() {
  return tryApi('getSchedule', { maNV: user.maNV }).then(({ ok, data }) => {
    if (!ok) return;
    state.allSchedules = data.schedule || [];
    state.scheduleByWeek = {};
    for (const s of state.allSchedules) {
      if (!s.isMine || !s.tuanBatDau) continue;
      const w = (state.scheduleByWeek[s.tuanBatDau] ||= {});
      (w[s.thu] ||= {})[s.ca] = s.coSo;
    }
  });
}

function openScheduleModal() {
  schWeekStart = getMonday(new Date());
  setHTML('#schBranchSelect',
    '<option value="" disabled selected>-- Chọn cơ sở giảng dạy --</option>' +
    BRANCHES.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''));
  $('#conflictWarning').classList.remove('active');
  syncDraft();
  updateWeekLabel();
  renderScheduleSlots();
  openModal('scheduleModal');
}

/** Sao chép dữ liệu tuần đang xem thành bản nháp độc lập. */
function syncDraft() {
  const source = state.scheduleByWeek[schWeekStart] || {};
  schDraft = JSON.parse(JSON.stringify(source));
}

function updateWeekLabel() { $('#weekNavLabel').textContent = formatWeekLabel(schWeekStart); }

function changeWeek(dir) {
  const d = fromISODate(schWeekStart);
  d.setDate(d.getDate() + dir * 7);
  schWeekStart = getMonday(d);
  syncDraft();                        // đổi tuần thì lấy lại nháp của tuần mới
  updateWeekLabel();
  renderScheduleSlots();
}

function renderScheduleSlots() {
  const branch = $('#schBranchSelect').value;
  $('#conflictWarning').classList.remove('active');
  const container = $('#scheduleGridContainer');

  if (!branch) {
    container.innerHTML = emptyHTML('Vui lòng chọn cơ sở trước khi chọn khung giờ dạy.', 'fa-hand-pointer');
    return;
  }

  container.innerHTML = WEEK_DAYS.map(day => {
    const shifts = day.isWeekend ? SHIFT_SLOTS.weekend : SHIFT_SLOTS.weekday;
    const dayRecord = schDraft[day.id] || {};
    const slots = shifts.map(slot => {
      const taken = dayRecord[slot.id];
      const checked = taken === branch;
      const disabled = taken && taken !== branch;
      const takenBranch = disabled ? findBranch(taken) : null;
      return `<label>
        <input type="checkbox" class="slot-toggle" data-day="${day.id}" data-slot="${esc(slot.id)}"
               ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        <span class="slot-label" ${disabled ? `title="Đã đăng ký tại ${esc(takenBranch ? takenBranch.name : taken)}"` : ''}>${esc(slot.label)}</span>
      </label>`;
    }).join('');
    return `<div class="day-group">
      <div class="day-group-header">${esc(day.label)}</div>
      <div class="day-group-body"><div class="slot-grid">${slots}</div></div>
    </div>`;
  }).join('');
}

function handleSlotChange(checkbox) {
  const branch = $('#schBranchSelect').value;
  const dayId = checkbox.dataset.day;
  const slotId = checkbox.dataset.slot;
  const dayRecord = (schDraft[dayId] ||= {});
  const taken = dayRecord[slotId];

  if (checkbox.checked) {
    if (taken && taken !== branch) {
      checkbox.checked = false;
      const b = findBranch(taken);
      $('#conflictBranchName').textContent = b ? b.name : taken;
      $('#conflictWarning').classList.add('active');
      return;
    }
    dayRecord[slotId] = branch;
    $('#conflictWarning').classList.remove('active');
  } else if (taken === branch) {
    delete dayRecord[slotId];
  }
}

async function saveSchedule() {
  const btn = $('#schSave');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang lưu...'; btn.disabled = true;

  const slots = [];
  for (const thu of Object.keys(schDraft))
    for (const ca of Object.keys(schDraft[thu]))
      slots.push({ thu: Number(thu), ca, coSo: schDraft[thu][ca] });

  try {
    await callApi('registerSchedule', { maNV: user.maNV, tuanBatDau: schWeekStart, slots });
    await refreshSchedule();      // chỉ khi server xác nhận mới đồng bộ vào state
    renderCalendar();
    closeModal('scheduleModal');
    toastSuccess(`Đã lưu ${slots.length} ca dạy cho ${formatWeekLabel(schWeekStart).toLowerCase()}.`);
  } catch (err) {
    toastApiError(err);
  } finally {
    btn.innerHTML = original; btn.disabled = false;
  }
}

$('#schPrevWeek')?.addEventListener('click', () => changeWeek(-1));
$('#schNextWeek')?.addEventListener('click', () => changeWeek(1));
$('#schBranchSelect')?.addEventListener('change', renderScheduleSlots);
$('#schSave')?.addEventListener('click', saveSchedule);
$('#schCancel')?.addEventListener('click', () => closeModal('scheduleModal'));
$('#scheduleGridContainer')?.addEventListener('change', ev => {
  if (ev.target.classList.contains('slot-toggle')) handleSlotChange(ev.target);
});

/* ═══════════ LỊCH CÁ NHÂN ═══════════ */

function teachingEvents(dateObj) {
  const week = state.scheduleByWeek[getMonday(dateObj)] || {};
  const dayRecord = week[dateObj.getDay()];
  if (!dayRecord) return [];
  const all = [...SHIFT_SLOTS.weekday, ...SHIFT_SLOTS.weekend];
  return Object.keys(dayRecord).map(slotId => {
    const b = findBranch(dayRecord[slotId]);
    const short = all.find(s => s.id === slotId)?.short || slotId + 'h';
    return { type: 'teaching', label: `${b ? b.name.replace('Cơ sở ', '') : dayRecord[slotId]}: ${short}`, readonly: true };
  });
}

export function loadCalendarNotes() {
  return tryApi('listCalendarNotes', { maNV: user.maNV }).then(({ ok, data }) => {
    if (!ok) return;
    state.calendarNotes = {};
    for (const n of data.notes || []) {
      (state.calendarNotes[n.ngay] ||= []).push({ id: n.id, type: n.loai, label: n.noiDung });
    }
  });
}

export function loadCommonEvents() {
  return tryApi('listCommonEvents', { maNV: user.maNV }).then(({ ok, data }) => {
    if (ok) state.commonEvents = data.events || [];
  });
}

function renderCalendar() {
  const label = $('#calMonthLabel');
  if (!label) return;
  label.textContent = `${MONTH_NAMES[calendarDate.getMonth()].toUpperCase()}, ${calendarDate.getFullYear()}`;

  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toISODate(new Date());

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push('<div class="cal-day empty"></div>');

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const dateStr = toISODate(cellDate);

    const events = [
      ...teachingEvents(cellDate),
      ...(state.calendarNotes[dateStr] || []),
      ...state.commonEvents.filter(e => e.ngay === dateStr).map(e => ({
        type: e.loai, label: (e.coSo === 'ALL' ? '[Chung] ' : '[CS] ') + e.noiDung, readonly: true,
      })),
    ];

    const pills = events.map(e =>
      `<span class="event-pill ${esc(e.type)}" title="${esc(e.label)}">${esc(e.label)}</span>`).join('');

    cells.push(`<button type="button" class="cal-day${dateStr === todayStr ? ' today' : ''}"
        data-date="${dateStr}" aria-label="Ngày ${d} tháng ${month + 1}, ${events.length} sự kiện">
        <span class="cal-day-num">${d}</span>
        <span class="cal-day-events">${pills}</span></button>`);
  }

  const remainder = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < remainder; i++) cells.push('<div class="cal-day empty"></div>');

  setHTML('#calendarGridBody', cells.join(''));
}

document.addEventListener('click', ev => {
  const cell = ev.target.closest('.cal-day[data-date]');
  if (cell) openEventModal(cell.dataset.date);
});

/* ---------- Sự kiện trong ngày ---------- */

function openEventModal(dateStr) {
  $('#evModalDateLabel').textContent = formatDate(dateStr);
  $('#evDateHidden').value = dateStr;
  $('#evIdHidden').value = '';
  $('#evType').value = 'working';
  $('#evTitle').value = '';
  $('#evDeleteBtn').style.display = 'none';

  // Lỗi cũ: chỉ sửa/xoá được ghi chú ĐẦU TIÊN của ngày.
  // Giờ liệt kê toàn bộ để chọn.
  const notes = state.calendarNotes[dateStr] || [];
  setHTML('#evExisting', notes.length ? `
    <div class="ops-title" style="font-size:13px;margin-bottom:8px">Ghi chú đã có (bấm để sửa)</div>
    ${notes.map(n => `
      <div class="leave-history-item" style="padding:10px 0">
        <button type="button" class="btn-link" data-edit-note="${esc(n.id)}" style="text-align:left">
          <span class="event-pill ${esc(n.type)}" style="margin-right:8px">${esc(n.label)}</span>
        </button>
        <button type="button" class="btn-reject" style="padding:6px 12px" data-del-note="${esc(n.id)}">Xoá</button>
      </div>`).join('')}
    <hr style="border:none;border-top:1px solid var(--border-light);margin:16px 0">
    <div class="ops-title" style="font-size:13px;margin-bottom:8px">Thêm ghi chú mới</div>` : '');

  openModal('eventModal');
}

$('#evExisting')?.addEventListener('click', ev => {
  const dateStr = $('#evDateHidden').value;
  const notes = state.calendarNotes[dateStr] || [];

  const editBtn = ev.target.closest('[data-edit-note]');
  if (editBtn) {
    const note = notes.find(n => String(n.id) === editBtn.dataset.editNote);
    if (note) {
      $('#evIdHidden').value = note.id;
      $('#evType').value = note.type;
      $('#evTitle').value = note.label;
      $('#evDeleteBtn').style.display = '';
      $('#evTitle').focus();
    }
    return;
  }

  const delBtn = ev.target.closest('[data-del-note]');
  if (delBtn) deleteNote(dateStr, delBtn.dataset.delNote);
});

$('#evDeleteBtn')?.addEventListener('click', () =>
  deleteNote($('#evDateHidden').value, $('#evIdHidden').value));

async function deleteNote(dateStr, id) {
  if (!id) return;
  if (!await confirmDialog('Xoá ghi chú này khỏi lịch?', { danger: true, okText: 'Xoá' })) return;
  try {
    await callApi('deleteCalendarNote', { maNV: user.maNV, id });
    state.calendarNotes[dateStr] = (state.calendarNotes[dateStr] || []).filter(e => String(e.id) !== String(id));
    if (!state.calendarNotes[dateStr].length) delete state.calendarNotes[dateStr];
    closeModal('eventModal');
    renderCalendar();
    toastSuccess('Đã xoá ghi chú.');
  } catch (err) { toastApiError(err); }
}

$('#eventForm')?.addEventListener('submit', async ev => {
  ev.preventDefault();
  const dateStr = $('#evDateHidden').value;
  const id = $('#evIdHidden').value;
  const type = $('#evType').value;
  const label = $('#evTitle').value.trim();
  if (!label) return toastError('Vui lòng nhập nội dung sự kiện.');

  try {
    const res = await callApi('addCalendarNote', { maNV: user.maNV, id, ngay: dateStr, loai: type, noiDung: label });
    const list = (state.calendarNotes[dateStr] ||= []);
    const newId = id || res.id;
    const idx = list.findIndex(e => String(e.id) === String(newId));
    const entry = { id: newId, type, label };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    closeModal('eventModal');
    renderCalendar();
    toastSuccess(id ? 'Đã cập nhật ghi chú.' : 'Đã thêm ghi chú vào lịch.');
  } catch (err) { toastApiError(err); }
});

/* ═══════════ NGHỈ PHÉP ═══════════ */

export function statusBadge(trangThai) {
  const map = { 'Chờ duyệt': 'pending', 'Đã duyệt': 'approved', 'Từ chối': 'rejected',
                'Đang dạy': 'info', 'Điểm danh không hợp lệ': 'rejected' };
  return `<span class="status-badge ${map[trangThai] || 'neutral'}">${esc(trangThai || '—')}</span>`;
}

function openLeaveModal() {
  $('#lvFrom').value = ''; $('#lvTo').value = ''; $('#lvReason').value = '';
  $('#lvErr').classList.remove('visible');
  setHTML('#lvHistory', loadingHTML());
  openModal('leaveModal');
  loadLeaveHistory();
}

async function loadLeaveHistory() {
  const { ok, data, error } = await tryApi('listLeaveRequests', { maNV: user.maNV });
  const box = $('#lvHistory');
  if (!ok) return setHTML(box, errorHTML(error.message));
  const list = data.requests || [];
  if (!list.length) return setHTML(box, emptyHTML('Chưa có đơn nào.', 'fa-file-circle-plus'));

  setHTML(box, list.map(r => `
    <div class="leave-history-item">
      <div><strong style="color:var(--text-main)">${esc(formatDate(r.tuNgay))} → ${esc(formatDate(r.denNgay))}</strong><br>
           <span style="color:var(--text-muted)">${esc(r.lyDo)}</span></div>
      ${statusBadge(r.trangThai)}
    </div>`).join(''));
}

$('#lvSubmitBtn')?.addEventListener('click', async () => {
  const tuNgay = $('#lvFrom').value, denNgay = $('#lvTo').value;
  const lyDo = $('#lvReason').value.trim();
  const err = $('#lvErr');
  err.classList.remove('visible');

  if (!tuNgay || !denNgay || !lyDo || new Date(denNgay) < new Date(tuNgay)) {
    err.classList.add('visible'); return;
  }

  const btn = $('#lvSubmitBtn');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang gửi...'; btn.disabled = true;
  try {
    await callApi('requestLeave', {
      maNV: user.maNV, hoTen: user.hoTen || user.full_name,
      coSo: user.coSo || user.branch, tuNgay, denNgay, lyDo,
    });
    $('#lvFrom').value = ''; $('#lvTo').value = ''; $('#lvReason').value = '';
    await loadLeaveHistory();
    toastSuccess('Đã gửi đơn nghỉ phép. Vui lòng chờ duyệt.');
  } catch (e) { toastApiError(e); }
  finally { btn.innerHTML = original; btn.disabled = false; }
});

/* ═══════════ DUYỆT NGHỈ PHÉP ═══════════ */

function openApprovalModal() {
  setHTML('#approvalListBox', loadingHTML());
  openModal('approvalModal');
  loadApprovalList();
}

async function loadApprovalList() {
  const { ok, data, error } = await tryApi('listPendingApprovals', { maNV: user.maNV });
  const box = $('#approvalListBox');
  if (!ok) return setHTML(box, errorHTML(error.message));
  const list = data.requests || [];
  if (!list.length) return setHTML(box, emptyHTML('Không có đơn nào đang chờ duyệt.', 'fa-circle-check'));

  setHTML(box, list.map(r => {
    const b = findBranch(r.coSo);
    return `<div class="approval-row">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(r.hoTen)}
            <span style="color:var(--text-muted);font-weight:400;font-size:12px">(${esc(b ? b.name : r.coSo)})</span></div>
          <div class="approval-meta">Từ ${esc(formatDate(r.tuNgay))} đến ${esc(formatDate(r.denNgay))}<br>
            Lý do: <span style="color:var(--text-main)">${esc(r.lyDo)}</span></div>
        </div>
        ${statusBadge(r.trangThai)}
      </div>
      <div class="approval-actions">
        <button class="btn-approve" data-leave-ok="${esc(r.id)}">Duyệt</button>
        <button class="btn-reject" data-leave-no="${esc(r.id)}">Từ chối</button>
      </div>
    </div>`;
  }).join(''));
}

$('#approvalListBox')?.addEventListener('click', async ev => {
  const okBtn = ev.target.closest('[data-leave-ok]');
  const noBtn = ev.target.closest('[data-leave-no]');
  if (!okBtn && !noBtn) return;

  const id = (okBtn || noBtn).dataset.leaveOk || noBtn.dataset.leaveNo;
  let quyetDinh = 'Đã duyệt', lyDoTuChoi = '';

  if (noBtn) {
    quyetDinh = 'Từ chối';
    lyDoTuChoi = await promptDialog('Lý do từ chối', { title: 'Từ chối đơn nghỉ phép', placeholder: 'Không bắt buộc' });
    if (lyDoTuChoi === null) return;
  } else if (!await confirmDialog('Duyệt đơn nghỉ phép này?')) return;

  try {
    await callApi('decideLeaveRequest', { id, quyetDinh, lyDoTuChoi, maNV: user.maNV });
    await loadApprovalList();
    toastSuccess(noBtn ? 'Đã từ chối đơn.' : 'Đã duyệt đơn nghỉ phép.');
  } catch (e) { toastApiError(e); }
});

/* ═══════════ LỊCH CHUNG ═══════════ */

function isAdmin() { return user.role === 'admin'; }

function openCommonEventModal() {
  $('#ceDate').value = ''; $('#ceTitle').value = ''; $('#ceType').value = 'working';
  const b = findBranch(user.coSo || user.branch);
  $('#ceScopeNote').textContent = isAdmin()
    ? 'Lịch này sẽ hiển thị cho TẤT CẢ nhân viên toàn hệ thống.'
    : `Lịch này sẽ hiển thị cho các HLV thuộc ${b ? b.name : 'cơ sở của bạn'}.`;
  renderCommonEventList();
  openModal('commonEventModal');
}

function renderCommonEventList() {
  const mine = state.commonEvents.filter(e => isAdmin() || e.coSo === (user.coSo || user.branch));
  const box = $('#ceList');
  if (!mine.length) return setHTML(box, emptyHTML('Chưa có lịch chung nào.', 'fa-bullhorn'));

  setHTML(box, mine.map(e => {
    const b = findBranch(e.coSo);
    return `<div class="leave-history-item">
      <div><strong>${esc(formatDate(e.ngay))}</strong> — ${esc(e.noiDung)}<br>
        <span style="color:var(--text-muted)">${esc(e.coSo === 'ALL' ? 'Toàn hệ thống' : (b ? b.name : e.coSo))}</span></div>
      <button class="btn-reject" style="padding:6px 12px" data-del-common="${esc(e.id)}">Xoá</button>
    </div>`;
  }).join(''));
}

$('#ceList')?.addEventListener('click', async ev => {
  const btn = ev.target.closest('[data-del-common]');
  if (!btn) return;
  if (!await confirmDialog('Xoá lịch chung này?', { danger: true, okText: 'Xoá' })) return;
  try {
    await callApi('deleteCommonEvent', { maNV: user.maNV, id: btn.dataset.delCommon });
    await loadCommonEvents();
    renderCommonEventList(); renderCalendar();
    toastSuccess('Đã xoá lịch chung.');
  } catch (e) { toastApiError(e); }
});

$('#commonEventForm')?.addEventListener('submit', async ev => {
  ev.preventDefault();
  const ngay = $('#ceDate').value, noiDung = $('#ceTitle').value.trim();
  if (!ngay || !noiDung) return toastError('Vui lòng nhập đủ ngày và nội dung.');
  try {
    await callApi('addCommonEvent', { maNV: user.maNV, ngay, loai: $('#ceType').value, noiDung });
    $('#ceDate').value = ''; $('#ceTitle').value = '';
    await loadCommonEvents();
    renderCommonEventList(); renderCalendar();
    toastSuccess('Đã thêm lịch chung.');
  } catch (e) { toastApiError(e); }
});

/* ═══════════ NHẬN XÉT HỌC VIÊN ═══════════ */

let lookupTimer = null;
let reviewStudent = null;

function openReviewModal() {
  $('#rvMaHV').value = ''; $('#rvNoiDung').value = '';
  $('#rvStudentInfo').style.display = 'none';
  $('#rvNotFound').style.display = 'none';
  $('#rvErr').classList.remove('visible');
  setHTML('#rvHistory', emptyHTML('Nhập mã học viên để xem lịch sử.', 'fa-magnifying-glass'));
  reviewStudent = null;

  const now = new Date();
  setHTML('#rvThang', Array.from({ length: 12 }, (_, i) =>
    `<option value="${i + 1}"${i === now.getMonth() ? ' selected' : ''}>Tháng ${i + 1}</option>`).join(''));
  const y = now.getFullYear();
  setHTML('#rvNam', [y - 1, y, y + 1].map(v =>
    `<option value="${v}"${v === y ? ' selected' : ''}>${v}</option>`).join(''));

  openModal('reviewModal');
}

$('#rvMaHV')?.addEventListener('input', () => {
  clearTimeout(lookupTimer);
  const maHV = $('#rvMaHV').value.trim();
  $('#rvStudentInfo').style.display = 'none';
  $('#rvNotFound').style.display = 'none';
  reviewStudent = null;

  if (!maHV) return setHTML('#rvHistory', emptyHTML('Nhập mã học viên để xem lịch sử.', 'fa-magnifying-glass'));

  lookupTimer = setTimeout(async () => {
    const { ok, data } = await tryApi('lookupStudent', { maHV });
    if (!ok || !data.student) {
      $('#rvNotFound').style.display = 'block';
      return setHTML('#rvHistory', emptyHTML('Nhập mã học viên để xem lịch sử.', 'fa-magnifying-glass'));
    }
    reviewStudent = data.student;
    const b = findBranch(data.student.coSo);
    $('#rvStName').textContent = data.student.hoTen || '—';
    $('#rvStBranch').textContent = b ? b.name : (data.student.coSo || '—');
    $('#rvStBelt').textContent = data.student.capDai || '—';
    $('#rvStudentInfo').style.display = 'block';
    loadReviewHistory(maHV);
  }, 450);
});

async function loadReviewHistory(maHV) {
  setHTML('#rvHistory', loadingHTML());
  const { ok, data, error } = await tryApi('listStudentReviews', { maHV });
  const box = $('#rvHistory');
  if (!ok) return setHTML(box, errorHTML(error.message));
  const list = data.reviews || [];
  if (!list.length) return setHTML(box, emptyHTML('Chưa có nhận xét nào.', 'fa-comment-dots'));

  setHTML(box, list.map(r => `
    <div class="leave-history-item" style="display:block">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:5px">
        <strong style="color:var(--primary-blue);font-size:12px">Tháng ${esc(r.thang)}/${esc(r.nam)}</strong>
        <span style="color:var(--text-muted);font-size:11px">HLV: ${esc(r.hoTenNV)}</span>
      </div>
      <div style="color:var(--text-main);line-height:1.6">${esc(r.noiDung)}</div>
    </div>`).join(''));
}

$('#rvSaveBtn')?.addEventListener('click', async () => {
  const maHV = $('#rvMaHV').value.trim();
  const noiDung = $('#rvNoiDung').value.trim();
  const err = $('#rvErr');
  err.classList.remove('visible');

  if (!reviewStudent || !maHV || !noiDung) { err.classList.add('visible'); return; }

  const btn = $('#rvSaveBtn');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang lưu...'; btn.disabled = true;
  try {
    await callApi('saveStudentReview', {
      maNV: user.maNV, maHV, thang: $('#rvThang').value, nam: $('#rvNam').value, noiDung,
    });
    $('#rvNoiDung').value = '';
    await loadReviewHistory(maHV);
    toastSuccess(`Đã lưu nhận xét cho ${reviewStudent.hoTen}.`);
  } catch (e) { toastApiError(e); }
  finally { btn.innerHTML = original; btn.disabled = false; }
});

export { renderCalendar };
