const contactsBody = document.querySelector('#contacts-table-body');
const visasBody = document.querySelector('#visas-table-body');
const contactsView = document.querySelector('#contacts-view');
const visasView = document.querySelector('#visas-view');
const contactsNav = document.querySelector('.internal-nav-item[data-view="contacts"]');
const visasNav = document.querySelector('.internal-nav-item[data-view="visas"]');
const refreshButton = document.querySelector('#refresh-data');
const topbar = document.querySelector('.internal-topbar');
const contactsPanelHead = contactsView?.querySelector('.panel-head');

const bellIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
    <path d="M10 21h4"></path>
  </svg>`;

const downloadIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12"></path>
    <path d="m7 10 5 5 5-5"></path>
    <path d="M5 21h14"></path>
  </svg>`;

const whatsappIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.5 3.5A11.7 11.7 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.8c0 2.1.6 4.2 1.6 6L0 24l6.4-1.7a12 12 0 0 0 5.7 1.5h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.2-3.5-8.5ZM12.2 21.8h-.1c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.7 9.7 0 0 1-1.5-5.3C2.2 6.4 6.6 2 12.1 2c2.6 0 5.1 1 7 2.9a9.8 9.8 0 0 1 2.9 7c0 5.5-4.4 9.9-9.8 9.9Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.3-.6-.4Z"></path>
  </svg>`;

let notificationShell;
let notificationButton;
let notificationBadge;
let notificationPanel;
let notificationList;
let notificationSummary;
let syncQueued = false;

function normalizeWhatsapp(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  digits = digits.replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function showToast(message) {
  document.querySelector('.csv-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'csv-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function csvEscape(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function exportContactsCsv() {
  const rows = [...(contactsBody?.querySelectorAll('tr') || [])];
  if (!rows.length) {
    showToast('Não há contatos para exportar.');
    return;
  }

  const data = rows.map((row) => {
    const cells = row.cells;
    const status = cells[5]?.querySelector('select');
    return [
      cells[0]?.textContent || '',
      cells[1]?.querySelector('strong')?.textContent || '',
      cells[1]?.querySelector('small')?.textContent || '',
      cells[2]?.querySelector('strong')?.textContent || '',
      cells[3]?.textContent || '',
      cells[4]?.textContent || '',
      status?.selectedOptions?.[0]?.textContent || status?.value || '',
    ];
  });

  const header = ['Recebido', 'Cliente', 'E-mail', 'Telefone', 'Serviço', 'Placa', 'Status'];
  const csv = '\ufeff' + [header, ...data].map((line) => line.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contatos-despachante-pastor-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`${rows.length} contato${rows.length === 1 ? '' : 's'} exportado${rows.length === 1 ? '' : 's'} em CSV.`);
}

function ensureExportButton() {
  if (!contactsPanelHead || contactsPanelHead.querySelector('#export-contacts')) return;
  let actions = contactsPanelHead.querySelector('.panel-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'panel-actions';
    contactsPanelHead.appendChild(actions);
  }
  const button = document.createElement('button');
  button.id = 'export-contacts';
  button.className = 'export-contacts';
  button.type = 'button';
  button.innerHTML = `${downloadIcon}<span>Exportar CSV</span>`;
  button.addEventListener('click', exportContactsCsv);
  actions.appendChild(button);
}

function enhanceWhatsappLinks() {
  contactsBody?.querySelectorAll('tr').forEach((row) => {
    const cell = row.cells[2];
    const phone = cell?.querySelector('strong');
    if (!cell || !phone || cell.querySelector('.whatsapp-contact')) return;
    const digits = normalizeWhatsapp(phone.textContent);
    if (!digits) return;

    const line = document.createElement('div');
    line.className = 'contact-phone-line';
    phone.replaceWith(line);
    line.appendChild(phone);

    const link = document.createElement('a');
    link.className = 'whatsapp-contact';
    link.href = `https://wa.me/${digits}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Abrir WhatsApp para ${phone.textContent.trim()}`);
    link.title = 'Abrir no WhatsApp';
    link.innerHTML = whatsappIcon;
    line.appendChild(link);
  });
}

