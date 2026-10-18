// Sino de notificações da área interna: contatos novos (primeira coluna do kanban) e formulários de visto enviados.
const contactsNav = document.querySelector('.internal-nav-item[data-view="contacts"]');
const visasNav = document.querySelector('.internal-nav-item[data-view="visas"]');
const refreshButton = document.querySelector('#refresh-data');
const topbar = document.querySelector('.internal-topbar');

const bellIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
    <path d="M10 21h4"></path>
  </svg>`;

let data = { contacts: [], stages: [], visas: [] };
let shell;
let button;
let badge;
let panel;
let list;
let summary;

function build() {
  if (!topbar || !refreshButton || shell) return;
  let actions = topbar.querySelector('.internal-topbar-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'internal-topbar-actions';
    topbar.insertBefore(actions, refreshButton);
    actions.appendChild(refreshButton);
  }
  shell = document.createElement('div');
  shell.className = 'internal-notifications';
  shell.innerHTML = `
    <button class="notification-bell" type="button" aria-label="Abrir notificações" aria-expanded="false">
      ${bellIcon}
      <span class="notification-badge" hidden>0</span>
    </button>
    <div class="notification-panel" hidden>
      <div class="notification-panel-head"><strong>Notificações</strong><span>0 novas</span></div>
      <div class="notification-list"></div>
    </div>`;
  actions.insertBefore(shell, refreshButton);
  button = shell.querySelector('.notification-bell');
  badge = shell.querySelector('.notification-badge');
  panel = shell.querySelector('.notification-panel');
  list = shell.querySelector('.notification-list');
  summary = shell.querySelector('.notification-panel-head span');

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) render();
  });
  panel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function close() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  button?.setAttribute('aria-expanded', 'false');
}

function items() {
  const firstStage = data.stages[0]?.id;
  const out = [];
  data.contacts
    .filter((card) => card.stage_id === firstStage)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach((card) => out.push({
      type: 'contact', id: card.id,
      title: `Novo contato: ${card.name || 'Sem nome'}`,
      meta: `${new Date(card.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${card.service || 'Serviço não informado'}`,
    }));
  data.visas
    .filter((row) => row.status === 'submitted')
    .forEach((row) => out.push({
      type: 'visa',
      title: `Novo formulário de visto: ${row.applicant_name || 'Sem nome'}`,
      meta: new Date(row.updated_at || row.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    }));
  return out;
}

function render() {
  if (!list) return;
  const all = items();
  badge.textContent = all.length > 99 ? '99+' : String(all.length);
  badge.hidden = all.length === 0;
  summary.textContent = all.length === 1 ? '1 nova' : `${all.length} novas`;
  list.replaceChildren();
  if (!all.length) {
    const empty = document.createElement('div');
    empty.className = 'notification-empty';
    empty.textContent = 'Nenhuma notificação nova.';
    list.appendChild(empty);
    return;
  }
  all.slice(0, 8).forEach((item) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'notification-item';
    row.innerHTML = '<span class="notification-dot"></span><span class="notification-copy"><strong></strong><small></small></span>';
    row.querySelector('strong').textContent = item.title;
    row.querySelector('small').textContent = item.meta;
    row.addEventListener('click', () => {
      close();
      if (item.type === 'contact') {
        contactsNav?.click();
        document.dispatchEvent(new CustomEvent('internal:open-card', { detail: item.id }));
      } else {
        visasNav?.click();
      }
    });
    list.appendChild(row);
  });
}

build();
document.addEventListener('internal:data', (event) => {
  data = event.detail || data;
  build();
  render();
});
