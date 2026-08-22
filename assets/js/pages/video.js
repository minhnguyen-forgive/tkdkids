/* =============================================================
   KHUNG VIDEO — chỉ nạp YouTube khi người xem thật sự bấm vào.

   Nhúng sẵn <iframe> khiến mỗi lần mở trang phải tải khoảng 1MB mã của
   Google và đặt cookie theo dõi ngay cả khi không ai xem video. Ở đây
   trang chỉ hiện ảnh đại diện; bấm vào mới thay bằng iframe thật.
   ============================================================= */

function play(btn) {
  const id = btn.dataset.yt;
  if (!id) return;
  const frame = document.createElement('div');
  frame.className = 'video-frame';
  const f = document.createElement('iframe');
  // youtube-nocookie: không đặt cookie theo dõi cho tới khi người xem bấm play
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
  f.title = btn.getAttribute('aria-label') || 'Video hướng dẫn';
  f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  f.allowFullscreen = true;
  frame.appendChild(f);
  btn.replaceWith(frame);
}

export function initVideoFacades() {
  document.addEventListener('click', ev => {
    const btn = ev.target.closest('.video-facade');
    if (btn) play(btn);
  });
}
