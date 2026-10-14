(function () {
  var bar = document.querySelector('.topbar');
  if (!bar) return;
  function update() { bar.classList.toggle('is-scrolled', window.scrollY > 24); }
  update();
  window.addEventListener('scroll', update, { passive: true });
})();
