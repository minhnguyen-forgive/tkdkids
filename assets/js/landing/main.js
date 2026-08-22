/* Điểm khởi động của trang giới thiệu. */

import { initModals } from '../core/ui.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initBranches } from './branches.js';
import { initTrialForm } from './trial-form.js';
import { initLogin } from './login.js';
import { initHomeContent } from './home-content.js';
import { BRANCHES } from '../core/config.js';
import { $, esc } from '../core/dom.js';

/** Đổ danh sách cơ sở vào ô chọn của form học thử. */
function fillBranchSelect() {
  const sel = $('#trialBranch');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn cơ sở gần bạn nhất --</option>' +
    BRANCHES.map(b => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.region)})</option>`).join('');
}

function boot() {
  initModals();
  initNav();
  initBranches();   // dựng card cơ sở trước...
  initReveal();     // ...rồi mới gắn hiệu ứng để bắt được cả card động
  fillBranchSelect();
  initTrialForm();
  initLogin();
  initHomeContent();   // tin tức + album nạp sau, không chặn phần còn lại của trang
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
