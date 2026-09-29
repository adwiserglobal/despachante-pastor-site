const sb = window.despachanteSupabase;

const gate = document.querySelector('#internal-gate');
const app = document.querySelector('#internal-app');
const loginButton = document.querySelector('#google-login');
const loginMessage = document.querySelector('#internal-login-message');
const logoutButton = document.querySelector('#internal-logout');
const userEmailEl = document.querySelector('#internal-user-email');
const refreshButton = document.querySelector('#refresh-data');
const navButtons = [...document.querySelectorAll('.internal-nav-item')];
const contactsView = document.querySelector('#contacts-view');
const visasView = document.querySelector('#visas-view');
const viewTitle = document.querySelector('#view-title');
const contactsBody = document.querySelector('#contacts-table-body');
const contactsEmpty = document.querySelector('#contacts-empty');
const contactStats = document.querySelector('#contact-stats');
const visasBody = document.querySelector('#visas-table-body');
const visasEmpty = document.querySelector('#visas-empty');
const visaStats = document.querySelector('#visa-stats');
const detailDialog = document.querySelector('#visa-detail-dialog');
const detailTitle = document.querySelector('#visa-detail-title');
const detailMeta = document.querySelector('#visa-detail-meta');
const detailContent = document.querySelector('#visa-detail-content');
const closeDetail = document.querySelector('#close-visa-detail');

const ALLOWED_EMAILS = new Set([
  'despachantepastorinterno@gmail.com',
  'desp.pastor@gmail.com',
]);

let currentView = 'contacts';
let currentUser = null;
let contactRows = [];
let visaRows = [];

function showLoginMessage(message, type = 'error') {
  loginMessage.textContent = message;
  loginMessage.className = `internal-message show ${type}`;
}

function clearLoginMessage() {
  loginMessage.textContent = '';
  loginMessage.className = 'internal-message';
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function readableService(value) {
  const labels = {
    'documentacao-veicular': 'Documentação veicular',
    transferencia: 'Transferência de veículo',
    regularizacao: 'Regularização',
    vistos: 'Vistos e internacionais',
    outro: 'Outro serviço',
  };
  return labels[value] || value || 'Não informado';
}

function labelStatus(value) {
  const labels = {
    new: 'Novo',
    contacted: 'Contatado',
    in_progress: 'Em andamento',
    won: 'Convertido',
    closed: 'Encerrado',
    draft: 'Rascunho',
    submitted: 'Enviado',
    in_review: 'Em análise',
    needs_information: 'Pedir informação',
    completed: 'Concluído',
    archived: 'Arquivado',
  };
  return labels[value] || value || '—';
}

function createText(tag, text, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text == null || text === '' ? '—' : String(text);
  return el;
}

async function audit(action, resourceType, resourceId = null) {
  if (!currentUser) return;
  try {
    await sb.from('internal_access_audit').insert({
      admin_user_id: currentUser.id,
      admin_email: String(currentUser.email || '').toLowerCase(),
      action,
      resource_type: resourceType,
      resource_id: resourceId,
    });
  } catch (error) {
    console.warn('Falha ao registrar auditoria.', error);
  }
}

async function isAuthorizedSession(user) {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase();
  if (!ALLOWED_EMAILS.has(email)) return false;
  const provider = user.app_metadata?.provider;
  if (provider !== 'google') return false;

  const { data, error } = await sb.rpc('is_internal_admin');
  return !error && data === true;
}

async function enterApp(user) {
  currentUser = user;
  userEmailEl.textContent = user.email || '';
  gate.hidden = true;
  app.hidden = false;
  await audit('login', 'internal_portal');
  await loadAllData();
}

async function rejectSession(message = 'Esta conta Google não possui acesso à área interna.') {
  await sb.auth.signOut();
  currentUser = null;
  app.hidden = true;
  gate.hidden = false;
  showLoginMessage(message, 'error');
}

loginButton.addEventListener('click', async () => {
  clearLoginMessage();
  loginButton.disabled = true;
  loginButton.lastChild.textContent = ' Entrando...';
  const redirectTo = `${window.location.origin}/interno`;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'openid email profile',
    },
  });
  if (error) {
    showLoginMessage('Não foi possível iniciar o login com Google. Verifique a configuração do provedor.', 'error');
    loginButton.disabled = false;
    loginButton.lastChild.textContent = ' Entrar com Google';
  }
});

logoutButton.addEventListener('click', async () => {
  await audit('logout', 'internal_portal');
  await sb.auth.signOut();
  window.location.replace('/interno');
});

refreshButton.addEventListener('click', loadAllData);

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    navButtons.forEach((item) => item.classList.toggle('active', item === button));
    contactsView.hidden = currentView !== 'contacts';
    visasView.hidden = currentView !== 'visas';
    viewTitle.textContent = currentView === 'contacts' ? 'Contatos recebidos' : 'Formulários de visto';
  });
});

