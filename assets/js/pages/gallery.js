/* =============================================================
   TRANG THƯ VIỆN ẢNH — album gom theo năm, bấm vào năm để nhảy tới khối đó
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { initHeader } from '../core/header.js';
import { getAlbumsByYear } from '../core/content.js';

function albumCardHTML(a) {
  const n = a.photos.length;
  return `<a class="album-card" href="album.html?id=${encodeURIComponent(a.id)}">
    <img src="${esc(a.cover || (a.photos[0] && a.photos[0].thumb) || '')}" alt="" loading="lazy" decoding="async">
    <span class="ac-count"><i class="fa-regular fa-image" aria-hidden="true"></i> ${n} ảnh</span>
    <span class="ac-overlay">
      <span class="ac-title">${esc(a.title)}</span>
      <span class="ac-sub">
        ${a.place ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(a.place)}</span>` : ''}
      </span>
    </span>
  </a>`;
}

function yearBlockHTML(g) {
  return `<section class="year-block" id="nam-${g.year}" aria-labelledby="y${g.year}">
    <div class="year-head">
      <h2 id="y${g.year}">${g.year}</h2>
      <span class="count">${g.albums.length} album · ${g.photoCount} ảnh</span>
      <span class="rule" aria-hidden="true"></span>
    </div>
    <div class="album-grid">${g.albums.map(albumCardHTML).join('')}</div>
  </section>`;
}

async function boot() {
  initHeader();
  const root = $('#galleryRoot');
  const nav = $('#yearNav');

  let years;
  try {
    years = await getAlbumsByYear();
  } catch (err) {
    root.innerHTML = `<div class="state-box">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <strong>Không tải được thư viện ảnh</strong><p>${esc(err.message)}</p></div>`;
    nav.remove();
    return;
  }

  if (!years.length) {
    nav.remove();
    root.innerHTML = `<div class="state-box" style="padding:100px 24px">
      <i class="fa-regular fa-images" aria-hidden="true"></i>
      <strong>Thư viện ảnh đang được cập nhật</strong>
      <p>Các album sự kiện sẽ sớm có mặt tại đây.</p></div>`;
    return;
  }

  nav.innerHTML = years
    .map((g, i) => `<button type="button" data-year="${g.year}" aria-pressed="${i === 0}">${g.year}</button>`)
    .join('');
  root.innerHTML = years.map(yearBlockHTML).join('');

  nav.addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-year]');
    if (!btn) return;
    document.getElementById(`nam-${btn.dataset.year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Đánh dấu năm đang xem theo vị trí cuộn, để thanh chọn năm luôn khớp màn hình
  const blocks = years.map(g => document.getElementById(`nam-${g.year}`)).filter(Boolean);
  const mark = year => nav.querySelectorAll('button').forEach(
    b => b.setAttribute('aria-pressed', String(Number(b.dataset.year) === year)));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) mark(Number(vis.target.id.replace('nam-', '')));
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    blocks.forEach(b => io.observe(b));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
