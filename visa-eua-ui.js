(() => {
  const progress = document.querySelector('#application-progress');
  const counter = document.querySelector('#step-counter');
  const next = document.querySelector('#next-step');

  function syncVisaUI() {
    if (!progress) return;

    const steps = Array.from(progress.querySelectorAll('.progress-step'));
    if (!steps.length) return;

    const activeIndex = Math.max(0, steps.findIndex((step) => step.classList.contains('active')));
    if (counter) counter.textContent = `Passo ${activeIndex + 1} de ${steps.length}`;

    steps.forEach((step, index) => {
      const number = step.querySelector('b');
      if (!number) return;
      number.textContent = step.classList.contains('done') ? '✓' : String(index + 1);
    });

    if (next) {
      next.textContent = activeIndex === steps.length - 1 ? 'Enviar Questionário' : 'Próximo Passo →';
    }
  }

  const observer = new MutationObserver(syncVisaUI);
  if (progress) observer.observe(progress, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  syncVisaUI();
})();
