/* Vệt sáng đi theo con trỏ trên nền từng section.

   Mỗi section được chèn thêm một lớp .sec-spot phủ kín, trong lớp đó vẽ một
   quầng sáng tròn đặt tại toạ độ con trỏ (--spot-x / --spot-y). Lớp này nằm
   dưới nội dung nên chữ không bị phủ, và pointer-events: none nên không cản
   bấm vào nút hay liên kết nào.

   Chỉ bật khi có chuột thật (bỏ qua điện thoại/tablet — ở đó không có con trỏ,
   quầng sáng sẽ dính lại một chỗ sau khi chạm) và khi người dùng không đặt hệ
   thống ở chế độ giảm hiệu ứng.

   Toạ độ được cập nhật trong requestAnimationFrame: chuột di chuyển sinh ra
   hàng trăm sự kiện mỗi giây, nếu ghi thẳng vào style thì mỗi sự kiện là một
   lần trình duyệt phải vẽ lại. */

export function initSpotlight(root = document) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const section of root.querySelectorAll('main > section')) {
    if (section.dataset.spotBound) continue;
    section.dataset.spotBound = '1';

    const layer = document.createElement('div');
    layer.className = 'sec-spot';
    layer.setAttribute('aria-hidden', 'true');
    section.appendChild(layer);
    section.classList.add('has-spot');

    let pending = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      pending = 0;
      layer.style.setProperty('--spot-x', `${x}px`);
      layer.style.setProperty('--spot-y', `${y}px`);
    };

    const track = event => {
      const box = section.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (!pending) pending = requestAnimationFrame(paint);
    };

    /* Đặt đúng vị trí TRƯỚC khi cho hiện, nếu không quầng sáng sẽ loé lên ở
       giữa section (vị trí mặc định 50% 50%) rồi mới chạy tới chỗ con trỏ. */
    section.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      track(event);
      paint();
      layer.classList.add('spot-live');
    });

    section.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      track(event);
    }, { passive: true });

    section.addEventListener('pointerleave', () => {
      layer.classList.remove('spot-live');
      if (pending) { cancelAnimationFrame(pending); pending = 0; }
    });
  }
}
