/* =============================================================
   HỒ SƠ VÕ SINH — lễ tân tạo hồ sơ, cả cơ sở tra cứu.

   Nguyên tắc quan trọng nhất ở màn hình này: KHÔNG có ô nhập mã học viên.
   Mã do máy chủ sinh theo {code cơ sở}{2 số năm}{4 số thứ tự} — VD HP260012.
   Mã gõ tay sớm muộn cũng trùng, mà trùng mã thì học phí, điểm danh, nhận xét
   của hai em lẫn vào nhau, gỡ ra rất khổ.

   Ảnh thẻ không để link Drive công khai: ảnh trẻ em, ai cầm được link là xem
   được. Ảnh đi qua action anhVoSinh, máy chủ kiểm quyền rồi mới trả về.
   ============================================================= */

import { $, $$, esc, setHTML } from '../core/dom.js';
import { callApi, tryApi } from '../core/api.js';
import {
  openModal, toastSuccess, toastError, toastApiError,
  confirmDialog, loadingHTML, emptyHTML, errorHTML,
} from '../core/ui.js';
import { BRANCHES, findBranch } from '../core/config.js';

let user = null;
let timerTim = null;

/* Ảnh đã tải về giữ lại trong bộ nhớ phiên: mỗi lần lấy ảnh là một lệnh gọi
   Apps Script mất vài trăm mili giây, mở đi mở lại một hồ sơ không nên gọi lại. */
const khoAnh = new Map();

const duocSua = () => ['le_tan', 'admin', 'hlv_truong'].includes(user?.role);

function tenCoSo(id) {
  const b = findBranch(id);
  return b ? b.name : (id || '—');
}

/* ---------------- Ảnh ---------------- */

/** Thu nhỏ ảnh ngay trên máy trước khi gửi.

    Ảnh điện thoại giờ 3–8 MB. Gửi nguyên cỡ đó qua Apps Script thì vừa chậm
    vừa dễ vượt giới hạn, mà ảnh thẻ hiển thị có 220px nên không cần to. */
