/* =============================================================
   TRA CỨU THUẬT NGỮ — lọc ngay khi gõ.
   Toàn bộ 48 thuật ngữ đã nằm sẵn trong HTML, JavaScript chỉ ẩn/hiện.
   Nhờ vậy Google đọc được đủ nội dung và trang vẫn dùng được nếu JS lỗi.
   ============================================================= */

import { $, $$ } from '../core/dom.js';
import { initNav } from '../landing/nav.js';

/* Chuẩn hoá chuỗi trước khi so khớp:
   - bỏ dấu tiếng Việt, để gõ "tan ngua" vẫn ra "tấn ngựa"
   - coi gạch nối như dấu cách, để gõ "ap chagi" vẫn ra "Ap-chagi" */
const chuan_hoa = s => s
  .replace(/Đ/g, 'D').replace(/đ/g, 'd')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[-_/]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function boot() {
  initNav();
  const input = $('#termQ');
  const count = $('#termCount');
  if (!input) return;

  const terms = $$('.term').map(el => ({ el, key: chuan_hoa(el.dataset.k || '') }));
  const groups = $$('.term-group');
  const total = terms.length;

  const loc = () => {
    const q = chuan_hoa(input.value.trim());
    let hien = 0;
    for (const t of terms) {
      const ok = !q || t.key.includes(q);
      t.el.classList.toggle('hidden', !ok);
      if (ok) hien++;
    }
    // Nhóm nào không còn thuật ngữ nào thì ẩn luôn cả tiêu đề nhóm
    for (const g of groups) {
      g.classList.toggle('hidden', !g.querySelector('.term:not(.hidden)'));
    }
    count.textContent = q
      ? (hien ? `${hien} / ${total} thuật ngữ khớp với "${input.value.trim()}"`
              : `Không tìm thấy thuật ngữ nào khớp với "${input.value.trim()}"`)
      : `${total} thuật ngữ`;
  };

  input.addEventListener('input', loc);
  // Esc để xoá nhanh ô tìm kiếm
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { input.value = ''; loc(); }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
