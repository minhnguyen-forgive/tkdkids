/* Form "Đăng ký học thử" ở cuối trang chủ. */

import { $ } from '../core/dom.js';
import { callApi } from '../core/api.js';
import { toastSuccess, toastError } from '../core/ui.js';
import { isValidPhone, normalizePhone } from '../core/format.js';

export function initTrialForm() {
  const form = $('#registerForm');
  if (!form) return;

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = $('#submitBtn', form);
    const data = new FormData(form);
    const phone = normalizePhone(data.get('phone'));
    const errBox = $('#trialErr', form);

    if (!isValidPhone(phone)) {
      errBox.textContent = 'Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09).';
      errBox.classList.add('visible');
      $('input[name=phone]', form).focus();
      return;
    }
    errBox.classList.remove('visible');

    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ĐANG XỬ LÝ...';
    btn.disabled = true;

    try {
      await callApi('dangKyTuVan', {
        tenPhuHuynh: String(data.get('parentName') || '').trim(),
        soDienThoai: phone,
        email: String(data.get('email') || '').trim(),
        dsVoSinh: [{ hoTen: String(data.get('childName') || '').trim(), ngaySinh: data.get('childDob') || '' }],
        coSoQuanTam: data.get('branch') || '',
        nguon: 'form_trangchu',
      });
      form.reset();
      toastSuccess('Đăng ký thành công! Trung tâm sẽ liên hệ với bạn trong thời gian sớm nhất.', 7000);
    } catch (err) {
      toastError(err.message);
    } finally {
      btn.innerHTML = original;
      btn.disabled = false;
    }
  });
}
