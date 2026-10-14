(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Atraso escalonado entre irmãos em grids de cards
  document.querySelectorAll('.service-grid, .process-line').forEach(function (grid) {
    grid.querySelectorAll(':scope > .reveal').forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.1) + 's';
    });
  });

  // Parallax leve da arte da hero
  var art = document.querySelector('.hero-art');
  if (art) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        art.style.transform = 'translateY(calc(-50% + ' + (y * 0.12) + 'px))';
        ticking = false;
      });
    }, { passive: true });
  }
})();
