/* =============================================================
   TRANG TỔNG KIẾN THỨC — đổ các bài viết thuộc chuyên mục chuyên môn.
   ============================================================= */

import { $ } from '../core/dom.js';
import { initHeader } from '../core/header.js';
import { initVideoFacades } from './video.js';
import { getArticles } from '../core/content.js';
import { cardHTML } from './news-view.js';

/* Bài nào thuộc một trong các chuyên mục này thì coi là bài chuyên môn */
const CHUYEN_MON = ['Kiến thức', 'Kiến thức chung', 'Kỹ thuật', 'Chuyên môn'];

async function boot() {
  initHeader();
  initVideoFacades();
  const box = $('#knowNews');
  if (!box) return;

  let list = [];
  try {
    list = (await getArticles()).filter(a => CHUYEN_MON.includes(a.category));
  } catch {
    // Không tải được thì coi như chưa có bài, hiện luôn trạng thái trống
  }

  box.innerHTML = list.length
    ? `<div class="news-grid">${list.slice(0, 6).map(cardHTML).join('')}</div>`
    : `<div class="state-box">
        <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
        <strong>Chuyên mục đang được xây dựng</strong>
        <p style="margin-bottom:22px">Các bài viết chuyên môn của huấn luyện viên sẽ sớm có mặt tại đây.<br>
          Trong lúc chờ, mời bạn xem chương trình thi đai và bảng tra thuật ngữ.</p>
        <a href="thi-len-dai.html" class="btn-secondary">Chương trình thi lên đai</a>
       </div>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
