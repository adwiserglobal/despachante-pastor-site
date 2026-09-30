(function () {
  const GIF_URL = 'https://raw.githubusercontent.com/adwiserglobal/Despachante-pastor/main/public/logo_animado.gif';

  const style = document.createElement('style');
  style.textContent = `
    #pastor-loading-screen {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      background: rgba(247, 249, 252, .96);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      opacity: 0;
      visibility: hidden;
      transition: opacity .16s ease, visibility .16s ease;
    }
    #pastor-loading-screen.show {
      opacity: 1;
      visibility: visible;
    }
    #pastor-loading-screen[hidden] {
      display: none !important;
    }
    .pastor-loading-inner {
      width: min(360px, 82vw);
      display: grid;
      place-items: center;
    }
    .pastor-loading-inner img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }
    html.pastor-loading-active,
    html.pastor-loading-active body {
      overflow: hidden !important;
    }
    @media (max-width: 640px) {
      .pastor-loading-inner { width: min(300px, 84vw); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'pastor-loading-screen';
  overlay.hidden = true;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Carregando');
  overlay.innerHTML = `
    <div class="pastor-loading-inner">
      <img src="${GIF_URL}" alt="Carregando" decoding="async" />
    </div>
  `;
  document.body.appendChild(overlay);

  let shownAt = 0;
  let timer = null;

  function show() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    shownAt = Date.now();
    overlay.hidden = false;
    document.documentElement.classList.add('pastor-loading-active');
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  function hide(minMs = 450) {
    const remaining = Math.max(0, minMs - (Date.now() - shownAt));
    return new Promise((resolve) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        overlay.classList.remove('show');
        setTimeout(() => {
          overlay.hidden = true;
          document.documentElement.classList.remove('pastor-loading-active');
          resolve();
        }, 170);
      }, remaining);
    });
  }

  window.PastorLoader = { show, hide };
})();