function thuNhoAnh(file, canhToiDa = 640, chatLuong = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp này không phải ảnh hợp lệ.'));
      img.onload = () => {
        const tile = Math.min(1, canhToiDa / Math.max(img.width, img.height));
        const w = Math.round(img.width * tile);
        const h = Math.round(img.height * tile);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';           // ảnh PNG trong suốt sang JPEG sẽ thành đen
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', chatLuong));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function layAnh(maHV) {
  if (khoAnh.has(maHV)) return khoAnh.get(maHV);
  const { ok, data } = await tryApi('anhVoSinh', { maHV });
  const anh = ok ? (data.anh || '') : '';
  khoAnh.set(maHV, anh);
  return anh;
}

function anhHTML(anh, hoTen) {
  if (anh) {
    return `<img src="${esc(anh)}" alt="Ảnh thẻ ${esc(hoTen)}" class="vs-anh">`;
  }
  const chu = (hoTen || '?').trim().split(/\s+/).at(-1).charAt(0).toUpperCase();
  return `<div class="vs-anh vs-anh-trong" aria-hidden="true">${esc(chu)}</div>`;
}

/* ---------------- Danh sách ---------------- */

async function loadDanhSach() {
  const box = $('#vsList');
  setHTML(box, loadingHTML('Đang tải danh sách võ sinh...'));
  setHTML('#vsCount', '');

  const tham = {};
  const coSo = $('#vsFilterBranch')?.value;
  if (coSo) tham.coSo = coSo;
  const tt = $('#vsFilterStatus').value;
  if (tt) tham.trangThai = tt;
  const tim = $('#vsSearch').value.trim();
  if (tim) tham.tim = tim;

  const { ok, data, error } = await tryApi('danhSachVoSinh', tham);
  if (!ok) return setHTML(box, errorHTML(error.message));

  const list = data.students || [];
  if (!list.length) {
    setHTML(box, emptyHTML(tim || tt || coSo
      ? 'Không có võ sinh nào khớp bộ lọc.'
      : 'Chưa có hồ sơ võ sinh nào. Sang tab "Tạo hồ sơ" để thêm em đầu tiên.', 'fa-user-slash'));
    return;
  }

  setHTML('#vsCount', data.catBot
    ? `Hiện ${list.length} trong tổng số ${data.tong} em — thu hẹp bộ lọc để thấy phần còn lại.`
    : `${data.tong} võ sinh.`);

  setHTML(box, list.map(v => {
    const nghi = /nghỉ/i.test(v.trangThai || '');
    const baoLuu = /bảo lưu/i.test(v.trangThai || '');
    return `<div class="approval-row">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(v.hoTen || '(chưa có tên)')}
            <span style="color:var(--text-muted);font-weight:400;font-size:12px">
              ${v.tuoi !== '' ? esc(String(v.tuoi)) + ' tuổi' : 'chưa rõ tuổi'}${v.gioiTinh ? ' · ' + esc(v.gioiTinh) : ''}</span>
          </div>
          <div class="approval-meta">
            Mã HV: <strong style="color:var(--text-main)">${esc(v.maHV)}</strong>
            · ${esc(tenCoSo(v.coSo))}
            ${v.capDai ? ' · ' + esc(v.capDai) : ''}
            ${v.coAnh ? ' · <span title="Đã có ảnh thẻ">📷</span>' : ''}
            ${v.maPH ? '<br>Phụ huynh: ' + esc(v.maPH)
                     : '<br><span style="color:var(--red)">Chưa gắn mã phụ huynh — phụ huynh chưa xem được hồ sơ này</span>'}
          </div>
        </div>
        <span class="status-badge ${nghi ? 'rejected' : baoLuu ? 'pending' : 'approved'}">${esc(v.trangThai || '—')}</span>
      </div>
      <div class="approval-actions">
        <button class="btn-secondary" style="padding:8px 14px" data-vs-xem="${esc(v.maHV)}">Xem hồ sơ</button>
        ${duocSua() ? `<button class="btn-secondary" style="padding:8px 14px" data-vs-sua="${esc(v.maHV)}">Sửa</button>` : ''}
      </div>
    </div>`;
  }).join(''));
}

/* ---------------- Xem một hồ sơ ---------------- */

async function xemHoSo(maHV) {
  const { ok, data, error } = await tryApi('danhSachVoSinh', { tim: maHV });
  if (!ok) return toastError(error.message);
  const v = (data.students || []).find(x => x.maHV === maHV);
  if (!v) return toastError('Không tìm thấy hồ sơ này.');

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay open';
  wrap.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" style="max-width:460px">
      <div class="modal-header"><div class="modal-title">${esc(v.hoTen)}</div>
        <button class="modal-close" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <div class="vs-ho-so">
          <div id="vsAnhBox">${anhHTML('', v.hoTen)}</div>
          <dl class="vs-thongtin">
            <dt>Mã học viên</dt><dd><strong>${esc(v.maHV)}</strong></dd>
            <dt>Cơ sở</dt><dd>${esc(tenCoSo(v.coSo))}</dd>
            <dt>Tuổi</dt><dd>${v.tuoi !== '' ? esc(String(v.tuoi)) : '—'}${v.ngaySinh ? ` (sinh ${esc(v.ngaySinh)})` : ''}</dd>
            <dt>Giới tính</dt><dd>${esc(v.gioiTinh || '—')}</dd>
            <dt>Cấp đai</dt><dd>${esc(v.capDai || 'chưa có')}</dd>
            <dt>Số buổi/tuần</dt><dd>${v.soBuoiTuan !== '' ? esc(String(v.soBuoiTuan)) : '—'}</dd>
            <dt>Nhập học</dt><dd>${esc(v.ngayNhapHoc || '—')}</dd>
            <dt>Mã phụ huynh</dt><dd>${esc(v.maPH || 'chưa gắn')}</dd>
            <dt>Trạng thái</dt><dd>${esc(v.trangThai || '—')}</dd>
          </dl>
        </div>
      </div>
      <div class="modal-footer"><button type="button" class="btn-cancel">Đóng</button></div>
    </div>`;
  document.body.appendChild(wrap);
  const dong = () => wrap.remove();
  wrap.querySelector('.modal-close').addEventListener('click', dong);
  wrap.querySelector('.btn-cancel').addEventListener('click', dong);

  if (v.coAnh) {
    layAnh(maHV).then(anh => {
      const box = wrap.querySelector('#vsAnhBox');
      if (box) setHTML(box, anhHTML(anh, v.hoTen));
    });
  }
}

/* ---------------- Tạo hồ sơ ---------------- */

let anhDangChon = '';

async function chonAnh(ev) {
  const file = ev.target.files?.[0];
  const xem = $('#vsAnhPreview');
  anhDangChon = '';
  setHTML(xem, '');
  if (!file) return;
  if (!/^image\//.test(file.type)) return toastError('Tệp này không phải ảnh.');
  try {
    anhDangChon = await thuNhoAnh(file);
    const kb = Math.round(anhDangChon.length * 0.75 / 1024);
    setHTML(xem, `<div class="vs-ho-so" style="margin-top:10px">
      ${anhHTML(anhDangChon, '')}
      <div class="form-hint">Đã thu nhỏ còn khoảng ${kb} KB.<br>
        <button type="button" class="btn-secondary" style="padding:6px 12px;margin-top:8px" id="vsBoAnh">Bỏ ảnh</button></div>
    </div>`);
    $('#vsBoAnh').addEventListener('click', () => {
      anhDangChon = ''; $('#vsAnh').value = ''; setHTML(xem, '');
    });
  } catch (e) {
    toastError(e.message);
  }
}

async function taoHoSo() {
  const hoTen = $('#vsHoTen').value.trim();
  const tuoi = $('#vsTuoi').value.trim();
  const ngaySinh = $('#vsNgaySinh').value;
  const err = $('#vsErr');
  err.classList.remove('visible');

  if (hoTen.length < 2 || (!tuoi && !ngaySinh)) { err.classList.add('visible'); return; }

  const coSo = $('#vsCoSo').value;
  if (user.role === 'admin' && !coSo) return toastError('Chọn cơ sở cho võ sinh này.');

  const maPH = $('#vsMaPH').value.trim();
  if (!maPH && !await confirmDialog(
    'Chưa gắn mã phụ huynh. Hồ sơ vẫn tạo được, nhưng phụ huynh đăng nhập sẽ không thấy con mình '
    + 'cho tới khi gắn mã. Vẫn tạo?', { title: 'Chưa có mã phụ huynh', okText: 'Vẫn tạo' })) return;

  const btn = $('#vsCreateBtn');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang tạo...'; btn.disabled = true;
  try {
    const res = await callApi('taoVoSinh', {
      hoTen, tuoi, ngaySinh, coSo,
      gioiTinh: $('#vsGioiTinh').value,
      soBuoiTuan: $('#vsSoBuoi').value.trim(),
      maPH, anhThe: anhDangChon,
    });

    setHTML('#vsNewResult', `<div class="note-box" style="margin-top:14px">
      Đã tạo hồ sơ cho <strong>${esc(hoTen)}</strong>.<br>
      Mã học viên: <strong style="font-size:20px;letter-spacing:1px">${esc(res.maHV)}</strong><br>
      <span style="color:var(--text-muted)">
        ${res.coAnh ? 'Ảnh thẻ đã lưu.' : 'Chưa có ảnh thẻ — bổ sung sau bằng nút Sửa.'}
        Đọc mã này cho phụ huynh ghi lại.</span>
    </div>`);
    toastSuccess(`Đã tạo hồ sơ ${res.maHV}.`);

    ['#vsHoTen', '#vsTuoi', '#vsNgaySinh', '#vsMaPH', '#vsSoBuoi', '#vsAnh'].forEach(s => { $(s).value = ''; });
    $('#vsGioiTinh').value = '';
    anhDangChon = '';
    setHTML('#vsAnhPreview', '');
    loadDanhSach();
  } catch (e) { toastApiError(e); }
  finally { btn.innerHTML = original; btn.disabled = false; }
}

/* ---------------- Sửa hồ sơ ---------------- */

async function suaHoSo(maHV) {
  const { ok, data, error } = await tryApi('danhSachVoSinh', { tim: maHV });
  if (!ok) return toastError(error.message);
  const v = (data.students || []).find(x => x.maHV === maHV);
  if (!v) return toastError('Không tìm thấy hồ sơ này.');

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay open';
  wrap.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" style="max-width:480px">
      <div class="modal-header"><div class="modal-title">Sửa hồ sơ — ${esc(v.maHV)}</div></div>
      <div class="modal-body">
        <div class="form-group"><label for="svHoTen">Họ và tên</label>
          <input type="text" id="svHoTen" value="${esc(v.hoTen)}"></div>
        <div class="form-row">
          <div class="form-group"><label for="svNgaySinh">Ngày sinh</label>
            <div class="field-date"><input type="date" id="svNgaySinh" value="${esc(v.ngaySinh || '')}"></div></div>
          <div class="form-group"><label for="svGioiTinh">Giới tính</label>
            <select id="svGioiTinh">
              <option value="">— Chưa rõ —</option>
              <option value="Nam"${v.gioiTinh === 'Nam' ? ' selected' : ''}>Nam</option>
              <option value="Nữ"${v.gioiTinh === 'Nữ' ? ' selected' : ''}>Nữ</option>
            </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="svCapDai">Cấp đai</label>
            <input type="text" id="svCapDai" value="${esc(v.capDai || '')}" placeholder="VD: Đai vàng"></div>
          <div class="form-group"><label for="svSoBuoi">Số buổi/tuần</label>
            <input type="number" id="svSoBuoi" min="1" max="7" value="${esc(String(v.soBuoiTuan ?? ''))}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="svMaPH">Mã phụ huynh</label>
            <input type="text" id="svMaPH" value="${esc(v.maPH || '')}" placeholder="VD: PH001"></div>
          <div class="form-group"><label for="svTrangThai">Trạng thái</label>
            <select id="svTrangThai">
              ${['Đang học', 'Bảo lưu', 'Nghỉ'].map(t =>
                `<option value="${t}"${v.trangThai === t ? ' selected' : ''}>${t}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-group"><label for="svAnh">Đổi ảnh thẻ</label>
          <input type="file" id="svAnh" accept="image/*">
          <p class="form-hint">Bỏ trống thì giữ ảnh cũ.</p></div>
        <p class="form-hint">Mã học viên và cơ sở không sửa ở đây: đổi mã là mất liên kết với
           học phí và điểm danh, đổi cơ sở là chuyển em sang tầm nhìn của người khác.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" id="svHuy">Huỷ</button>
        <button type="button" class="btn-save" id="svLuu">Lưu</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const dong = () => wrap.remove();
  wrap.querySelector('#svHuy').addEventListener('click', dong);

  let anhMoi = '';
  wrap.querySelector('#svAnh').addEventListener('change', async ev => {
    const f = ev.target.files?.[0];
    if (!f) { anhMoi = ''; return; }
    try { anhMoi = await thuNhoAnh(f); } catch (e) { toastError(e.message); anhMoi = ''; }
  });

  wrap.querySelector('#svLuu').addEventListener('click', async () => {
    const hoTen = wrap.querySelector('#svHoTen').value.trim();
    if (hoTen.length < 2) return toastError('Họ tên không hợp lệ.');
    const nut = wrap.querySelector('#svLuu');
    nut.disabled = true; nut.innerHTML = 'Đang lưu...';
    try {
      await callApi('suaVoSinh', {
        maHV, hoTen,
        ngaySinh: wrap.querySelector('#svNgaySinh').value,
        gioiTinh: wrap.querySelector('#svGioiTinh').value,
        capDaiHienTai: wrap.querySelector('#svCapDai').value.trim(),
        soBuoiTuan: wrap.querySelector('#svSoBuoi').value.trim(),
        maPH: wrap.querySelector('#svMaPH').value.trim(),
        trangThai: wrap.querySelector('#svTrangThai').value,
        anhThe: anhMoi,
      });
      if (anhMoi) khoAnh.delete(maHV);        // ảnh đổi rồi, đừng dùng bản cũ trong bộ nhớ
      dong();
      toastSuccess('Đã lưu hồ sơ.');
      loadDanhSach();
    } catch (e) {
      toastApiError(e);
      nut.disabled = false; nut.innerHTML = 'Lưu';
    }
  });
}

/* ---------------- Khởi động ---------------- */

export function openStudentsModal() {
  const laAdmin = user?.role === 'admin';

  // Nhân viên cơ sở chỉ thấy cơ sở mình, hiện ô lọc chỉ tổ gây hiểu nhầm
  $('#vsFilterBranchGroup').style.display = laAdmin ? '' : 'none';
  $('#vsCoSoGroup').style.display = laAdmin ? '' : 'none';
  if (laAdmin) {
    setHTML('#vsFilterBranch', '<option value="">Tất cả cơ sở</option>' +
      BRANCHES.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''));
    setHTML('#vsCoSo', '<option value="">— Chọn cơ sở —</option>' +
      BRANCHES.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''));
  }

  const suaDuoc = duocSua();
  $('#vsTabNew').style.display = suaDuoc ? '' : 'none';
  $('#vsCreateBtn').style.display = suaDuoc ? '' : 'none';

  $('[data-mtab="vslist"]', $('#studentsModal')).click();
  $('#vsErr').classList.remove('visible');
  setHTML('#vsNewResult', '');
  openModal('studentsModal');
  loadDanhSach();
}