function renderStats(container, items) {
  container.replaceChildren();
  items.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'internal-stat';
    card.append(createText('small', label), createText('strong', value));
    container.appendChild(card);
  });
}

function buildStatusSelect(value, options, onChange) {
  const select = document.createElement('select');
  select.className = 'status-select';
  options.forEach((option) => {
    const el = document.createElement('option');
    el.value = option;
    el.textContent = labelStatus(option);
    el.selected = option === value;
    select.appendChild(el);
  });
  select.addEventListener('change', async () => {
    select.disabled = true;
    const previous = value;
    try {
      await onChange(select.value);
      value = select.value;
    } catch (error) {
      console.error(error);
      select.value = previous;
      window.alert('Não foi possível atualizar o status.');
    } finally {
      select.disabled = false;
    }
  });
  return select;
}

function renderContacts() {
  contactsBody.replaceChildren();
  contactsEmpty.hidden = contactRows.length > 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  renderStats(contactStats, [
    ['Total de contatos', contactRows.length],
    ['Novos', contactRows.filter((row) => row.status === 'new').length],
    ['Recebidos hoje', contactRows.filter((row) => String(row.created_at || '').slice(0, 10) === todayKey).length],
  ]);

  contactRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.appendChild(createText('td', fmtDate(row.created_at)));

    const client = document.createElement('td');
    client.append(createText('strong', row.name), createText('small', row.email));
    tr.appendChild(client);

    const contact = document.createElement('td');
    contact.append(createText('strong', row.phone), createText('small', row.email));
    tr.appendChild(contact);

    tr.appendChild(createText('td', readableService(row.service)));
    tr.appendChild(createText('td', row.vehicle_plate || '—'));

    const statusCell = document.createElement('td');
    statusCell.appendChild(buildStatusSelect(row.status, ['new', 'contacted', 'in_progress', 'won', 'closed'], async (status) => {
      const { error } = await sb.from('quote_requests').update({ status }).eq('id', row.id);
      if (error) throw error;
      row.status = status;
      await audit(`status:${status}`, 'quote_requests', row.id);
      renderContacts();
    }));
    tr.appendChild(statusCell);
    contactsBody.appendChild(tr);
  });
}

function renderVisas() {
  visasBody.replaceChildren();
  visasEmpty.hidden = visaRows.length > 0;
  renderStats(visaStats, [
    ['Total de formulários', visaRows.length],
    ['Enviados', visaRows.filter((row) => row.status === 'submitted').length],
    ['Em análise', visaRows.filter((row) => row.status === 'in_review').length],
  ]);

  visaRows.forEach((row) => {
    const form = row.form_data || {};
    const tr = document.createElement('tr');
    tr.appendChild(createText('td', fmtDate(row.updated_at || row.created_at)));

    const applicant = document.createElement('td');
    applicant.append(createText('strong', form.full_name || 'Sem nome'), createText('small', form.email || 'E-mail não informado'));
    tr.appendChild(applicant);

    tr.appendChild(createText('td', row.country === 'US' ? 'Estados Unidos' : row.country));
    tr.appendChild(createText('td', `${Number(row.current_step || 0) + 1}/5`));

    const statusCell = document.createElement('td');
    statusCell.appendChild(buildStatusSelect(row.status, ['draft', 'submitted', 'in_review', 'needs_information', 'completed', 'archived'], async (status) => {
      const { error } = await sb.from('visa_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', row.id);
      if (error) throw error;
      row.status = status;
      await audit(`status:${status}`, 'visa_applications', row.id);
      renderVisas();
    }));
    tr.appendChild(statusCell);

    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'detail-button';
    button.type = 'button';
    button.textContent = 'Abrir formulário';
    button.addEventListener('click', () => openVisa(row));
    action.appendChild(button);
    tr.appendChild(action);
    visasBody.appendChild(tr);
  });
}

