/* =============================================================
   TRANG DANH SÁCH TIN TỨC — bài nổi bật + lưới tin + lọc chuyên mục
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { initNav } from '../landing/nav.js';
import { getArticles } from '../core/content.js';
import { cardHTML, featuredHTML } from './news-view.js';

const PAGE_SIZE = 6;   // số bài hiện thêm mỗi lần bấm "Xem thêm"

let ALL = [];
/* Địa chỉ dạng tin-tuc.html?chuyen-muc=Kiến thức mở thẳng vào chuyên mục đó,
   để menu Kiến thức trỏ được tới đúng nhóm bài. */
let cat = new URLSearchParams(location.search).get('chuyen-muc') || 'all';
let shown = PAGE_SIZE;

function render() {
  const root = $('#newsRoot');
  const list = cat === 'all' ? ALL : ALL.filter(a => a.category === cat);

  if (!list.length) {
    root.innerHTML = `<div class="state-box">
      <i class="fa-regular fa-newspaper" aria-hidden="true"></i>
      <strong>Chưa có bài viết nào trong chuyên mục này</strong>
      <p>Bạn thử chọn chuyên mục khác nhé.</p></div>`;
    return;
  }

  // Chỉ đưa bài nổi bật lên khi đang xem tất cả — vào từng chuyên mục thì
  // dàn lưới đều đẹp hơn là tách riêng một bài ra.
  const useFeatured = cat === 'all';
  const feat = useFeatured ? list[0] : null;
  const rest = useFeatured ? list.slice(1) : list;
  const visible = rest.slice(0, shown);

  root.innerHTML =
    (feat ? featuredHTML(feat) : '') +
    `<div class="news-grid">${visible.map(cardHTML).join('')}</div>` +
    (visible.length < rest.length
      ? `<div class="load-more"><button type="button" class="btn-secondary" id="btnMore">
           Xem thêm ${rest.length - visible.length} bài
         </button></div>`
      : '');

  const more = $('#btnMore');
  if (more) more.addEventListener('click', () => { shown += PAGE_SIZE; render(); });
}

function renderFilter() {
  const cats = [...new Set(ALL.map(a => a.category))];
  const box = $('#catFilter');
  // Chuyên mục lấy từ địa chỉ mà không có bài nào thì quay về xem tất cả
  if (cat !== 'all' && !cats.includes(cat)) cat = 'all';
  // Chỉ có một chuyên mục thì "Tất cả" và chuyên mục đó là một — bỏ hẳn bộ lọc đi
  if (cats.length < 2) { box.remove(); return; }
  box.innerHTML = [['all', 'Tất cả'], ...cats.map(c => [c, c])]
    .map(([v, l]) => `<button type="button" data-cat="${esc(v)}" aria-pressed="${v === cat}">${esc(l)}</button>`)
    .join('');
  box.addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-cat]');
    if (!btn) return;
    cat = btn.dataset.cat;
    shown = PAGE_SIZE;
    box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    render();
  });
}

async function boot() {
  initNav();
  try {
    ALL = await getArticles();
    renderFilter();
    render();
  } catch (err) {
    $('#newsRoot').innerHTML = `<div class="state-box">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <strong>Không tải được danh sách bài viết</strong>
      <p>${esc(err.message)}</p></div>`;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
