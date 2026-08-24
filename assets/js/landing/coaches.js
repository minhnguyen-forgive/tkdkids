/* =============================================================
   HUẤN LUYỆN VIÊN — trình chiếu tự chuyển sau 5 giây mỗi người.

   Ba lớp chuyển động chạy cùng lúc:
     1. Thẻ chân dung xoay nhẹ theo trục dọc rồi trượt sang (rotateY + translateX)
     2. Các thẻ còn lại xếp chồng lùi phía sau, mờ dần theo độ sâu
     3. Từng dòng chữ bên phải trượt lên lần lượt cách nhau 80ms

   Tự dừng khi rê chuột vào, khi đang chọn bằng bàn phím, và khi người xem
   chuyển sang tab khác — không để chạy vô ích dưới nền.
   ============================================================= */

import { $, esc } from '../core/dom.js';
import { BRANCHES } from '../core/config.js';

const DELAY = 5000;

let COACHES = [];
let idx = 0;
let timer = null;
let paused = false;

const branchOf = id => BRANCHES.find(b => b.id === id) || null;

/** Lấy chữ cái đầu của tên và họ, VD "Nguyễn Đình Toàn" -> "NT" */
function initials(name) {
  const w = String(name).trim().split(/\s+/);
  return ((w[0]?.[0] || '') + (w.at(-1)?.[0] || '')).toUpperCase();
}

function cardHTML(c) {
  const dan = c.dang
    ? `<span class="coach-dan" title="${esc(c.dangNote || '')}"><b>${esc(c.dang)}</b><small>Đẳng</small></span>`
    : '';
  const inner = c.photo
    ? `<img src="${esc(c.photo)}" alt="${esc(c.honorific)} ${esc(c.name)}" loading="lazy" decoding="async">`
    : `<span class="coach-mono"><span>${esc(initials(c.name))}</span></span>`;
  return `<div class="coach-card" data-state="hidden" data-i="${COACHES.indexOf(c)}">${dan}${inner}</div>`;
}

function textHTML(c) {
  const b = branchOf(c.branchId);
  const chips = [];
  if (c.dang) {
    chips.push(`<span class="coach-chip is-dan" title="${esc(c.dangNote || '')}">
      <i class="fa-solid fa-award" aria-hidden="true"></i> ${esc(c.dang)} đẳng</span>`);
  }
  if (b) {
    chips.push(`<span class="coach-chip">
      <i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(b.name)}</span>`);
    chips.push(`<span class="coach-chip">
      <i class="fa-solid fa-map-pin" aria-hidden="true"></i> ${esc(b.region)}</span>`);
  }
  return `
    <p class="coach-role"><i class="fa-solid fa-user-tie" aria-hidden="true"></i> ${esc(c.title)}</p>
    <h3 class="coach-name"><span class="hon">${esc(c.honorific)}</span>${esc(c.name)}</h3>
    <div class="coach-meta">${chips.join('')}</div>
    <p class="coach-bio">${esc(c.bio)}</p>
    <ul class="coach-highlights">${(c.highlights || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>`;
}

/** Gán trạng thái cho từng thẻ: đang xem, xếp chồng phía sau, hay ra ngoài. */
function paint(prev) {
  const n = COACHES.length;
  document.querySelectorAll('.coach-card').forEach(el => {
    const i = Number(el.dataset.i);
    const d = (i - idx + n) % n;                    // khoảng cách tới thẻ đang xem
    let state = 'hidden';
    if (d === 0) state = 'active';
    else if (d === 1) state = 'stack1';
    else if (d === 2) state = 'stack2';
    if (i === prev && prev !== idx) state = 'out';  // thẻ vừa rời đi bay sang trái
    el.dataset.state = state;
  });

  const box = $('#coachText');
  if (box) {
    // Gán lại innerHTML để hiệu ứng trượt từng dòng chạy lại từ đầu
    box.innerHTML = textHTML(COACHES[idx]);
  }

  document.querySelectorAll('.coach-dot').forEach((d, i) => {
    d.setAttribute('aria-current', String(i === idx));
    if (i === idx) {                                 // khởi động lại đồng hồ 5 giây
      const f = d.querySelector('.fill');
      if (f) { f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; }
    }
  });

  const cnt = $('#coachCounter');
  if (cnt) cnt.innerHTML = `<b>${String(idx + 1).padStart(2, '0')}</b> / ${String(COACHES.length).padStart(2, '0')}`;
}

function go(next) {
  const prev = idx;
  idx = (next + COACHES.length) % COACHES.length;
  paint(prev);
  restart();
}

function restart() {
  clearTimeout(timer);
  if (paused || COACHES.length < 2) return;
  timer = setTimeout(() => go(idx + 1), DELAY);
}

function setPaused(v) {
  paused = v;
  $('#coachStage')?.classList.toggle('is-paused', v);
  v ? clearTimeout(timer) : restart();
}

export async function initCoaches() {
  const host = $('#coachesBody');
  if (!host) return;

  try {
    const r = await fetch('data/huan-luyen-vien.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    COACHES = (await r.json()).coaches || [];
  } catch {
    document.getElementById('coaches')?.remove();   // không tải được thì ẩn hẳn section
    return;
  }
  if (!COACHES.length) { document.getElementById('coaches')?.remove(); return; }

  const nhieu = COACHES.length > 1;
  host.innerHTML = `
    <div class="coach-stage-wrap" id="coachStage" style="--coach-delay:${DELAY}ms">
      <div class="coach-stage">
        <div class="coach-deck">${COACHES.map(cardHTML).join('')}</div>
        <div class="coach-text" id="coachText" aria-live="polite"></div>
      </div>
      ${nhieu ? `
      <div class="coach-controls">
        <button type="button" class="coach-arrow" id="coachPrev" aria-label="Huấn luyện viên trước">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
        <button type="button" class="coach-arrow" id="coachNext" aria-label="Huấn luyện viên tiếp theo">
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        <div class="coach-dots" role="tablist" aria-label="Chọn huấn luyện viên">
          ${COACHES.map((c, i) => `<button type="button" class="coach-dot" role="tab" data-go="${i}"
             aria-current="${i === 0}" aria-label="${esc(c.honorific)} ${esc(c.name)}"><span class="fill"></span></button>`).join('')}
        </div>
        <span class="coach-counter" id="coachCounter"></span>
      </div>` : ''}
    </div>`;

  paint(-1);

  if (!nhieu) return;
  $('#coachPrev').addEventListener('click', () => go(idx - 1));
  $('#coachNext').addEventListener('click', () => go(idx + 1));
  host.addEventListener('click', ev => {
    const d = ev.target.closest('[data-go]');
    if (d) go(Number(d.dataset.go));
  });

  const stage = $('#coachStage');
  stage.addEventListener('mouseenter', () => setPaused(true));
  stage.addEventListener('mouseleave', () => setPaused(false));
  stage.addEventListener('focusin', () => setPaused(true));
  stage.addEventListener('focusout', () => setPaused(false));

  // Người xem sang tab khác thì dừng, quay lại thì chạy tiếp
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));

  // Mũi tên trái/phải khi phần trình chiếu đang nằm trong tầm nhìn
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    const r = stage.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    go(idx + (ev.key === 'ArrowRight' ? 1 : -1));
  });

  // Vuốt ngang trên điện thoại
  let x0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.changedTouches[0].clientX; setPaused(true); }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 !== null) {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    }
    x0 = null; setPaused(false);
  }, { passive: true });

  // Tôn trọng thiết lập giảm chuyển động: không tự chuyển nữa
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { clearTimeout(timer); paused = true; }
  else restart();
}
