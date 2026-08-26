/* =============================================================
   QUẢN LÝ TÀI KHOẢN — chỉ admin thấy màn hình này.

   Trước đây muốn thêm một tài khoản phải mở Apps Script chạy hàm tay. Nay
   admin tạo ngay trên giao diện: điền tên, số điện thoại, vai trò, cơ sở —
   hệ thống sinh mật khẩu tạm và hiện đúng một lần để admin gửi cho người
   dùng. Không có chỗ nào xem lại được mật khẩu, kể cả admin: bảng tài khoản
   chỉ lưu chuỗi băm.
   ============================================================= */

import { $, $$, esc, setHTML } from '../core/dom.js';
import { callApi, tryApi } from '../core/api.js';
import {
  openModal, toastSuccess, toastError, toastApiError,
  confirmDialog, loadingHTML, emptyHTML, errorHTML,
} from '../core/ui.js';
import { BRANCHES, findBranch, ROLE_LABELS, normalizeRole } from '../core/config.js';
import { isValidPhone, isValidEmail } from '../core/format.js';

let user = null;

const NHOM_VAI_TRO = [
  { id: 'admin',      nhan: 'Quản trị viên' },
  { id: 'hlv_truong', nhan: 'HLV Trưởng' },
  { id: 'hlv',        nhan: 'Huấn luyện viên' },
  { id: 'le_tan',     nhan: 'Lễ tân' },
  { id: 'phu_huynh',  nhan: 'Phụ huynh' },
];

function nhanVaiTro(v) {
  return ROLE_LABELS[normalizeRole(v)] || v || '—';
}

