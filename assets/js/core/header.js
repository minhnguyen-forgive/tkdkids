/* =============================================================
   PHẦN ĐẦU TRANG — gọi một lần là xong cả thanh điều hướng lẫn đăng nhập.
   Trước đây mỗi trang tự gọi initNav(), nhưng từ khi nút "Đăng nhập"
   xuất hiện trên mọi trang thì phải gọi thêm initLogin() — gom vào đây
   để không trang nào bị quên.
   ============================================================= */

import { initNav } from '../landing/nav.js';
import { initLogin, openLogin } from '../landing/login.js';
import { initModals } from './ui.js';

export function initHeader() {
  initModals();
  initNav();
  initLogin();
  // Từ app.html quay ra với ?login=1 thì mở sẵn popup đăng nhập
  if (new URLSearchParams(location.search).get('login') === '1') openLogin();
}
