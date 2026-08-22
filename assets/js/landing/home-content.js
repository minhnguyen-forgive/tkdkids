/* =============================================================
   TRANG CHỦ — đổ 3 bài viết mới nhất và 3 album mới nhất.
   Nếu không tải được dữ liệu thì ẩn hẳn hai khu vực này đi,
   trang chủ vẫn dùng bình thường chứ không hiện khối trống.
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { getArticles, getAlbums } from '../core/content.js';
import { cardHTML } from '../pages/news-view.js';

function hide(sectionId) {
  document.getElementById(sectionId)?.remove();
}

async function fillNews() {
  const box = $('#homeNews');
  if (!box) return;
  const list = (await getArticles()).slice(0, 3);
  if (!list.length) return hide('news');
  box.innerHTML = list.map(cardHTML).join('');
}

async function fillAlbums() {
  const box = $('#homeAlbums');
  if (!box) return;
  const list = (await getAlbums()).slice(0, 3);
  if (!list.length) return hide('gallery');
  box.innerHTML = list.map(a => `
    <a class="album-card" href="album.html?id=${encodeURIComponent(a.id)}">
      <img src="${esc(a.cover)}" alt="" loading="lazy" decoding="async">
      <span class="ac-count"><i class="fa-regular fa-image" aria-hidden="true"></i> ${a.photos.length} ảnh</span>
      <span class="ac-overlay">
        <span class="ac-title">${esc(a.title)}</span>
        <span class="ac-sub"><span>${esc(a.year)}</span>${a.place ? `<span>· ${esc(a.place)}</span>` : ''}</span>
      </span>
    </a>`).join('');
}

export function initHomeContent() {
  fillNews().catch(() => hide('news'));
  fillAlbums().catch(() => hide('gallery'));
}