function optionCoSo(chon) {
  return '<option value="">— Không gắn cơ sở (toàn hệ thống) —</option>' +
    BRANCHES.map(b =>
      `<option value="${esc(b.id)}"${b.id === chon ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
}

/* ---------------- Danh sách ---------------- */

async function loadDanhSach() {
  const box = $('#acList');
  setHTML(box, loadingHTML('Đang tải danh sách tài khoản...'));

  const coSo = $('#acFilterBranch').value;
  const { ok, data, error } = await tryApi('danhSachTaiKhoan', coSo ? { coSo } : {});
  if (!ok) return setHTML(box, errorHTML(error.message));

  const list = data.items || [];
  if (!list.length) return setHTML(box, emptyHTML('Chưa có tài khoản nào ở phạm vi này.', 'fa-user-slash'));

  setHTML(box, list.map(tk => {
    const b = findBranch(tk.coSo);
    const khoa = /kho/i.test(tk.trangThai || '');
    const vt = normalizeRole(tk.vaiTro);
    // Không cơ sở: admin nghĩa là toàn hệ thống, phụ huynh thì vốn không có cơ sở,
    // còn nhân viên mà trống là thiếu dữ liệu — phải nói rõ để admin sửa
    const phamVi = tk.coSo ? ' · ' + esc(b ? b.name : tk.coSo)
      : (vt === 'admin' ? ' · toàn hệ thống'
        : vt === 'phu_huynh' ? ''
        : ' · <span style="color:var(--red)">chưa gắn cơ sở</span>');
    return `<div class="approval-row">
      <div class="approval-row-top">
        <div>
          <div class="approval-name">${esc(tk.hoTen || '(chưa có tên)')}
            <span style="color:var(--text-muted);font-weight:400;font-size:12px">
              ${esc(nhanVaiTro(tk.vaiTro))}${phamVi}</span>
          </div>
          <div class="approval-meta">
            ${esc(tk.soDienThoai)}${tk.maNV ? ' · Mã NV: <strong style="color:var(--text-main)">' + esc(tk.maNV) + '</strong>' : ''}
            ${tk.email ? '<br>' + esc(tk.email) : ''}
            <br>${tk.lanDangNhapCuoi
                  ? 'Đăng nhập gần nhất: ' + esc(String(tk.lanDangNhapCuoi).slice(0, 16))
                  : '<span style="color:var(--red)">Chưa đăng nhập lần nào</span>'}
          </div>
        </div>
        <span class="status-badge ${khoa ? 'rejected' : 'approved'}">${esc(khoa ? 'Khoá' : 'Hoạt động')}</span>
      </div>
      <div class="approval-actions">
        <button class="btn-secondary" style="padding:8px 14px" data-ac-reset="${esc(tk.soDienThoai)}">Đặt lại mật khẩu</button>
        <button class="btn-secondary" style="padding:8px 14px" data-ac-role="${esc(tk.soDienThoai)}">Đổi vai trò</button>
        <button class="${khoa ? 'btn-approve' : 'btn-reject'}" data-ac-lock="${esc(tk.soDienThoai)}"
                data-khoa="${khoa ? '0' : '1'}">${khoa ? 'Mở khoá' : 'Khoá'}</button>
      </div>
    </div>`;
  }).join(''));
}

/** Hiện mật khẩu tạm — chỉ lần này, đóng bảng là không xem lại được. */
function hienMatKhauTam(sdt, matKhau, box) {
  setHTML(box, `
    <div class="note-box" style="margin-top:14px">
      <strong>Gửi riêng cho người dùng — chỉ hiện một lần:</strong><br>
      Tên đăng nhập: <strong>${esc(sdt)}</strong><br>
      Mật khẩu tạm: <strong style="font-size:18px;letter-spacing:1px">${esc(matKhau)}</strong><br>
      <span style="color:var(--text-muted)">Họ đăng nhập xong hệ thống sẽ bắt đổi mật khẩu ngay.
      Đóng bảng này là không xem lại được — bảng tài khoản chỉ lưu chuỗi băm.</span>
    </div>`);
}

/* ---------------- Tạo tài khoản ---------------- */

async function taoTaiKhoan() {
  const hoTen = $('#acHoTen').value.trim();
  const soDienThoai = $('#acSdt').value.trim();
  const vaiTro = $('#acVaiTro').value;
  const coSo = $('#acCoSo').value;
  const email = $('#acEmail').value.trim();
  const maHV = $('#acMaHV').value.trim().toUpperCase();
  const err = $('#acErr');
  err.classList.remove('visible');

  if (hoTen.length < 2 || !isValidPhone(soDienThoai)) { err.classList.add('visible'); return; }
  if (email && !isValidEmail(email)) return toastError('Email không hợp lệ.');
  if (vaiTro === 'phu_huynh' && !maHV) return toastError('Tài khoản học viên cần mã học viên.');
  /* Tài khoản học viên không thuộc cơ sở nào — ô cơ sở còn đang bị ẩn, hỏi
     "chưa chọn cơ sở" là chặn oan, mà bấm Huỷ thì không tạo được tài khoản. */
  if (vaiTro !== 'admin' && vaiTro !== 'phu_huynh' && !coSo) {
    if (!await confirmDialog(
      'Tài khoản này không gắn cơ sở nào nên sẽ không thấy dữ liệu cơ sở nào. Vẫn tạo?',
      { title: 'Chưa chọn cơ sở' })) return;
  }

  const btn = $('#acCreateBtn');
  const original = btn.innerHTML;
  btn.innerHTML = 'Đang tạo...'; btn.disabled = true;
  try {
    const res = await callApi('taoTaiKhoan', {
      hoTen, soDienThoai, vaiTro, coSo, email,
      maNV: $('#acMaNV').value.trim(), maHV,
    });
    hienMatKhauTam(res.soDienThoai, res.matKhauTam, $('#acNewResult'));
    $('#acHoTen').value = ''; $('#acSdt').value = '';
    $('#acMaNV').value = ''; $('#acEmail').value = ''; $('#acMaHV').value = '';
    toastSuccess(`Đã tạo tài khoản cho ${hoTen}.`);
    loadDanhSach();
  } catch (e) { toastApiError(e); }
  finally { btn.innerHTML = original; btn.disabled = false; }
}

/* ---------------- Việc trên từng dòng ---------------- */

async function datLaiMatKhau(sdt) {
  if (!await confirmDialog(
    `Đặt lại mật khẩu cho ${sdt}? Mật khẩu hiện tại của họ sẽ mất hiệu lực ngay.`,
    { title: 'Đặt lại mật khẩu', okText: 'Đặt lại' })) return;
  try {
    const res = await callApi('datLaiMatKhau', { soDienThoai: sdt });
    hienMatKhauTam(res.soDienThoai, res.matKhauTam, $('#acList'));
    toastSuccess('Đã đặt lại mật khẩu. Gửi mật khẩu tạm cho người dùng.');
  } catch (e) { toastApiError(e); }
}

async function doiVaiTro(sdt) {
  const hienTai = $('#acList').querySelector(`[data-ac-role="${CSS.escape(sdt)}"]`);
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay open';
  wrap.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" style="max-width:420px">
      <div class="modal-header"><div class="modal-title">Đổi vai trò — ${esc(sdt)}</div></div>
      <div class="modal-body">
        <div class="form-group"><label>Vai trò mới</label>
          <select id="dvVaiTro">${NHOM_VAI_TRO.map(v =>
            `<option value="${v.id}">${esc(v.nhan)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Cơ sở</label>
          <select id="dvCoSo">${optionCoSo('')}</select></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" id="dvHuy">Huỷ</button>
        <button type="button" class="btn-save" id="dvLuu">Lưu</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const dong = () => wrap.remove();
  wrap.querySelector('#dvHuy').addEventListener('click', dong);
  wrap.querySelector('#dvLuu').addEventListener('click', async () => {
    const vaiTro = wrap.querySelector('#dvVaiTro').value;
    const coSo = wrap.querySelector('#dvCoSo').value;
    dong();
    try {
      await callApi('doiVaiTro', { soDienThoai: sdt, vaiTro, coSo });
      toastSuccess('Đã đổi vai trò.');
      loadDanhSach();
    } catch (e) { toastApiError(e); }
  });
  if (hienTai) hienTai.blur();
}

async function khoaMo(sdt, khoa) {
  const hoi = khoa
    ? `Khoá tài khoản ${sdt}? Họ sẽ không đăng nhập được nữa.`
    : `Mở khoá tài khoản ${sdt}?`;
  if (!await confirmDialog(hoi, { title: khoa ? 'Khoá tài khoản' : 'Mở khoá', danger: khoa,
                                  okText: khoa ? 'Khoá' : 'Mở khoá' })) return;
  try {
    await callApi('khoaTaiKhoan', { soDienThoai: sdt, khoa: khoa ? 'true' : 'false' });
    toastSuccess(khoa ? 'Đã khoá tài khoản.' : 'Đã mở khoá.');
    loadDanhSach();
  } catch (e) { toastApiError(e); }
}

/* ---------------- Khởi động ---------------- */

export function openAccountsModal() {
  setHTML('#acFilterBranch',
    '<option value="">Tất cả cơ sở</option>' +
    BRANCHES.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join(''));
  setHTML('#acCoSo', optionCoSo(''));
  setHTML('#acNewResult', '');
  $('#acErr').classList.remove('visible');
  $('[data-mtab="list"]', $('#accountsModal')).click();
  openModal('accountsModal');
  loadDanhSach();
}

export function initAccounts(u) {
  user = u;

  $('#acFilterBranch')?.addEventListener('change', loadDanhSach);
  $('#acCreateBtn')?.addEventListener('click', taoTaiKhoan);
  $('#acNewForm')?.addEventListener('submit', ev => { ev.preventDefault(); taoTaiKhoan(); });

  // Ô mã phụ huynh chỉ hiện khi chọn vai trò phụ huynh
  $('#acVaiTro')?.addEventListener('change', ev => {
    $('#acMaHVGroup').style.display = ev.target.value === 'phu_huynh' ? 'block' : 'none';
    $('#acCoSo').closest('.form-group').style.display = ev.target.value === 'phu_huynh' ? 'none' : 'block';
  });

  // Uỷ quyền sự kiện: các dòng được dựng động
  $('#acList')?.addEventListener('click', ev => {
    const reset = ev.target.closest('[data-ac-reset]');
    const role = ev.target.closest('[data-ac-role]');
    const lock = ev.target.closest('[data-ac-lock]');
    if (reset) return datLaiMatKhau(reset.dataset.acReset);
    if (role) return doiVaiTro(role.dataset.acRole);
    if (lock) return khoaMo(lock.dataset.acLock, lock.dataset.khoa === '1');
  });
}
