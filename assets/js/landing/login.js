/* =============================================================
   ĐĂNG NHẬP — mở bằng nút trên thanh điều hướng, hiện dưới dạng popup.

   Trước đây đăng nhập nằm trong một section riêng ở cuối trang chủ. Nay
   section đó bỏ đi, nút "Đăng nhập" trên thanh điều hướng có mặt ở mọi
   trang nên popup được dựng bằng JavaScript thay vì chép markup vào cả
   15 tệp HTML — sửa một chỗ là mọi trang cùng đổi.

   Đăng nhập xong lưu phiên vào sessionStorage rồi chuyển sang app.html,
   nơi phân quyền theo vai trò (phụ huynh / huấn luyện viên / lễ tân).
   ============================================================= */

import { $, $$, esc } from '../core/dom.js';
import { callApi } from '../core/api.js';
import { openModal, closeModal, toastError, toastSuccess } from '../core/ui.js';
import { saveSession, isLoggedIn, currentUser } from '../core/store.js';
import { normalizePhone } from '../core/format.js';

const MODAL_ID = 'loginModal';

function buildModal() {
  if ($('#' + MODAL_ID)) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.id = MODAL_ID;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'loginModalTitle');
  wrap.innerHTML = `
    <div class="modal-content" style="max-width:460px">
      <div class="modal-header">
        <h3 class="modal-title" id="loginModalTitle">Đăng nhập hệ thống</h3>
        <button type="button" class="modal-close" data-close aria-label="Đóng">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="modal-tabs" role="tablist" aria-label="Chọn loại tài khoản">
        <button class="m-tab-btn active" id="btn-phuhuynh" data-tab="phuhuynh" role="tab"
                aria-selected="true" aria-controls="tab-phuhuynh" type="button">Phụ huynh &amp; Võ sinh</button>
        <button class="m-tab-btn" id="btn-hlv" data-tab="hlv" role="tab"
                aria-selected="false" aria-controls="tab-hlv" type="button">Nhân viên</button>
      </div>

      <div class="modal-body">
        <div class="m-tab-panel active" id="tab-phuhuynh" role="tabpanel" aria-labelledby="btn-phuhuynh">
          <form id="parentLoginForm" novalidate>
            <div class="form-group">
              <label for="parentLoginPhone">Số điện thoại hoặc mã học viên</label>
              <input type="text" id="parentLoginPhone" required autocomplete="username"
                     placeholder="VD: 0978931747 hoặc HP0012">
            </div>
            <div class="form-group">
              <label for="parentLoginPass">Mật khẩu</label>
              <input type="password" id="parentLoginPass" required autocomplete="current-password" placeholder="Mật khẩu">
            </div>
            <button type="submit" id="parentLoginBtn" class="btn-login-parent">Đăng nhập</button>
            <p class="form-hint" style="text-align:center;margin-top:14px">
              Chưa có tài khoản? Liên hệ lễ tân cơ sở của con để được cấp.
            </p>
          </form>
        </div>

        <div class="m-tab-panel" id="tab-hlv" role="tabpanel" aria-labelledby="btn-hlv">
          <form id="internalLoginForm" novalidate>
            <div class="form-group">
              <label for="loginPhone">Số điện thoại</label>
              <input type="text" id="loginPhone" required autocomplete="username" placeholder="Số điện thoại đã đăng ký">
            </div>
            <div class="form-group">
              <label for="loginPass">Mật khẩu</label>
              <input type="password" id="loginPass" required autocomplete="current-password" placeholder="Mật khẩu">
            </div>
            <button type="submit" id="internalLoginBtn" class="btn-login-staff">Đăng nhập</button>
            <p class="form-hint" style="text-align:center;margin-top:14px">
              Dành cho huấn luyện viên, lễ tân và cán bộ trung tâm.
            </p>
          </form>
        </div>
      </div>
    </div>`;

  document.body.appendChild(wrap);

  $$('[data-tab]', wrap).forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  $('#parentLoginForm').addEventListener('submit', ev => {
    ev.preventDefault();
    doLogin({ action: 'login_parent', phoneSel: '#parentLoginPhone', passSel: '#parentLoginPass',
              btnSel: '#parentLoginBtn', form: ev.currentTarget });
  });
  $('#internalLoginForm').addEventListener('submit', ev => {
    ev.preventDefault();
    doLogin({ action: 'login_hlv', phoneSel: '#loginPhone', passSel: '#loginPass',
              btnSel: '#internalLoginBtn', form: ev.currentTarget });
  });
}

