/* =============================================================
   ĐĂNG NHẬP — cổng tra cứu ở trang chủ.
   Thành công thì lưu phiên và chuyển sang app.html.
   Phiên lưu trong sessionStorage nên F5 không bị đăng xuất.
   ============================================================= */

import { $, $$ } from '../core/dom.js';
import { callApi } from '../core/api.js';
import { toastError, toastSuccess } from '../core/ui.js';
import { saveSession, isLoggedIn } from '../core/store.js';
import { normalizePhone } from '../core/format.js';

export function switchTab(id) {
  for (const t of ['phuhuynh', 'hlv']) {
    $('#tab-' + t)?.classList.toggle('active', t === id);
    const btn = $('#btn-' + t);
    btn?.classList.toggle('active', t === id);
    btn?.setAttribute('aria-selected', String(t === id));
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

    const res = await callApi(action, { phone, password: $(passSel).value });
    saveSession(res.user);
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

export function initLogin() {
  // Đã đăng nhập rồi thì mời vào thẳng hệ thống thay vì bắt đăng nhập lại
  if (isLoggedIn()) {
    const box = $('#portalBox');
    if (box) {
      box.insertAdjacentHTML('beforebegin', `
        <div class="branch-address-box" style="max-width:500px;margin:0 auto 20px;justify-content:space-between;align-items:center">
          <span><i class="fa-solid fa-circle-check" style="color:var(--green)" aria-hidden="true"></i>
                Bạn đang đăng nhập.</span>
          <a href="app.html" class="btn-save" style="text-decoration:none">Vào hệ thống</a>
        </div>`);
    }
  }

  $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  $('#parentLoginForm')?.addEventListener('submit', ev => {
    ev.preventDefault();
    doLogin({ action: 'login_parent', phoneSel: '#parentLoginPhone', passSel: '#parentLoginPass',
              btnSel: '#parentLoginBtn', form: ev.currentTarget });
  });

  $('#internalLoginForm')?.addEventListener('submit', ev => {
    ev.preventDefault();
    doLogin({ action: 'login_hlv', phoneSel: '#loginPhone', passSel: '#loginPass',
              btnSel: '#internalLoginBtn', form: ev.currentTarget });
  });
}
