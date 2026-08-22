/* Điểm khởi động cho các trang thuộc phần Kiến thức. */

import { initNav } from '../landing/nav.js';
import { initVideoFacades } from './video.js';

function boot() {
  initNav();
  initVideoFacades();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
