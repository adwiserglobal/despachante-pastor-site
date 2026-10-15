import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD05n9UT7vPVswl699-DXDJ-YZhiqSqVEU',
  authDomain: 'despachante-pastor-4e8fa.firebaseapp.com',
  projectId: 'despachante-pastor-4e8fa',
  storageBucket: 'despachante-pastor-4e8fa.firebasestorage.app',
  messagingSenderId: '195381885372',
  appId: '1:195381885372:web:d564095721a79e91a553b9',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
await setPersistence(auth, browserSessionPersistence);

const ALLOWED_EMAILS = new Set([
  'despachantepastorinterno@gmail.com',
  'desp.pastor@gmail.com',
]);

const gate = document.querySelector('#internal-gate');
const app = document.querySelector('#internal-app');
const loginButton = document.querySelector('#google-login');
const loginButtonText = loginButton.querySelector('span');
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

let currentUser = null;
let currentView = 'contacts';
let contactRows = [];
let visaRows = [];
let loadingData = false;

function showLoginMessage(message, type = 'error') {
  loginMessage.textContent = message;
  loginMessage.className = `internal-message show ${type}`;
}

function clearLoginMessage() {
  loginMessage.textContent = '';
  loginMessage.className = 'internal-message';
}

function setLoginBusy(busy) {
  loginButton.disabled = busy;
  loginButtonText.textContent = busy ? 'Entrando...' : 'Entrar com Google';
}

function createText(tag, text, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text == null || text === '' ? '—' : String(text);
  return el;
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function readableService(value) {
  return ({
    'documentacao-veicular': 'Documentação veicular',
    transferencia: 'Transferência de veículo',
    regularizacao: 'Regularização',
    vistos: 'Vistos e internacionais',
    outro: 'Outro serviço',
  })[value] || value || 'Não informado';
}

function labelStatus(value) {
  return ({
    new: 'Novo', contacted: 'Contatado', in_progress: 'Em andamento', won: 'Convertido', closed: 'Encerrado',
    draft: 'Rascunho', submitted: 'Enviado', in_review: 'Em análise', needs_information: 'Pedir informação', completed: 'Concluído', archived: 'Arquivado',
  })[value] || value || '—';
}

async function api(action, payload = {}) {
  if (!currentUser) throw new Error('Sessão não encontrada.');
  const token = await currentUser.getIdToken(false);
  const response = await fetch('/api/internal', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let result = {};
  try { result = await response.json(); } catch {}

  if (response.status === 401) {
    await signOut(auth);
    throw new Error(result.error || 'Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}

async function confirmServerAccess(user) {
  const email = String(user?.email || '').toLowerCase();
  if (!ALLOWED_EMAILS.has(email)) return false;
  if (!user.emailVerified) return false;
  currentUser = user;
  const result = await api('whoami');
  return result?.ok === true && String(result.email || '').toLowerCase() === email;
}

async function enterApp(user) {
  currentUser = user;
  userEmailEl.textContent = user.email || '';
  clearLoginMessage();
  gate.hidden = true;
  app.hidden = false;
  await loadAllData();
  await window.PastorLoader?.hide?.(550);
}

async function rejectSession(message) {
  try { await signOut(auth); } catch {}
  await window.PastorLoader?.hide?.(350);
  currentUser = null;
  app.hidden = true;
  gate.hidden = false;
  showLoginMessage(message || 'Esta conta Google não possui acesso à área interna.');
}

loginButton.addEventListener('click', async () => {
  clearLoginMessage();
  setLoginBusy(true);
  window.PastorLoader?.show();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if (!await confirmServerAccess(user)) {
      await rejectSession('Esta conta Google não está autorizada para a área interna.');
      return;
    }
    await enterApp(user);
  } catch (error) {
    console.error(error);
    if (error?.code === 'auth/popup-closed-by-user') {
      showLoginMessage('Login cancelado.');
    } else if (error?.code === 'auth/unauthorized-domain') {
      showLoginMessage('Este domínio ainda não foi autorizado no Firebase Authentication.');
    } else {
      showLoginMessage(error?.message || 'Não foi possível entrar com Google.');
    }
  } finally {
    setLoginBusy(false);
  }
});

logoutButton.addEventListener('click', async () => {
  await signOut(auth);
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
    const previous = value;
    select.disabled = true;
    try {
      await onChange(select.value);
      value = select.value;
    } catch (error) {
      select.value = previous;
      if (!error?.silent) {
        console.error(error);
        window.alert(error?.message || 'Não foi possível atualizar o status.');
      }
    } finally {
      select.disabled = false;
    }
  });
  return select;
}

function askInfoRequest(applicantName) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'info-request-dialog';
    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'info-request-form';
    form.append(
      createText('span', 'INFORMAÇÕES ADICIONAIS'),
      createText('h2', 'O que você precisa do cliente?'),
      createText('p', `${applicantName || 'O cliente'} verá este pedido na área do cliente e poderá responder com texto e anexos.`)
    );
    const area = document.createElement('textarea');
    area.maxLength = 4000;
    area.rows = 6;
    area.placeholder = 'Ex.: Envie o comprovante de renda dos últimos 3 meses e o comprovante de residência.';
    area.required = true;
    const actions = document.createElement('div');
    actions.className = 'info-request-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'detail-button secondary-button';
    cancel.textContent = 'Cancelar';
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'detail-button';
    send.textContent = 'Enviar pedido';
    actions.append(cancel, send);
    form.append(area, actions);
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    let result = null;
    cancel.addEventListener('click', () => dialog.close());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = area.value.trim();
      if (text.length < 3) { area.focus(); return; }
      result = text;
      dialog.close();
    });
    dialog.addEventListener('close', () => { dialog.remove(); resolve(result); });
    dialog.showModal();
    area.focus();
  });
}

