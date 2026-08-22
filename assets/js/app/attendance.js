/* =============================================================
   CHẤM CÔNG (Camera + GPS), BẢNG LƯƠNG VÀ DUYỆT
   Sửa lỗi cũ: thanh chuyển tháng nằm ở tab "Điểm danh" nhưng
   backend chỉ có getTodaySessions (chỉ hôm nay) nên bấm ◀ ▶
   đổi nhãn tháng mà danh sách không đổi. Nay thanh tháng chỉ
   hiện ở tab Bảng lương — nơi nó thật sự có tác dụng.
   ============================================================= */

import { $, $$, esc, setHTML } from '../core/dom.js';
import { callApi, tryApi } from '../core/api.js';
import {
  openModal, closeModal, toastSuccess, toastError, toastApiError,
  confirmDialog, promptDialog, loadingHTML, emptyHTML, errorHTML,
} from '../core/ui.js';
import { findBranch, shiftLabel } from '../core/config.js';
import { formatDate, formatMoney, formatNumber } from '../core/format.js';
import { captureFromVideo, dataUrlSizeKB } from '../core/image.js';
import { statusBadge } from './staff.js';

let user = null;
let payYear, payMonth;
let apaYear, apaMonth;

export function initAttendance(u) {
  user = u;
  const now = new Date();
  payYear = apaYear = now.getFullYear();
  payMonth = apaMonth = now.getMonth();
  bindEvents();
}

/* ═══════════ CHẤM CÔNG & LƯƠNG CỦA TÔI ═══════════ */

export function openMyAttendancePayroll() {
  const now = new Date();
  payYear = now.getFullYear(); payMonth = now.getMonth();
  $('[data-aptab="att"]').click();
  openModal('myAttendancePayrollModal');
}

function updatePayMonthLabel() {
  $('#apMonthLabel').textContent = `Tháng ${payMonth + 1}/${payYear}`;
}

async function loadTodaySessions() {
  const box = $('#atmList');
  setHTML(box, loadingHTML('Đang tải ca dạy hôm nay...'));

  const { ok, data, error } = await tryApi('getTodaySessions', { maNV: user.maNV });
  if (!ok) return setHTML(box, errorHTML(error.message));

  const sessions = data.sessions || [];
  if (!sessions.length)
    return setHTML(box, emptyHTML('Hôm nay bạn không có ca dạy nào theo lịch đã đăng ký.', 'fa-mug-hot'));

  setHTML(box, sessions.map(s => {
    const b = findBranch(s.coSo);
    const chuaDiemDanh = !s.trangThai || s.trangThai === 'Chưa điểm danh';
    let action;

    if (chuaDiemDanh) {
      action = `<button class="btn-approve" style="padding:8px 16px"
        data-checkin="${esc(s.id)}" data-coso="${esc(s.coSo)}" data-ca="${esc(s.ca)}" data-ngay="${esc(s.ngay)}">
        <i class="fa-solid fa-camera" aria-hidden="true"></i> Check-in</button>`;
    } else if (s.trangThai === 'Đang dạy') {
      action = `<button class="btn-warning" data-checkout="${esc(s.id)}">
        <i class="fa-solid fa-person-walking-arrow-right" aria-hidden="true"></i> Check-out</button>`;
    } else {
      action = `<div style="text-align:right">${statusBadge(s.trangThai)}
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6">
          ${s.thoiGianCheckin ? '🕒 Vào: ' + esc(s.thoiGianCheckin) : ''}
          ${s.thoiGianCheckout ? '<br>🕒 Ra: ' + esc(s.thoiGianCheckout) : ''}
          ${s.khoangCachCheckinMet ? '<br>📏 Lệch: ' + esc(s.khoangCachCheckinMet) + 'm' : ''}
        </div></div>`;
    }

    return `<div class="approval-row" style="border-left-color:${chuaDiemDanh ? 'var(--red)' : 'var(--primary-blue)'}">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(formatDate(s.ngay))} — ${esc(b ? b.name : s.coSo)}</div>
          <div class="approval-meta">${esc(shiftLabel(s.ca))}${
            s.soHocVien ? ' · Sĩ số: <strong style="color:var(--text-main)">' + esc(s.soHocVien) + '</strong>' : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">${action}</div>
      </div>
    </div>`;
  }).join(''));
}

