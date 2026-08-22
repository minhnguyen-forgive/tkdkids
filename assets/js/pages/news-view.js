/* =============================================================
   MẢNH GIAO DIỆN DÙNG CHUNG CHO TIN TỨC
   Tách riêng khỏi news-list.js để trang bài viết dùng lại được thẻ tin
   mà không kéo theo phần khởi động của trang danh sách.
   ============================================================= */

import { esc } from '../core/dom.js';

/** 2024-08-10 -> 10/08/2024 */
export function viDate(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

export function metaHTML(a) {
  return `<div class="news-meta">
    <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(viDate(a.date))}</span>
    <span class="dot">·</span>
    <span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(a.readMinutes)} phút đọc</span>
  </div>`;
}

export function articleUrl(a) {
  return `bai-viet.html?id=${encodeURIComponent(a.id)}`;
}

export function cardHTML(a) {
  const url = articleUrl(a);
  return `<article class="news-card">
    <div class="nc-media">
      <a href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${esc(a.coverThumb || a.cover)}" alt="" loading="lazy" decoding="async">
      </a>
    </div>
    <div class="nc-body">
      <span class="chip-cat" style="align-self:flex-start">${esc(a.category)}</span>
      <h3><a href="${url}">${esc(a.title)}</a></h3>
      <p>${esc(a.excerpt)}</p>
      ${metaHTML(a)}
    </div>
  </article>`;
}

export function featuredHTML(a) {
  const url = articleUrl(a);
  return `<div class="news-featured">
    <div class="nf-media">
      <a href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${esc(a.cover)}" alt="" loading="eager" decoding="async">
      </a>
    </div>
    <div class="nf-body">
      <span class="chip-cat is-red">${esc(a.category)}</span>
      <h2><a href="${url}">${esc(a.title)}</a></h2>
      <p>${esc(a.excerpt)}</p>
      ${metaHTML(a)}
      <a href="${url}" class="btn-primary" style="margin-top:20px;display:inline-flex">
        Đọc bài viết <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>
    </div>
  </div>`;
}
