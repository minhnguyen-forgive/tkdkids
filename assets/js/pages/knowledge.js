/* Điểm khởi động cho các trang thuộc phần Kiến thức. */

import { initHeader } from '../core/header.js';
import { initVideoFacades } from './video.js';

function boot() {
  initHeader();
  initVideoFacades();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