function buildDeleteButton(what, onConfirm) {
  const button = document.createElement('button');
  button.className = 'detail-button danger-button';
  button.type = 'button';
  button.textContent = 'Excluir';
  button.addEventListener('click', async () => {
    if (!window.confirm(`Excluir ${what}?\n\nEsta ação é permanente e não pode ser desfeita.`)) return;
    button.disabled = true;
    try {
      await onConfirm();
    } catch (error) {
      console.error(error);
      window.alert(error?.message || 'Não foi possível excluir.');
      button.disabled = false;
    }
  });
  return button;
}

function renderContacts() {
  contactsBody.replaceChildren();
  contactsEmpty.hidden = contactRows.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  renderStats(contactStats, [
    ['Total de contatos', contactRows.length],
    ['Novos', contactRows.filter((row) => row.status === 'new').length],
    ['Recebidos hoje', contactRows.filter((row) => String(row.created_at || '').slice(0, 10) === today).length],
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
      await api('update_quote_status', { id: row.id, status });
      row.status = status;
      renderContacts();
    }));
    tr.appendChild(statusCell);
    const contactAction = document.createElement('td');
    contactAction.appendChild(buildDeleteButton(`o contato de ${row.name || 'este cliente'}`, async () => {
      await api('delete_quote', { id: row.id });
      contactRows = contactRows.filter((item) => item.id !== row.id);
      renderContacts();
    }));
    tr.appendChild(contactAction);
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
    const tr = document.createElement('tr');
    tr.appendChild(createText('td', fmtDate(row.updated_at || row.created_at)));

    const applicant = document.createElement('td');
    applicant.append(createText('strong', row.applicant_name || 'Sem nome'), createText('small', row.applicant_email || 'E-mail não informado'));
    tr.appendChild(applicant);

    tr.appendChild(createText('td', row.country === 'US' ? 'Estados Unidos' : row.country));
    tr.appendChild(createText('td', `${Number(row.current_step || 0) + 1}/5`));

    const statusCell = document.createElement('td');
    statusCell.appendChild(buildStatusSelect(row.status, ['draft', 'submitted', 'in_review', 'needs_information', 'completed', 'archived'], async (status) => {
      if (status === 'needs_information') {
        const message = await askInfoRequest(row.applicant_name);
        if (!message) throw Object.assign(new Error('cancelado'), { silent: true });
        await api('request_info', { id: row.id, message });
        row.info_request = 'open';
      } else {
        await api('update_visa_status', { id: row.id, status });
      }
      row.status = status;
      renderVisas();
    }));
    if (row.info_request === 'answered' && row.status === 'needs_information') {
      statusCell.appendChild(createText('small', '✓ Cliente respondeu'));
    } else if (row.info_request === 'open' && row.status === 'needs_information') {
      statusCell.appendChild(createText('small', 'Aguardando cliente'));
    }
    tr.appendChild(statusCell);

    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'detail-button';
    button.type = 'button';
    button.textContent = 'Abrir formulário';
    button.addEventListener('click', () => openVisa(row));
    action.appendChild(button);
    action.appendChild(buildDeleteButton(`o formulário de ${row.applicant_name || 'este solicitante'} e todos os anexos`, async () => {
      await api('delete_visa', { id: row.id });
      visaRows = visaRows.filter((item) => item.id !== row.id);
      renderVisas();
    }));
    tr.appendChild(action);
    visasBody.appendChild(tr);
  });
}