const fieldLabels = {
  full_name: 'Nome completo', cpf: 'CPF', birth_date: 'Data de nascimento', birth_place: 'Local de nascimento', marital_status: 'Estado civil', nationality: 'Nacionalidade', other_nationality: 'Outra nacionalidade', permanent_resident_elsewhere: 'Residência permanente em outro país', rg: 'RG', address: 'Endereço', city: 'Cidade', state: 'Estado', country: 'País', mailing_same: 'Endereço de correspondência igual', primary_phone: 'Telefone principal', secondary_phone: 'Telefone secundário', email: 'E-mail', social_media: 'Redes sociais', passport_number: 'Número do passaporte', passport_issue_place: 'Local de emissão do passaporte', passport_issue_date: 'Emissão do passaporte', passport_expiry_date: 'Validade do passaporte', passport_lost_stolen: 'Passaporte perdido/roubado', travel_purpose: 'Motivo da viagem', specific_travel_plans: 'Planos específicos de viagem', arrival_date: 'Chegada prevista', stay_duration: 'Duração da estadia', us_stay_address: 'Endereço nos EUA', trip_payer: 'Pagador da viagem', payer_relation: 'Relação com pagador', payer_phone: 'Telefone do pagador', payer_email: 'E-mail do pagador', travel_companions: 'Acompanhantes', been_to_us: 'Já esteve nos EUA', last_us_arrival: 'Última chegada aos EUA', last_us_stay: 'Última permanência', had_us_visa: 'Já teve visto americano', previous_visa_issue_date: 'Emissão do visto anterior', previous_visa_number: 'Número do visto anterior', same_visa_type: 'Mesmo tipo de visto', ten_fingerprints: 'Dez digitais coletadas', visa_lost_stolen: 'Visto perdido/roubado', visa_cancelled: 'Visto cancelado/revogado', visa_refused: 'Visto recusado', immigrant_petition: 'Petição de imigração', us_contact_name: 'Contato nos EUA', us_contact_org: 'Organização nos EUA', us_contact_relation: 'Relação com contato', us_contact_details: 'Dados do contato nos EUA', father_name: 'Nome do pai', father_birth_date: 'Nascimento do pai', father_in_us: 'Pai nos EUA', mother_name: 'Nome da mãe', mother_birth_date: 'Nascimento da mãe', mother_in_us: 'Mãe nos EUA', spouse_name: 'Nome do cônjuge', spouse_birth: 'Nascimento do cônjuge', close_relatives_us: 'Parentes próximos nos EUA', other_relatives_us: 'Outros parentes nos EUA', occupation: 'Ocupação', employer_school: 'Empregador/instituição', role: 'Cargo/função/curso', employment_dates: 'Período de vínculo', employer_address: 'Endereço profissional', employer_phone: 'Telefone profissional', monthly_income: 'Renda mensal', previously_employed: 'Empregos anteriores', education_history: 'Histórico acadêmico', institution_name: 'Instituição', course_name: 'Curso', course_dates: 'Período do curso', languages: 'Idiomas', traveled_last_5_years: 'Viagens nos últimos 5 anos', countries_visited: 'Países visitados', organizations: 'Organizações', military_service: 'Serviço militar', communicable_disease: 'Doença transmissível', mental_physical_threat: 'Condição mental/física relevante', deported: 'Deportação/remoção', additional_notes: 'Observações', declaration: 'Declaração aceita',
};

function humanValue(value) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  if (value === 'sim') return 'Sim';
  if (value === 'nao') return 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return value == null || value === '' ? '—' : String(value);
}

async function openVisa(row) {
  detailTitle.textContent = row.form_data?.full_name || 'Solicitação de visto';
  detailMeta.textContent = `${labelStatus(row.status)} • Atualizado em ${fmtDate(row.updated_at || row.created_at)}`;
  detailContent.replaceChildren();

  const section = document.createElement('section');
  section.className = 'visa-data-section';
  section.appendChild(createText('h3', 'Dados do formulário'));
  const grid = document.createElement('div');
  grid.className = 'visa-data-grid';

  Object.entries(row.form_data || {}).forEach(([key, value]) => {
    const item = document.createElement('div');
    const text = humanValue(value);
    item.className = `visa-data-item${text.length > 100 ? ' full' : ''}`;
    item.append(createText('small', fieldLabels[key] || key.replaceAll('_', ' ')), createText('strong', text));
    grid.appendChild(item);
  });
  section.appendChild(grid);
  detailContent.appendChild(section);
  await audit('view_detail', 'visa_applications', row.id);
  detailDialog.showModal();
}

closeDetail.addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

async function loadAllData() {
  if (!currentUser) return;
  refreshButton.disabled = true;
  refreshButton.textContent = 'Atualizando...';
  try {
    const [quotesResult, visasResult] = await Promise.all([
      sb.from('quote_requests').select('id,created_at,name,email,phone,vehicle_plate,service,status').order('created_at', { ascending: false }).limit(500),
      sb.from('visa_applications').select('id,country,status,current_step,form_data,created_at,updated_at,submitted_at').order('updated_at', { ascending: false }).limit(500),
    ]);
    if (quotesResult.error) throw quotesResult.error;
    if (visasResult.error) throw visasResult.error;
    contactRows = quotesResult.data || [];
    visaRows = visasResult.data || [];
    renderContacts();
    renderVisas();
    await audit('refresh', 'internal_portal');
  } catch (error) {
    console.error('Falha ao carregar área interna:', error);
    window.alert('Não foi possível carregar os dados. A sessão pode ter expirado ou não ter permissão.');
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Atualizar';
  }
}

(async () => {
  clearLoginMessage();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    gate.hidden = false;
    app.hidden = true;
    return;
  }

  if (await isAuthorizedSession(data.user)) {
    await enterApp(data.user);
  } else {
    await rejectSession();
  }
})();
