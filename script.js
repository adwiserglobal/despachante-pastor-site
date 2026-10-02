const enhancementStyles = document.createElement('link');
enhancementStyles.rel = 'stylesheet';
enhancementStyles.href = './enhancements.css';
document.head.appendChild(enhancementStyles);

const homeV2Styles = document.createElement('link');
homeV2Styles.rel = 'stylesheet';
homeV2Styles.href = './home-v2.css';
document.head.appendChild(homeV2Styles);

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

const isHomePage = !/vistos\.html$/i.test(window.location.pathname) && !/login\.html$/i.test(window.location.pathname) && !/visa-eua\.html$/i.test(window.location.pathname);

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

  document.querySelectorAll('.service-card').forEach((card) => {
    const title = card.querySelector('h3')?.textContent?.trim();
    if (title === 'Serviços internacionais') {
      const link = card.querySelector('a');
      if (link) {
        link.href = './vistos.html';
        link.innerHTML = 'Ver vistos <span>↗</span>';
      }
    }
  });

  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    heroVisual.classList.add('quote-visual');
    heroVisual.removeAttribute('aria-hidden');
    heroVisual.innerHTML = `
      <div class="quote-panel">
        <span class="quote-kicker">Orçamento rápido</span>
        <h2>Preencha os dados abaixo e resolvemos para você.</h2>
        <p>Envie as informações principais. A equipe entra em contato para entender o serviço e orientar os próximos passos.</p>
        <form class="quote-form" id="quote-form" novalidate>
          <div class="quote-row">
            <label class="quote-field"><input name="name" type="text" placeholder="Seu nome" autocomplete="name" required></label>
            <label class="quote-field"><input name="email" type="email" placeholder="Seu e-mail" autocomplete="email" required></label>
          </div>
          <label class="quote-field"><input name="phone" type="tel" placeholder="Seu telefone com DDD" autocomplete="tel" required></label>
          <label class="quote-field">
            <select name="service" id="quote-service" aria-label="Qual serviço você precisa?">
              <option value="">Qual serviço você precisa?</option>
              <optgroup label="Veículos">
                <option value="transferencia">Transferência de veículos</option>
                <option value="licenciamento">Licenciamento</option>
                <option value="liberacao-patio">Liberação de pátio</option>
                <option value="documentacao-veicular">Outros serviços veiculares</option>
              </optgroup>
              <optgroup label="Vistos e Passaportes">
                <option value="vistos">Vistos e Passaportes</option>
              </optgroup>
              <optgroup label="Demais serviços">
                <option value="certificado-digital">Certificado Digital</option>
                <option value="outro">Outros</option>
              </optgroup>
            </select>
          </label>
          <div class="quote-vehicle-row" id="quote-vehicle-row">
            <label class="quote-field"><select name="vehicle_id_type" id="quote-vehicle-id-type" aria-label="Tipo de identificação"><option value="placa">Placa</option><option value="renavam">RENAVAM</option></select></label>
            <label class="quote-field"><input name="vehicle_plate" type="text" id="quote-vehicle-identifier" placeholder="Placa do veículo (opcional)" autocomplete="off" maxlength="11"></label>
          </div>
          <button class="button button-gold quote-submit" type="submit">Solicitar orçamento <span aria-hidden="true">↗</span></button>
          <div class="quote-status" id="quote-status" role="status" aria-live="polite"></div>
          <div class="quote-note">Ao clicar em solicitar orçamento, você concorda com a política de privacidade.</div>
        </form>
      </div>
    `;

    const quoteForm = document.querySelector('#quote-form');
    const quoteStatus = document.querySelector('#quote-status');
    const quoteService = quoteForm.querySelector('#quote-service');
    const vehicleRow = quoteForm.querySelector('#quote-vehicle-row');
    const vehicleIdType = quoteForm.querySelector('#quote-vehicle-id-type');
    const vehicleIdentifier = quoteForm.querySelector('#quote-vehicle-identifier');
    const updateVehicleField = () => {
      const value = quoteService.value;
      vehicleRow.hidden = !!value && !['transferencia','licenciamento','liberacao-patio','documentacao-veicular'].includes(value);
      vehicleIdentifier.placeholder = vehicleIdType.value === 'renavam' ? 'RENAVAM (opcional)' : 'Placa do veículo (opcional)';
      vehicleIdentifier.maxLength = vehicleIdType.value === 'renavam' ? 11 : 7;
      vehicleIdentifier.inputMode = vehicleIdType.value === 'renavam' ? 'numeric' : 'text';
    };
    quoteService.addEventListener('change', updateVehicleField);
    vehicleIdType.addEventListener('change', () => { vehicleIdentifier.value = ''; updateVehicleField(); });
    updateVehicleField();
    quoteForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = quoteForm.querySelector('button[type="submit"]');
      const data = new FormData(quoteForm);
      const payload = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        vehicle_plate: String(data.get('vehicle_plate') || '').trim() ? (data.get('vehicle_id_type') === 'renavam' ? 'RENAVAM: ' : '') + String(data.get('vehicle_plate')).trim().toUpperCase() : null,
        service: String(data.get('service') || '').trim() || null,
      };

      if (!payload.name || !payload.email || !payload.phone) {
        quoteStatus.className = 'quote-status show error';
        quoteStatus.textContent = 'Preencha nome, e-mail e telefone para solicitar o orçamento.';
        return;
      }

      button.disabled = true;
      button.textContent = 'Enviando...';
      quoteStatus.className = 'quote-status';

      try {
        const response = await fetch('https://bzjxwrcefctxzxhmxtcd.supabase.co/rest/v1/quote_requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'sb_publishable_f6hfMTA-VAJnHP7PV9mkCg_KxdtsawR',
            'Authorization': 'Bearer sb_publishable_f6hfMTA-VAJnHP7PV9mkCg_KxdtsawR',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        quoteForm.reset();
        updateVehicleField();
        quoteStatus.className = 'quote-status show success';
        quoteStatus.textContent = 'Solicitação enviada. A equipe do Despachante Pastor entrará em contato com você.';
      } catch (error) {
        console.error('Falha ao enviar orçamento:', error);
        quoteStatus.className = 'quote-status show error';
        quoteStatus.textContent = 'Não foi possível enviar agora. Tente novamente em alguns instantes.';
      } finally {
        button.disabled = false;
        button.innerHTML = 'Solicitar orçamento <span aria-hidden="true">↗</span>';
      }
    });
  }

  const processSection = document.querySelector('.process-section');
  if (processSection && !document.querySelector('#depoimentos')) {
    const reviews = [
      ['Mariana Costa', 'Documentação veicular', 'Atendimento muito rápido e organizado. Me explicaram tudo com clareza e resolveram minha documentação sem complicação.'],
      ['Rafael Mendes', 'Transferência de veículo', 'Fui muito bem atendido desde o primeiro contato. O processo foi simples e recebi retorno em todas as etapas.'],
      ['Camila Ribeiro', 'Regularização documental', 'Equipe atenciosa e muito profissional. Eu estava perdida com os documentos e me orientaram do começo ao fim.'],
      ['Lucas Almeida', 'Licenciamento', 'Consegui resolver tudo sem precisar ficar correndo atrás de informação. Atendimento objetivo e eficiente.'],
      ['Fernanda Oliveira', 'Transferência de veículo', 'Gostei muito da transparência no atendimento. Explicaram os prazos e o que precisava ser feito sem enrolação.'],
      ['Bruno Martins', 'Documentação veicular', 'Serviço excelente. Foram cuidadosos com os documentos e sempre responderam minhas dúvidas rapidamente.'],
      ['Patrícia Nunes', 'Regularização', 'Experiência muito boa. Tudo foi conduzido com calma, clareza e bastante atenção.'],
      ['André Souza', 'Licenciamento', 'Atendimento ágil e profissional. Resolvi uma pendência que já estava me dando dor de cabeça há semanas.'],
      ['Juliana Ferreira', 'Documentação veicular', 'Me senti muito segura durante todo o processo. A equipe explicou cada passo e manteve contato comigo.'],
      ['Thiago Barbosa', 'Transferência de veículo', 'Processo muito mais fácil do que eu imaginava. Atendimento direto, educado e eficiente.'],
      ['Renata Lima', 'Regularização documental', 'Ótimo atendimento. Foram claros sobre os documentos necessários e tudo correu de forma tranquila.'],
      ['Gustavo Rocha', 'Serviço veicular', 'Profissionais muito prestativos. Gostei principalmente da rapidez nas respostas e da organização.'],
      ['Aline Carvalho', 'Licenciamento', 'Consegui resolver tudo com bastante facilidade. Atendimento humano e sem aquela burocracia confusa.'],
      ['Eduardo Freitas', 'Documentação veicular', 'Excelente suporte. Sempre soube em que etapa estava e o que aconteceria depois.'],
      ['Beatriz Gomes', 'Transferência de veículo', 'Atendimento muito cuidadoso e eficiente. Com certeza voltaria a procurar o Despachante Pastor quando precisar.'],
    ];

    const reviewCards = reviews.map(([name, service, quote]) => `
      <article class="testimonial-card">
        <div class="testimonial-person testimonial-person-no-photo">
          <strong>${name}</strong>
          <small>${service}</small>
        </div>
        <div class="testimonial-stars" aria-label="5 estrelas">★★★★★</div>
        <blockquote>“${quote}”</blockquote>
      </article>
    `).join('');

    const testimonials = document.createElement('section');
    testimonials.className = 'testimonials-section';
    testimonials.id = 'depoimentos';
    testimonials.innerHTML = `
      <div class="container testimonials-copy">
        <div class="testimonials-heading testimonials-heading-with-rating">
          <div>
            <h2>O que nossos clientes estão dizendo</h2>
          </div>
          <a class="google-rating-card" href="https://share.google/SitJRnFjLbQgVjWGU" target="_blank" rel="noopener noreferrer" aria-label="Ver avaliações do Despachante Pastor no Google">
            <strong>Excelente 4.9/5</strong>
            <div class="google-rating-stars" aria-label="4,9 de 5 estrelas">★★★★★</div>
            <span>Com base em <b>489 avaliações</b></span>
            <div class="google-wordmark" aria-label="Google">
              <i class="g-blue">G</i><i class="g-red">o</i><i class="g-yellow">o</i><i class="g-blue">g</i><i class="g-green">l</i><i class="g-red">e</i>
            </div>
          </a>
        </div>
      </div>
      <div class="testimonial-marquee" aria-label="Avaliações de clientes">
        <div class="testimonial-track">
          <div class="testimonial-set">${reviewCards}</div>
          <div class="testimonial-set" aria-hidden="true">${reviewCards}</div>
        </div>
      </div>
    `;
    processSection.insertAdjacentElement('afterend', testimonials);
    addNavLink(document.querySelector('.desktop-nav'), '#depoimentos', 'Depoimentos', 'a[href="#contato"]');
    addNavLink(document.querySelector('.mobile-menu'), '#depoimentos', 'Depoimentos', 'a[href="#contato"]');
  }

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