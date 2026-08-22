/* =============================================================
   ĐIỀU HƯỚNG — bổ sung menu cho điện thoại.
   Trước đây dưới 900px .nav-links bị ẩn mà không có gì thay thế,
   người dùng điện thoại mất hoàn toàn điều hướng.
   ============================================================= */

import { $ } from '../core/dom.js';

const LINKS = [
  { href: '#about',     icon: 'fa-clock-rotate-left', label: 'Về chúng tôi' },
  { href: '#locations', icon: 'fa-location-dot',      label: 'Hệ thống cơ sở' },
  { href: '#pricing',   icon: 'fa-tags',              label: 'Ưu đãi' },
  { href: '#partners',  icon: 'fa-handshake',         label: 'Đối tác' },
  { href: '#portal',    icon: 'fa-right-to-bracket',  label: 'Tra cứu / Đăng nhập' },
];

export function initNav() {
  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  if (!toggle || !menu) return;

  menu.innerHTML = `
    <ul>${LINKS.map(l => `
      <li><a href="${l.href}"><i class="fa-solid ${l.icon}" aria-hidden="true"></i>${l.label}</a></li>`).join('')}
    </ul>
    <div class="mobile-menu-cta">
      <a href="#register" class="btn-nav">Đăng ký học thử</a>
      <a href="tel:0978931747" class="btn-cancel">
        <i class="fa-solid fa-phone" aria-hidden="true"></i> Gọi 097 893 1747
      </a>
    </div>`;

  const setOpen = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}" aria-hidden="true"></i>`;
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', ev => { if (ev.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && menu.classList.contains('open')) setOpen(false); });
  // Quay lại màn hình rộng thì đóng menu để không kẹt trạng thái khoá cuộn
  window.matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
}