async function loadMyPayroll() {
  const box = $('#apPayrollBox');
  setHTML(box, loadingHTML());
  const { ok, data, error } = await tryApi('getPayrollSummary',
    { maNV: user.maNV, thang: payMonth + 1, nam: payYear });
  if (!ok) return setHTML(box, errorHTML(error.message));

  const p = data.summary || {};
  setHTML(box, `
    <div class="payroll-summary-box">
      <div class="payroll-stat">
        <div class="db-info-label">Số buổi đã duyệt</div>
        <div class="db-info-value" style="color:var(--primary-blue);font-size:24px">${esc(p.soBuoiDaDuyet || 0)}</div>
      </div>
      <div class="payroll-stat">
        <div class="db-info-label">Đơn giá / buổi</div>
        <div class="db-info-value">${esc(formatMoney(p.donGia))}</div>
      </div>
      <div class="payroll-stat wide highlight">
        <div class="db-info-label">Tổng lương tạm tính</div>
        <div class="db-info-value" style="color:var(--primary-blue);font-size:28px">${esc(formatMoney(p.tongLuong))}</div>
      </div>
      <div class="payroll-stat wide">
        <div class="db-info-label">Trạng thái</div>
        <div style="margin-top:8px">${statusBadge(p.trangThai || 'Đang tính')}</div>
      </div>
    </div>
    <p class="form-hint" style="margin-top:18px;text-align:center">
      Lương tính theo số buổi dạy đã được HLV Trưởng/Admin duyệt điểm danh trong tháng.
      Số liệu tạm tính có thể thay đổi cho tới khi bảng lương được duyệt chính thức.
    </p>`);
}

/* ═══════════ ĐIỂM DANH: CAMERA + GPS ═══════════ */

let ckSession = null, ckStream = null, ckPhoto = null, ckLocation = null;

function openCheckinModal(id, coSo, ca, ngay) {
  ckSession = { id, coSo, ca, ngay };
  ckPhoto = null; ckLocation = null;

  const b = findBranch(coSo);
  $('#ckInfo').textContent = `${formatDate(ngay)} — ${b ? b.name : coSo} — ${shiftLabel(ca)}`;
  $('#ckStep1').style.display = 'block';
  $('#ckStep2').style.display = 'none';
  $('#ckVideo').style.display = 'none';
  $('#ckOpenCamBtn').style.display = 'block';
  $('#ckCaptureBtn').style.display = 'none';
  $('#ckSoHocVien').value = '';
  $('#ckLocStatus').textContent = '📍 Đang lấy vị trí GPS, vui lòng cho phép truy cập vị trí...';

  openModal('checkinModal', { onClose: stopCamera });

  if (!navigator.geolocation) {
    $('#ckLocStatus').textContent = '⚠️ Trình duyệt không hỗ trợ định vị GPS.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      ckLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      $('#ckLocStatus').textContent = `✅ Đã xác định vị trí (độ chính xác ~${Math.round(pos.coords.accuracy)}m)`;
    },
    () => { $('#ckLocStatus').textContent = '❌ Chưa lấy được GPS. Hãy bật định vị và cho phép truy cập vị trí.'; },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function stopCamera() {
  if (ckStream) { ckStream.getTracks().forEach(t => t.stop()); ckStream = null; }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    ckStream = stream;
    const video = $('#ckVideo');
    video.srcObject = stream;
    video.style.display = 'block';
    $('#ckOpenCamBtn').style.display = 'none';
    $('#ckCaptureBtn').style.display = 'block';
  } catch {
    toastError('Không truy cập được camera. Vui lòng cấp quyền camera cho trình duyệt.');
  }
}

