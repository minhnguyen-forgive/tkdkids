/* Điểm khởi động của trang giới thiệu. */

import { initHeader } from '../core/header.js';
import { initReveal } from './reveal.js';
import { initBranches } from './branches.js';
import { initCoaches } from './coaches.js';
import { initHomeContent } from './home-content.js';

function boot() {
  initHeader();      // thanh điều hướng + popup đăng nhập
  initBranches();    // dựng tab khu vực và card cơ sở trước...
  initReveal();      // ...rồi mới gắn hiệu ứng để bắt được cả card động
  initCoaches();     // trình chiếu huấn luyện viên
  initHomeContent(); // tin tức + album nạp sau, không chặn phần còn lại của trang
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