const fieldLabels = {
  full_name: 'Nome completo', cpf: 'CPF', birth_date: 'Data de nascimento', birth_place: 'Local de nascimento', marital_status: 'Estado civil', nationality: 'Nacionalidade', other_nationality: 'Outra nacionalidade', permanent_resident_elsewhere: 'Residência permanente em outro país', rg: 'RG', address: 'Endereço', city: 'Cidade', state: 'Estado', country: 'País', mailing_same: 'Endereço de correspondência igual', primary_phone: 'Telefone principal', secondary_phone: 'Telefone secundário', email: 'E-mail', social_media: 'Redes sociais', passport_number: 'Número do passaporte', passport_issue_place: 'Local de emissão do passaporte', passport_issue_date: 'Emissão do passaporte', passport_expiry_date: 'Validade do passaporte', passport_lost_stolen: 'Passaporte perdido/roubado', travel_purpose: 'Motivo da viagem', specific_travel_plans: 'Planos específicos de viagem', arrival_date: 'Chegada prevista', stay_duration: 'Duração da estadia', us_stay_address: 'Endereço nos EUA', trip_payer: 'Pagador da viagem', payer_relation: 'Relação com pagador', payer_phone: 'Telefone do pagador', payer_email: 'E-mail do pagador', travel_companions: 'Acompanhantes', been_to_us: 'Já esteve nos EUA', last_us_arrival: 'Última chegada aos EUA', last_us_stay: 'Última permanência', had_us_visa: 'Já teve visto americano', previous_visa_issue_date: 'Emissão do visto anterior', previous_visa_number: 'Número do visto anterior', same_visa_type: 'Mesmo tipo de visto', ten_fingerprints: 'Dez digitais coletadas', visa_lost_stolen: 'Visto perdido/roubado', visa_cancelled: 'Visto cancelado/revogado', visa_refused: 'Visto recusado', immigrant_petition: 'Petição de imigração', us_contact_name: 'Contato nos EUA', us_contact_org: 'Organização nos EUA', us_contact_relation: 'Relação com contato', us_contact_details: 'Dados do contato nos EUA', father_name: 'Nome do pai', father_birth_date: 'Nascimento do pai', father_in_us: 'Pai nos EUA', mother_name: 'Nome da mãe', mother_birth_date: 'Nascimento da mãe', mother_in_us: 'Mãe nos EUA', spouse_name: 'Nome do cônjuge', spouse_birth: 'Nascimento do cônjuge', close_relatives_us: 'Parentes próximos nos EUA', other_relatives_us: 'Outros parentes nos EUA', occupation: 'Ocupação', employer_school: 'Empregador/instituição', role: 'Cargo/função/curso', employment_dates: 'Período de vínculo', employer_address: 'Endereço profissional', employer_phone: 'Telefone profissional', monthly_income: 'Renda mensal', previously_employed: 'Empregos anteriores', education_history: 'Histórico acadêmico', institution_name: 'Instituição', course_name: 'Curso', course_dates: 'Período do curso', languages: 'Idiomas', traveled_last_5_years: 'Viagens nos últimos 5 anos', countries_visited: 'Países visitados', organizations: 'Organizações', military_service: 'Serviço militar', communicable_disease: 'Doença transmissível', mental_physical_threat: 'Condição mental/física relevante', deported: 'Deportação/remoção', additional_notes: 'Observações', declaration: 'Declaração aceita',
};
Object.assign(fieldLabels, { ex_spouse_name: 'Nome do ex-esposo(a)', ex_spouse_birth_place: 'Cidade de nascimento do ex-esposo(a)', ex_spouse_birth_date: 'Nascimento do ex-esposo(a)', marriage_date: 'Data do casamento', divorce_date: 'Data do divórcio', employer_school: 'Empregador atual / CNPJ' });

function humanValue(value) {
  if (value === true || value === 'sim') return 'Sim';
  if (value === false || value === 'nao') return 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return value == null || value === '' ? '—' : String(value);
}

