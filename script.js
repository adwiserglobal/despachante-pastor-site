const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

const closeMenu = () => {
  if (!menuButton || !mobileMenu) return;
  menuButton.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('is-open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
};

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = !menuButton.classList.contains('is-open');
    menuButton.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  });

  mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });
}

const revealElements = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          instance.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -45px' }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('is-visible'));
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// Configura o número completo com DDI + DDD + número no atributo data-whatsapp
// do botão em index.html. Ex.: data-whatsapp="5511999999999".
const whatsappButton = document.querySelector('.whatsapp-placeholder');
if (whatsappButton) {
  const phone = (whatsappButton.dataset.whatsapp || '').replace(/\D/g, '');
  if (phone) {
    whatsappButton.addEventListener('click', () => {
      const message = encodeURIComponent('Olá! Gostaria de solicitar um atendimento com o Despachante Pastor.');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
    });
  } else {
    whatsappButton.style.display = 'none';
  }
}

// Melhorias do site institucional: remove a antiga label do hero,
// adiciona a página de Vistos à navegação e inclui a localização física.
const isHomePage = !/vistos\.html$/i.test(window.location.pathname);

if (isHomePage) {
  document.querySelector('.eyebrow')?.remove();

  const addNavLink = (container, href, label, beforeSelector) => {
    if (!container || container.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    const before = beforeSelector ? container.querySelector(beforeSelector) : null;
    if (before) container.insertBefore(link, before);
    else container.appendChild(link);
  };

  addNavLink(document.querySelector('.desktop-nav'), './vistos.html', 'Vistos', 'a[href="#contato"]');
  addNavLink(document.querySelector('.mobile-menu'), './vistos.html', 'Vistos', 'a[href="#contato"]');
  addNavLink(document.querySelector('.footer-links'), './vistos.html', 'Vistos', 'a[href="#contato"]');

  const contactSection = document.querySelector('.contact-section');
  if (contactSection && !document.querySelector('#localizacao')) {
    const locationSection = document.createElement('section');
    locationSection.className = 'section location-section';
    locationSection.id = 'localizacao';
    locationSection.innerHTML = `
      <div class="container">
        <div class="location-heading reveal is-visible">
          <div>
            <span class="section-kicker">ONDE ESTAMOS</span>
            <h2>Venha até o Despachante Pastor.</h2>
            <p>Rua Cesário Mota, 245<br>Santo André, SP · CEP 09010-100</p>
          </div>
          <a class="button button-gold" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=Rua+Ces%C3%A1rio+Mota%2C+245%2C+Santo+Andr%C3%A9%2C+SP%2C+09010-100%2C+Brasil">Como chegar <span aria-hidden="true">↗</span></a>
        </div>
        <div class="map-shell">
          <iframe
            title="Mapa do Despachante Pastor"
            src="https://www.google.com/maps?q=Rua+Ces%C3%A1rio+Mota,+245,+Santo+Andr%C3%A9,+SP,+09010-100,+Brasil&output=embed"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen>
          </iframe>
          <div class="map-address-card">
            <span>Despachante Pastor</span>
            <strong>Rua Cesário Mota, 245</strong>
            <small>Santo André, SP · 09010-100</small>
          </div>
        </div>
      </div>
    `;
    contactSection.insertAdjacentElement('afterend', locationSection);
  }

  const params = new URLSearchParams(window.location.search);
  const visa = params.get('visto');
  if (visa) {
    const visaNames = {
      'estados-unidos': 'Estados Unidos',
      china: 'China',
      'arabia-saudita': 'Arábia Saudita',
      mocambique: 'Moçambique',
    };
    const selected = visaNames[visa];
    const contactCard = document.querySelector('.contact-card');
    if (selected && contactCard) {
      const note = document.createElement('div');
      note.className = 'selected-service-note';
      note.innerHTML = `<span>Solicitação selecionada</span><strong>Assessoria para visto · ${selected}</strong>`;
      contactCard.prepend(note);
    }
  }
}