export function initStudents(u) {
  user = u;

  $('#vsFilterBranch')?.addEventListener('change', loadDanhSach);
  $('#vsFilterStatus')?.addEventListener('change', loadDanhSach);
  // Gõ tới đâu lọc tới đó, nhưng chờ ngừng gõ 350ms để không bắn liên tiếp
  $('#vsSearch')?.addEventListener('input', () => {
    clearTimeout(timerTim);
    timerTim = setTimeout(loadDanhSach, 350);
  });

  $('#vsAnh')?.addEventListener('change', chonAnh);
  $('#vsCreateBtn')?.addEventListener('click', taoHoSo);
  $('#vsNewForm')?.addEventListener('submit', ev => { ev.preventDefault(); taoHoSo(); });

  // Nút trên từng dòng: danh sách dựng động nên uỷ quyền sự kiện
  $('#vsList')?.addEventListener('click', ev => {
    const xem = ev.target.closest('[data-vs-xem]');
    const sua = ev.target.closest('[data-vs-sua]');
    if (xem) return xemHoSo(xem.dataset.vsXem);
    if (sua) return suaHoSo(sua.dataset.vsSua);
  });

  // Nút tab "Tạo hồ sơ" nằm trong footer chung, ẩn/hiện theo tab đang mở
  $$('#studentsModal [data-mtab]').forEach(btn => btn.addEventListener('click', () => {
    const oTabTao = btn.dataset.mtab === 'vsnew';
    $('#vsCreateBtn').style.display = (oTabTao && duocSua()) ? '' : 'none';
  }));
}