function ensureNotificationBell() {
  if (!topbar || !refreshButton || notificationShell) return;
  let actions = topbar.querySelector('.internal-topbar-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'internal-topbar-actions';
    topbar.insertBefore(actions, refreshButton);
    actions.appendChild(refreshButton);
  }

  notificationShell = document.createElement('div');
  notificationShell.className = 'internal-notifications';
  notificationShell.innerHTML = `
    <button class="notification-bell" type="button" aria-label="Abrir notificações" aria-expanded="false">
      ${bellIcon}
      <span class="notification-badge" hidden>0</span>
    </button>
    <div class="notification-panel" hidden>
      <div class="notification-panel-head"><strong>Notificações</strong><span>0 novas</span></div>
      <div class="notification-list"></div>
    </div>`;

  actions.insertBefore(notificationShell, refreshButton);
  notificationButton = notificationShell.querySelector('.notification-bell');
  notificationBadge = notificationShell.querySelector('.notification-badge');
  notificationPanel = notificationShell.querySelector('.notification-panel');
  notificationList = notificationShell.querySelector('.notification-list');
  notificationSummary = notificationShell.querySelector('.notification-panel-head span');

  notificationButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = notificationPanel.hidden;
    notificationPanel.hidden = !willOpen;
    notificationButton.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) renderNotifications();
  });

  notificationPanel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => closeNotifications());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNotifications();
  });
}

function closeNotifications() {
  if (!notificationPanel || notificationPanel.hidden) return;
  notificationPanel.hidden = true;
  notificationButton?.setAttribute('aria-expanded', 'false');
}

function collectNotifications() {
  const items = [];

  contactsBody?.querySelectorAll('tr').forEach((row) => {
    const status = row.cells[5]?.querySelector('select')?.value;
    if (status !== 'new') return;
    items.push({
      type: 'contacts',
      row,
      title: `Novo contato: ${row.cells[1]?.querySelector('strong')?.textContent || 'Sem nome'}`,
      meta: `${row.cells[0]?.textContent || ''} · ${row.cells[3]?.textContent || 'Serviço não informado'}`,
    });
  });

  visasBody?.querySelectorAll('tr').forEach((row) => {
    const status = row.cells[4]?.querySelector('select')?.value;
    if (status !== 'submitted') return;
    items.push({
      type: 'visas',
      row,
      title: `Novo formulário de visto: ${row.cells[1]?.querySelector('strong')?.textContent || 'Sem nome'}`,
      meta: `${row.cells[0]?.textContent || ''} · ${row.cells[2]?.textContent || 'Visto'}`,
    });
  });

  return items;
}

function renderNotifications() {
  if (!notificationList || !notificationBadge || !notificationSummary) return;
  const items = collectNotifications();
  const total = items.length;
  notificationBadge.textContent = total > 99 ? '99+' : String(total);
  notificationBadge.hidden = total === 0;
  notificationSummary.textContent = total === 1 ? '1 nova' : `${total} novas`;
  notificationList.replaceChildren();

  if (!total) {
    const empty = document.createElement('div');
    empty.className = 'notification-empty';
    empty.textContent = 'Nenhuma notificação nova.';
    notificationList.appendChild(empty);
    return;
  }

  items.slice(0, 8).forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notification-item';
    button.innerHTML = `<span class="notification-dot"></span><span class="notification-copy"><strong></strong><small></small></span>`;
    button.querySelector('strong').textContent = item.title;
    button.querySelector('small').textContent = item.meta;
    button.addEventListener('click', () => {
      if (item.type === 'contacts') {
        contactsNav?.click();
        contactsView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        visasNav?.click();
        visasView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      closeNotifications();
    });
    notificationList.appendChild(button);
  });
}

function syncEnhancements() {
  ensureExportButton();
  ensureNotificationBell();
  enhanceWhatsappLinks();
  renderNotifications();
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    syncEnhancements();
  });
}

syncEnhancements();

[contactsBody, visasBody].filter(Boolean).forEach((target) => {
  new MutationObserver(queueSync).observe(target, { childList: true, subtree: true });
  target.addEventListener('change', queueSync);
});

refreshButton?.addEventListener('click', () => window.setTimeout(queueSync, 300));
