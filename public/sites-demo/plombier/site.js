document.documentElement.classList.replace('no-js', 'js');
function animerReveals() {
  var elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    elements.forEach(function(el) { observer.observe(el); });
  } else {
    elements.forEach(function(el) { el.classList.add('visible'); });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', animerReveals);
} else {
  animerReveals();
}