export function switchTab(id) {
  for (const t of ['phuhuynh', 'hlv']) {
    $('#tab-' + t)?.classList.toggle('active', t === id);
    const btn = $('#btn-' + t);
    btn?.classList.toggle('active', t === id);
    btn?.setAttribute('aria-selected', String(t === id));
  }
}

/** Đăng nhập qua đường mới (Auth.gs: có băm mật khẩu, token, khoá tạm khi dò).

    Backend chưa deploy Auth.gs thì action 'dangNhap' bị trả về "Action không
    hợp lệ" — lúc đó rơi về đường cũ để website vẫn đăng nhập được bình thường.
    Bỏ đoạn dự phòng này sau khi đã deploy và xác nhận đường mới chạy. */
async function dangNhapCoDuPhong(actionCu, phone, password) {
  /* Chỉ tài khoản nội bộ đi đường mới. Tài khoản phụ huynh vẫn dùng
     login_parent, vì danh sách con nằm ở bảng cũ mà bảng tài khoản mới chưa
     đọc được — đi đường mới thì đăng nhập được nhưng vào không thấy con nào.
     Bỏ điều kiện này ở giai đoạn 2, khi hồ sơ võ sinh chuyển sang bảng mới. */
  if (actionCu !== 'login_hlv') return callApi(actionCu, { phone, password });

  try {
    return await callApi('dangNhap', { phone, password });
  } catch (err) {
    if (err.kind === 'business' && /Action không hợp lệ/i.test(err.message || '')) {
      return callApi(actionCu, { phone, password });
    }
    throw err;
  }
}

async function doLogin({ action, phoneSel, passSel, btnSel, form }) {
  const btn = $(btnSel);
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ĐANG KẾT NỐI...';
  btn.disabled = true;

  try {
    const phoneRaw = $(phoneSel).value.trim();
    // Cho phép đăng nhập bằng mã học viên nên chỉ chuẩn hoá khi đúng dạng số
    const phone = /^[\d+\s.-]+$/.test(phoneRaw) ? normalizePhone(phoneRaw) : phoneRaw;

    const res = await dangNhapCoDuPhong(action, phone, $(passSel).value);
    saveSession(res.user, res.token);
    if (res.user && res.user.phaiDoiMatKhau) {
      // Tài khoản đang dùng mật khẩu tạm do quản trị viên cấp
      sessionStorage.setItem('tkd.phaiDoiMatKhau', '1');
    }
    form.reset();
    toastSuccess('Đăng nhập thành công. Đang mở hệ thống...');
    setTimeout(() => { window.location.href = 'app.html'; }, 400);
  } catch (err) {
    toastError(err.message);
    $(passSel).value = '';
    $(passSel).focus();
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

export function openLogin() {
  buildModal();
  openModal(MODAL_ID);
}

/** Đổi nút trên thanh điều hướng thành lời chào khi đã đăng nhập sẵn. */
function reflectSession(btns) {
  if (!isLoggedIn()) return;
  const u = currentUser() || {};
  const ten = (u.hoTen || u.name || '').split(' ').at(-1) || 'bạn';
  btns.forEach(b => {
    b.innerHTML = `<i class="fa-solid fa-circle-user" aria-hidden="true"></i> ${esc(ten)}`;
    b.setAttribute('title', 'Vào hệ thống quản trị');
  });
}

export function initLogin() {
  const btns = $$('[data-login]');
  if (!btns.length) return;

  reflectSession(btns);

  btns.forEach(b => b.addEventListener('click', ev => {
    ev.preventDefault();
    // Đã đăng nhập thì vào thẳng, không bắt gõ lại
    if (isLoggedIn()) { window.location.href = 'app.html'; return; }
    openLogin();
  }));
}