function capturePhoto() {
  // Thu nhỏ về 480px ngay tại máy: ~39KB thay vì ~260KB.
  // Giảm 85% dung lượng Drive và tránh timeout khi gửi qua mạng 4G.
  ckPhoto = captureFromVideo($('#ckVideo'), { maxSize: 480, quality: 0.72, mirror: true });
  stopCamera();

  $('#ckPreviewImg').src = ckPhoto;
  $('#ckLocationDisplay').textContent =
    (ckLocation
      ? `📍 Toạ độ ghi nhận: ${ckLocation.lat.toFixed(6)}, ${ckLocation.lng.toFixed(6)}`
      : '⚠️ Chưa có dữ liệu vị trí GPS.')
    + ` · Ảnh ${dataUrlSizeKB(ckPhoto)}KB`;
  $('#ckStep1').style.display = 'none';
  $('#ckStep2').style.display = 'block';
}

function retakePhoto() {
  ckPhoto = null;
  $('#ckStep2').style.display = 'none';
  $('#ckStep1').style.display = 'block';
  $('#ckOpenCamBtn').style.display = 'block';
  $('#ckCaptureBtn').style.display = 'none';
  $('#ckVideo').style.display = 'none';
}

async function finalizeCheckin() {
  if (!ckPhoto) return toastError('Vui lòng chụp ảnh xác thực.');
  if (!ckLocation) return toastError('Chưa lấy được vị trí GPS. Vui lòng bật định vị thiết bị.');

  const btn = $('#ckSaveBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang xác thực...';
  btn.disabled = true;

  const b = findBranch(ckSession.coSo);
  try {
    await callApi('checkIn', {
      maNV: user.maNV, hoTen: user.hoTen || user.full_name,
      maCoSo: b ? b.code : ckSession.coSo, coSo: ckSession.coSo,
      ca: ckSession.ca, ngay: ckSession.ngay,
      soHocVien: $('#ckSoHocVien').value || 0,
      photoBase64: ckPhoto, lat: ckLocation.lat, lng: ckLocation.lng,
    }, { timeout: 45000 });          // ảnh đã thu nhỏ nhưng mạng 4G vẫn có thể chậm

    closeModal('checkinModal');
    await loadTodaySessions();
    toastSuccess('Check-in thành công. Ca học đang diễn ra.');
  } catch (err) {
    if (err.code === 'GPS_OUT_OF_RANGE') {
      const d = err.data || {};
      toastError(`Bạn đang cách ${d.distance}m so với ${b ? b.name : ckSession.coSo} `
               + `(cho phép ${d.allowed}m). Vui lòng tới gần trung tâm để điểm danh.`, 9000);
    } else {
      toastApiError(err);
    }
  } finally {
    btn.innerHTML = original; btn.disabled = false;
  }
}

async function processCheckOut(id) {
  if (!navigator.geolocation) return toastError('Trình duyệt không hỗ trợ GPS để check-out.');
  if (!await confirmDialog('Bạn chắc chắn muốn kết thúc ca dạy này?', { title: 'Check-out', okText: 'Kết thúc ca' })) return;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        await callApi('checkOut', { id, maNV: user.maNV, lat: pos.coords.latitude, lng: pos.coords.longitude });
        await loadTodaySessions();
        toastSuccess('Check-out thành công. Dữ liệu đã gửi chờ duyệt.');
      } catch (e) { toastApiError(e); }
    },
    () => toastError('Không lấy được vị trí GPS. Vui lòng kiểm tra quyền truy cập vị trí.'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ═══════════ DUYỆT CHẤM CÔNG & LƯƠNG ═══════════ */

export function openApproveAttendancePayroll() {
  const now = new Date();
  apaYear = now.getFullYear(); apaMonth = now.getMonth();
  updateApaMonthLabel();
  $('[data-apatab="att"]').click();
  openModal('approveAttendancePayrollModal');
}

function updateApaMonthLabel() {
  $('#approvalMonthLabel').textContent = `Tháng ${apaMonth + 1}/${apaYear}`;
}

async function loadPendingAttendance() {
  const box = $('#apaAttendanceList');
  setHTML(box, loadingHTML());
  const { ok, data, error } = await tryApi('listPendingAttendance', { maNV: user.maNV });
  if (!ok) return setHTML(box, errorHTML(error.message));

  const list = data.records || [];
  if (!list.length) return setHTML(box, emptyHTML('Không có buổi điểm danh nào đang chờ duyệt.', 'fa-circle-check'));

  setHTML(box, list.map(r => {
    const b = findBranch(r.coSo);
    const xa = Number(r.khoangCachCheckinMet) > 100;
    return `<div class="approval-row">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(r.hoTen)}
            <span style="color:var(--text-muted);font-weight:400;font-size:12px">(${esc(b ? b.name : r.coSo)})</span></div>
          <div class="approval-meta">
            ${esc(formatDate(r.ngay))} · ${esc(shiftLabel(r.ca))}${
              r.soHocVien ? ' · Sĩ số: <strong style="color:var(--text-main)">' + esc(r.soHocVien) + '</strong>' : ''}
            ${r.thoiGianCheckin ? '<br>🕒 Vào: ' + esc(r.thoiGianCheckin) : ''}
            ${r.thoiGianCheckout ? '<br>🕒 Ra: ' + esc(r.thoiGianCheckout) : ''}
            ${r.khoangCachCheckinMet
              ? `<br>📏 Sai số GPS: <strong style="color:${xa ? 'var(--red)' : 'var(--text-main)'}">${esc(r.khoangCachCheckinMet)}m</strong>`
              : ''}
            ${r.lat ? `<br><a href="https://maps.google.com/?q=${encodeURIComponent(r.lat + ',' + r.lng)}" target="_blank" rel="noopener">📍 Xem vị trí</a>` : ''}
            ${r.photoUrl ? ` · <a href="${esc(r.photoUrl)}" target="_blank" rel="noopener">🖼️ Ảnh xác thực</a>` : ''}
          </div>
        </div>
        ${statusBadge(r.trangThai)}
      </div>
      <div class="approval-actions">
        <button class="btn-approve" data-att-ok="${esc(r.id)}">Duyệt</button>
        <button class="btn-reject" data-att-no="${esc(r.id)}">Từ chối</button>
      </div>
    </div>`;
  }).join(''));
}

async function loadPayrollBatch() {
  const box = $('#apaPayrollList');
  setHTML(box, loadingHTML());
  const { ok, data, error } = await tryApi('listPayrollBatch',
    { maNV: user.maNV, thang: apaMonth + 1, nam: apaYear });
  if (!ok) return setHTML(box, errorHTML(error.message));

  const list = data.batch || [];
  if (!list.length) return setHTML(box, emptyHTML('Không có dữ liệu lương cho tháng này.', 'fa-wallet'));

  setHTML(box, list.map(b => {
    const br = findBranch(b.coSo);
    return `<div class="approval-row">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(b.hoTen)}
            <span style="color:var(--text-muted);font-weight:400;font-size:12px">(${esc(br ? br.name : b.coSo)})</span></div>
          <div class="approval-meta">${esc(b.soBuoiDaDuyet)} buổi × ${esc(formatNumber(b.donGia))}đ =
            <strong style="color:var(--primary-blue);font-size:15px">${esc(formatMoney(b.tongLuong))}</strong></div>
        </div>
        ${statusBadge(b.trangThai)}
      </div>
      ${b.trangThai === 'Chờ duyệt'
        ? `<div class="approval-actions"><button class="btn-approve" data-pay-ok="${esc(b.maNV)}">Duyệt lương</button></div>`
        : ''}
    </div>`;
  }).join(''));
}

/* ═══════════ GẮN SỰ KIỆN ═══════════ */

function bindEvents() {
  // Tab "Chấm công & Lương của tôi"
  $('#myAttendancePayrollModal')?.addEventListener('tabchange', ev => {
    if (ev.detail.group !== 'aptab') return;
    const isPay = ev.detail.value === 'pay';
    // Thanh chuyển tháng chỉ có ý nghĩa với bảng lương
    $('#apMonthNav').style.display = isPay ? '' : 'none';
    if (isPay) { updatePayMonthLabel(); loadMyPayroll(); }
    else loadTodaySessions();
  });

  $('#apPrevMonth')?.addEventListener('click', () => {
    if (--payMonth < 0) { payMonth = 11; payYear--; }
    updatePayMonthLabel(); loadMyPayroll();
  });
  $('#apNextMonth')?.addEventListener('click', () => {
    if (++payMonth > 11) { payMonth = 0; payYear++; }
    updatePayMonthLabel(); loadMyPayroll();
  });

  // Tab duyệt
  $('#approveAttendancePayrollModal')?.addEventListener('tabchange', ev => {
    if (ev.detail.group !== 'apatab') return;
    ev.detail.value === 'att' ? loadPendingAttendance() : loadPayrollBatch();
  });
  $('#apaPrevMonth')?.addEventListener('click', () => {
    if (--apaMonth < 0) { apaMonth = 11; apaYear--; }
    updateApaMonthLabel(); loadPayrollBatch();
  });
  $('#apaNextMonth')?.addEventListener('click', () => {
    if (++apaMonth > 11) { apaMonth = 0; apaYear++; }
    updateApaMonthLabel(); loadPayrollBatch();
  });

  // Điểm danh
  $('#atmList')?.addEventListener('click', ev => {
    const inBtn = ev.target.closest('[data-checkin]');
    if (inBtn) return openCheckinModal(inBtn.dataset.checkin, inBtn.dataset.coso, inBtn.dataset.ca, inBtn.dataset.ngay);
    const outBtn = ev.target.closest('[data-checkout]');
    if (outBtn) return processCheckOut(outBtn.dataset.checkout);
  });

  $('#ckOpenCamBtn')?.addEventListener('click', startCamera);
  $('#ckCaptureBtn')?.addEventListener('click', capturePhoto);
  $('#ckRetakeBtn')?.addEventListener('click', retakePhoto);
  $('#ckSaveBtn')?.addEventListener('click', finalizeCheckin);

  // Duyệt điểm danh
  $('#apaAttendanceList')?.addEventListener('click', async ev => {
    const okBtn = ev.target.closest('[data-att-ok]');
    const noBtn = ev.target.closest('[data-att-no]');
    if (!okBtn && !noBtn) return;

    if (okBtn) {
      if (!await confirmDialog('Duyệt buổi điểm danh này?')) return;
      try {
        await callApi('decideAttendance', { id: okBtn.dataset.attOk, quyetDinh: 'Đã duyệt', lyDoTuChoi: '', maNV: user.maNV });
        await loadPendingAttendance();
        toastSuccess('Đã duyệt điểm danh.');
      } catch (e) { toastApiError(e); }
      return;
    }

    // Từ chối thì BẮT BUỘC nhập lý do
    const lyDo = await promptDialog('Lý do từ chối', {
      title: 'Từ chối điểm danh', placeholder: 'VD: Ảnh không rõ mặt, sai vị trí...', required: true,
    });
    if (!lyDo) return;
    try {
      await callApi('decideAttendance', {
        id: noBtn.dataset.attNo, quyetDinh: 'Điểm danh không hợp lệ', lyDoTuChoi: lyDo, maNV: user.maNV,
      });
      await loadPendingAttendance();
      toastSuccess('Đã từ chối buổi điểm danh.');
    } catch (e) { toastApiError(e); }
  });

  // Duyệt lương
  $('#apaPayrollList')?.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-pay-ok]');
    if (!btn) return;
    if (!await confirmDialog(`Duyệt bảng lương tháng ${apaMonth + 1}/${apaYear} cho nhân viên này?`,
        { title: 'Duyệt lương', okText: 'Duyệt' })) return;
    try {
      await callApi('decidePayroll', {
        maNV: btn.dataset.payOk, thang: apaMonth + 1, nam: apaYear, nguoiDuyet: user.maNV,
      });
      await loadPayrollBatch();
      toastSuccess('Đã duyệt bảng lương.');
    } catch (e) { toastApiError(e); }
  });
}
