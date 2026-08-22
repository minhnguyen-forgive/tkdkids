/* Hiệu ứng hiện dần khi cuộn tới. Có xử lý phần tử được thêm sau (card cơ sở). */

export function initReveal(root = document) {
  if (!('IntersectionObserver' in window)) {
    root.querySelectorAll('.reveal').forEach(el => (el.style.opacity = '1'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.style.animationPlayState = 'running';
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  root.querySelectorAll('.reveal').forEach(el => {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}
