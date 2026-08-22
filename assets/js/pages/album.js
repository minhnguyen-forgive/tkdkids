/* =============================================================
   TRANG CHI TIẾT ALBUM — lưới ảnh kiểu gạch xây + khung xem phóng to
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { initNav } from '../landing/nav.js';
import { getAlbum, getAlbums, paramId } from '../core/content.js';

let PHOTOS = [];
let cur = 0;

/* ---------- Khung xem ảnh phóng to ---------- */
function show(i) {
  if (!PHOTOS.length) return;
  cur = (i + PHOTOS.length) % PHOTOS.length;      // xem vòng tròn, hết ảnh cuối quay lại ảnh đầu
  const p = PHOTOS[cur];
  $('#lbImg').src = p.src;
  $('#lbImg').alt = p.caption || '';
  $('#lbCap').textContent = p.caption || '';
  $('#lbNum').textContent = `${cur + 1} / ${PHOTOS.length}`;
}

function openLB(i) {
  show(i);
  $('#lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('#lbClose').focus();
}

function closeLB() {
  $('#lightbox').classList.remove('open');
  document.body.style.overflow = '';
  $('#lbImg').src = '';
}

function initLightbox() {
  const lb = $('#lightbox');
  $('#lbClose').addEventListener('click', closeLB);
  $('#lbPrev').addEventListener('click', () => show(cur - 1));
  $('#lbNext').addEventListener('click', () => show(cur + 1));
  // Bấm ra vùng nền tối thì đóng, bấm lên chính ảnh thì không
  lb.addEventListener('click', ev => { if (ev.target === lb) closeLB(); });
  document.addEventListener('keydown', ev => {
    if (!lb.classList.contains('open')) return;
    if (ev.key === 'Escape') closeLB();
    if (ev.key === 'ArrowLeft') show(cur - 1);
    if (ev.key === 'ArrowRight') show(cur + 1);
  });

  // Vuốt ngang trên điện thoại để chuyển ảnh
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
}

function notFound() {
  $('#albumTitle').textContent = 'Không tìm thấy album';
  $('#crumbAlbum').textContent = 'Không tìm thấy';
  $('#albumRoot').innerHTML = `<div class="state-box" style="padding:80px 24px">
    <i class="fa-regular fa-images" aria-hidden="true"></i>
    <strong>Album này không tồn tại</strong>
    <p style="margin-bottom:22px">Album có thể đã được đổi tên hoặc gỡ bỏ.</p>
    <a href="thu-vien.html" class="btn-primary">Về thư viện ảnh</a></div>`;
}

async function boot() {
  initNav();
  initLightbox();

  const id = paramId('id');
  if (!id) return notFound();

  let a;
  try {
    a = await getAlbum(id);
  } catch (err) {
    $('#albumRoot').innerHTML = `<div class="state-box" style="padding:80px 24px">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <strong>Không tải được album</strong><p>${esc(err.message)}</p></div>`;
    return;
  }
  if (!a) return notFound();

  PHOTOS = a.photos || [];
  document.title = `${a.title} | Thư viện ảnh Taekwondo Kids Việt Nam`;
  $('#crumbAlbum').textContent = a.title;
  $('#albumTitle').textContent = a.title;
  $('#albumSub').innerHTML =
    `<span class="chip-cat">${esc(a.year)}</span> ` +
    [a.place, `${PHOTOS.length} ảnh`].filter(Boolean).map(esc).join(' · ');

  $('#albumRoot').innerHTML = PHOTOS.length
    ? `<div class="photo-grid">${PHOTOS.map((p, i) => `
        <figure class="photo-item" role="button" tabindex="0" data-i="${i}"
                aria-label="Xem ảnh ${i + 1} trong ${PHOTOS.length}">
          <img src="${esc(p.thumb || p.src)}" alt="${esc(p.caption || '')}" loading="lazy" decoding="async">
          ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
        </figure>`).join('')}</div>`
    : `<div class="state-box"><i class="fa-regular fa-images" aria-hidden="true"></i>
        <strong>Album chưa có ảnh</strong></div>`;

  const grid = $('#albumRoot');
  grid.addEventListener('click', ev => {
    const it = ev.target.closest('.photo-item');
    if (it) openLB(Number(it.dataset.i));
  });
  grid.addEventListener('keydown', ev => {
    const it = ev.target.closest('.photo-item');
    if (it && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openLB(Number(it.dataset.i)); }
  });

  // Điều hướng sang album khác trong cùng năm
  const all = await getAlbums();
  const sameYear = all.filter(x => x.year === a.year && x.id !== a.id);
  if (sameYear.length) {
    grid.insertAdjacentHTML('beforeend', `
      <section class="related">
        <h2>Album khác <span class="accent">năm ${esc(a.year)}</span></h2>
        <div class="album-grid">${sameYear.map(x => `
          <a class="album-card" href="album.html?id=${encodeURIComponent(x.id)}">
            <img src="${esc(x.cover)}" alt="" loading="lazy" decoding="async">
            <span class="ac-count">${x.photos.length} ảnh</span>
            <span class="ac-overlay"><span class="ac-title">${esc(x.title)}</span></span>
          </a>`).join('')}</div>
      </section>`);
  }

  if (a.articleId) {
    grid.insertAdjacentHTML('beforeend', `
      <p style="margin-top:40px;text-align:center">
        <a href="bai-viet.html?id=${encodeURIComponent(a.articleId)}" class="btn-secondary">
          <i class="fa-regular fa-newspaper" aria-hidden="true"></i> Đọc bài viết về sự kiện này
        </a></p>`);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
