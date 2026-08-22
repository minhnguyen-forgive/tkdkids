/* =============================================================
   TRANG ĐỌC BÀI VIẾT — bố cục kiểu báo: bìa lớn, chữ giãn rộng,
   thanh tiến độ đọc, nút chia sẻ, khối đăng ký và tin liên quan.
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { initNav } from '../landing/nav.js';
import { getArticle, getRelated, paramId } from '../core/content.js';
import { cardHTML, viDate } from './news-view.js';

/** Cập nhật tiêu đề tab và thẻ chia sẻ mạng xã hội theo bài đang mở. */
function setMeta(a) {
  const url = location.href;
  document.title = `${a.title} | Taekwondo Kids Việt Nam`;
  const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
  set('meta[name="description"]', a.excerpt);
  set('meta[property="og:title"]', a.title);
  set('meta[property="og:description"]', a.excerpt);
  set('meta[property="og:url"]', url);
  if (a.cover) set('meta[property="og:image"]', new URL(a.cover, location.href).href);
  const canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.href = url;
}

function shareHTML() {
  const url = encodeURIComponent(location.href);
  return `<div class="article-share">
    <span class="lbl">Chia sẻ:</span>
    <a class="share-btn" target="_blank" rel="noopener"
       href="https://www.facebook.com/sharer/sharer.php?u=${url}">
      <i class="fa-brands fa-facebook" aria-hidden="true"></i> Facebook</a>
    <a class="share-btn" target="_blank" rel="noopener"
       href="https://zalo.me/share/link?url=${url}">
      <i class="fa-solid fa-comment" aria-hidden="true"></i> Zalo</a>
    <button type="button" class="share-btn" id="btnCopy">
      <i class="fa-regular fa-copy" aria-hidden="true"></i> Sao chép liên kết</button>
  </div>`;
}

const CTA_HTML = `<div class="article-cta">
  <h3>Cho con trải nghiệm buổi học thử miễn phí</h3>
  <p>7 cơ sở tại Hà Nội, TP.HCM và Quảng Ninh — huấn luyện viên quốc tế, giáo án riêng theo từng độ tuổi.</p>
  <div class="cta-row">
    <a href="index.html#register" class="btn-register" style="width:auto;padding:14px 30px">Đăng ký học thử</a>
    <a href="tel:0978931747" class="share-btn" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">
      <i class="fa-solid fa-phone" aria-hidden="true"></i> 097 893 1747</a>
  </div>
</div>`;

function notFound() {
  $('#articleRoot').innerHTML = `<div class="article-wrap"><div class="state-box" style="padding:110px 24px">
    <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
    <strong>Không tìm thấy bài viết này</strong>
    <p style="margin-bottom:22px">Bài viết có thể đã được đổi tên hoặc gỡ bỏ.</p>
    <a href="tin-tuc.html" class="btn-primary">Về trang tin tức</a>
  </div></div>`;
}

/** Thanh tiến độ đọc chạy theo phần thân bài, không tính phần đầu và chân trang. */
function initProgress() {
  const bar = $('#readProgress');
  const body = document.querySelector('.article-body');
  if (!bar || !body) return;
  const update = () => {
    const r = body.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const done = total > 0 ? (-r.top) / total : (r.top <= 0 ? 1 : 0);
    bar.style.width = `${Math.min(100, Math.max(0, done * 100))}%`;
  };
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
}

async function boot() {
  initNav();
  const id = paramId('id');
  if (!id) return notFound();

  let a;
  try {
    a = await getArticle(id);
  } catch (err) {
    $('#articleRoot').innerHTML = `<div class="article-wrap"><div class="state-box" style="padding:110px 24px">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <strong>Không tải được bài viết</strong><p>${esc(err.message)}</p></div></div>`;
    return;
  }
  if (!a) return notFound();

  setMeta(a);

  // a.body là HTML do chính chúng ta biên tập và lưu trong data/tin-tuc.json,
  // không phải dữ liệu người dùng gửi lên, nên gán thẳng vào innerHTML là an toàn.
  // Mọi trường còn lại đều đi qua esc().
  $('#articleRoot').innerHTML = `
    <div class="article-wrap">
      <div class="article-head">
        <nav class="crumbs" aria-label="Đường dẫn">
          <a href="index.html">Trang chủ</a><span class="sep">/</span>
          <a href="tin-tuc.html">Tin tức</a><span class="sep">/</span>
          <span aria-current="page">${esc(a.category)}</span>
        </nav>
        <span class="chip-cat is-red">${esc(a.category)}</span>
        <h1>${esc(a.title)}</h1>
        <div class="news-meta">
          <span><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(viDate(a.date))}</span>
          <span class="dot">·</span>
          <span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(a.readMinutes)} phút đọc</span>
          <span class="dot">·</span>
          <span><i class="fa-regular fa-user" aria-hidden="true"></i> Taekwondo Kids Việt Nam</span>
        </div>
      </div>

      ${a.cover ? `<figure class="article-cover"><img src="${esc(a.cover)}" alt="${esc(a.title)}" decoding="async"></figure>` : ''}

      <div class="article-body">${a.body}</div>
      ${shareHTML()}
      ${CTA_HTML}
      <section class="related">
        <h2>Tin <span class="accent">liên quan</span></h2>
        <div class="news-grid" id="relatedGrid"></div>
      </section>
    </div>`;

  initProgress();

  const copy = $('#btnCopy');
  if (copy) copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Đã sao chép';
      setTimeout(() => {
        copy.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> Sao chép liên kết';
      }, 2000);
    } catch {
      // Trình duyệt cũ hoặc trang không chạy trên https thì không dùng được clipboard
      prompt('Sao chép liên kết bài viết:', location.href);
    }
  });

  const rel = await getRelated(a.id, 3);
  $('#relatedGrid').innerHTML = rel.length
    ? rel.map(cardHTML).join('')
    : '<p style="color:var(--text-muted)">Chưa có bài viết liên quan.</p>';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
