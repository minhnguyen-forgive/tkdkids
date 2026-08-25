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
import { openModal, closeModal, initPasswordEyes, initEnterSubmit,
         toastError, toastSuccess } from '../core/ui.js';
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

      <div class="modal-body">
        <form id="loginForm" novalidate>
          <div class="form-group">
            <label for="loginUser">Số điện thoại hoặc mã VTF</label>
            <input type="text" id="loginUser" required autocomplete="username"
                   placeholder="VD: 0978931747 hoặc VTF12345">
          </div>
          <div class="form-group">
            <label for="loginPass">Mật khẩu</label>
            <input type="password" id="loginPass" required autocomplete="current-password"
                   placeholder="Mật khẩu">
          </div>
          <button type="submit" id="loginBtn" class="btn-login-parent">Đăng nhập</button>
          <p class="form-hint" style="text-align:center;margin-top:14px">
            Dùng chung cho phụ huynh, võ sinh và cán bộ trung tâm.<br>
            Chưa có tài khoản? Liên hệ lễ tân cơ sở để được cấp.
          </p>
        </form>
      </div>
    </div>`;

  document.body.appendChild(wrap);
  initPasswordEyes(wrap);

  $('#loginForm').addEventListener('submit', ev => {
    ev.preventDefault();
    doLogin(ev.currentTarget);
  });

  // Enter ở ô nào cũng đăng nhập, khỏi phải rê chuột xuống nút
  initEnterSubmit(wrap);
}

async function doLogin(form) {
  const btn = $('#loginBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ĐANG KẾT NỐI...';
  btn.disabled = true;

  try {
    const nhapVao = $('#loginUser').value.trim();
    /* Ô này nhận cả số điện thoại lẫn mã VTF, nên chỉ chuẩn hoá khi đúng dạng
       số. Chuẩn hoá mã là hỏng: hàm chuẩn hoá bỏ hết chữ cái. */
    const phone = /^[\d+\s.-]+$/.test(nhapVao) ? normalizePhone(nhapVao) : nhapVao;

    const res = await callApi('dangNhap', { phone, password: $('#loginPass').value });
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
    $('#loginPass').value = '';
    $('#loginPass').focus();
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