async function openVisa(row) {
  try {
    const { row: detail, info_requests: infoRequests = [] } = await api('get_visa', { id: row.id });
    detailTitle.textContent = detail?.form_data?.full_name || row.applicant_name || 'Solicitação de visto';
    detailMeta.textContent = `${detail.form_data?.applicant_relationship || 'Titular'} • ${labelStatus(detail.status)} • Atualizado em ${fmtDate(detail.updated_at || detail.created_at)}`;
    detailContent.replaceChildren();

    const section = document.createElement('section');
    section.className = 'visa-data-section';
    section.appendChild(createText('h3', 'Dados do formulário'));
    const grid = document.createElement('div');
    grid.className = 'visa-data-grid';

    Object.entries(detail.form_data || {}).forEach(([key, value]) => {
      const item = document.createElement('div');
      const text = humanValue(value);
      item.className = `visa-data-item${text.length > 100 ? ' full' : ''}`;
      item.appendChild(createText('small', fieldLabels[key] || key.replaceAll('_', ' ')));
      if (['passport_file','previous_visa_file','other_nationality_file'].includes(key) && value) {
        const button = document.createElement('button');
        button.className = 'detail-button';
        button.type = 'button';
        button.textContent = 'Abrir anexo ↗';
        button.addEventListener('click', async () => {
          button.disabled = true;
          const popup = window.open('', '_blank');
          try {
            const {url} = await api('get_visa_document', {id:detail.id,field:key});
            if (popup) { popup.opener = null; popup.location.href = url; } else { window.location.assign(url); }
          } catch (error) {
            if (popup) popup.close();
            window.alert(error?.message || 'Não foi possível abrir este anexo.');
          } finally {
            button.disabled = false;
          }
        });
        item.appendChild(button);
      } else {
        item.appendChild(createText('strong', text));
      }
      grid.appendChild(item);
    });

    section.appendChild(grid);
    if (infoRequests.length) {
      const requestsSection = document.createElement('section');
      requestsSection.className = 'visa-data-section';
      requestsSection.appendChild(createText('h3', 'Pedidos de informação'));
      infoRequests.forEach((request) => {
        const box = document.createElement('div');
        box.className = 'visa-data-item full info-thread';
        box.appendChild(createText('small', `Pedido em ${fmtDate(request.created_at)}${request.requested_by ? ' · ' + request.requested_by : ''}`));
        box.appendChild(createText('strong', request.message));
        const reply = document.createElement('div');
        reply.className = 'info-reply';
        if (request.status === 'answered') {
          reply.appendChild(createText('small', `Resposta do cliente em ${fmtDate(request.replied_at)}`));
          if (request.reply_text) reply.appendChild(createText('strong', request.reply_text));
          (request.reply_files || []).forEach((file, index) => {
            const open = document.createElement('button');
            open.className = 'detail-button';
            open.type = 'button';
            open.textContent = `Abrir anexo ${index + 1} ↗`;
            open.addEventListener('click', async () => {
              open.disabled = true;
              const popup = window.open('', '_blank');
              try {
                const { url } = await api('get_info_reply_file', { request_id: request.id, index });
                if (popup) { popup.opener = null; popup.location.href = url; } else { window.location.assign(url); }
              } catch (error) {
                if (popup) popup.close();
                window.alert(error?.message || 'Não foi possível abrir este anexo.');
              } finally { open.disabled = false; }
            });
            reply.appendChild(open);
          });
        } else {
          reply.appendChild(createText('small', 'Aguardando resposta do cliente'));
        }
        box.appendChild(reply);
        requestsSection.appendChild(box);
      });
      detailContent.appendChild(requestsSection);
    }
    detailContent.appendChild(section);
    detailDialog.showModal();
  } catch (error) {
    window.alert(error?.message || 'Não foi possível abrir o formulário.');
  }
}

closeDetail.addEventListener('click', () => detailDialog.close());
detailDialog.addEventListener('click', (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

async function loadAllData() {
  if (!currentUser || loadingData) return;
  loadingData = true;
  refreshButton.disabled = true;
  refreshButton.textContent = 'Atualizando...';
  try {
    const [quotes, visas] = await Promise.all([
      api('list_quotes'),
      api('list_visas'),
    ]);
    contactRows = quotes.rows || [];
    visaRows = visas.rows || [];
    renderContacts();
    renderVisas();
  } catch (error) {
    console.error(error);
    if (!auth.currentUser) {
      await rejectSession(error?.message || 'Sua sessão expirou. Entre novamente.');
    } else {
      window.alert(error?.message || 'Não foi possível carregar os dados internos.');
    }
  } finally {
    loadingData = false;
    refreshButton.disabled = false;
    refreshButton.textContent = 'Atualizar';
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    app.hidden = true;
    gate.hidden = false;
    await window.PastorLoader?.hide?.(0);
    return;
  }

  try {
    setLoginBusy(true);
    window.PastorLoader?.show();
    if (!await confirmServerAccess(user)) {
      await rejectSession('Esta conta Google não está autorizada para a área interna.');
      return;
    }
    await enterApp(user);
  } catch (error) {
    console.error(error);
    await rejectSession(error?.message || 'Não foi possível validar seu acesso.');
  } finally {
    setLoginBusy(false);
  }
});
