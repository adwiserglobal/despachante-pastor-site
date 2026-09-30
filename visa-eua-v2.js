const sb = window.despachanteSupabase;

const steps = [
  {
    title: 'Dados Pessoais',
    description: '',
    fields: [
      { name: 'full_name', label: 'Nome Completo', required: true, autocomplete: 'name' },
      { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
      { name: 'birth_date', label: 'Data de Nascimento', hint: '(DD/MM/AAAA)', required: true },
      { name: 'birth_place', label: 'Local de Nascimento' },
      { name: 'marital_status', label: 'Estado Civil', type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável', 'Outro'] },
      { name: 'nationality', label: 'Nacionalidade', required: true },
      { name: 'other_nationality', label: 'Você tem ou teve alguma nacionalidade diferente da indicada acima?', type: 'yesno' },
      { name: 'permanent_resident_elsewhere', label: 'Você é residente permanente de um país ou região diferente do seu país de origem?', type: 'yesno' },
      { name: 'rg', label: 'RG', hint: 'Número com dígito' },
      { name: 'us_ssn', label: 'Número do seguro social EUA' },
      { name: 'us_tax_id', label: 'Número Identificação contribuinte EUA' },
      { name: 'address', label: 'Endereço Completo com CEP', autocomplete: 'street-address' },
      { name: 'city', label: 'Cidade', autocomplete: 'address-level2' },
      { name: 'state', label: 'Estado', autocomplete: 'address-level1' },
      { name: 'country', label: 'País', autocomplete: 'country-name' },
      { name: 'mailing_same', label: 'Mesmo endereço de correspondência', type: 'yesno', hint: 'Se não for, informe o endereço de correspondência nas observações finais.' },
      { name: 'primary_phone', label: 'Nº telefone principal', type: 'tel', hint: 'Com DDD', autocomplete: 'tel' },
      { name: 'secondary_phone', label: 'Nº telefone secundário', type: 'tel', hint: 'Com DDD' },
      { name: 'business_phone', label: 'Nº telefone empresa', type: 'tel', hint: 'Com DDD' },
      { name: 'additional_phone', label: 'Você tem algum nº telefone adicional?', type: 'yesno' },
      { name: 'email', label: 'Endereço de E-mail', type: 'email', required: true, autocomplete: 'email' },
      { name: 'additional_email', label: 'Você tem algum e-mail adicional?', type: 'yesno' },
      { name: 'has_social_media', label: 'Você tem redes sociais?', type: 'yesno' },
      { name: 'social_media_1', label: '1 - Informa o nome da plataforma e usuário' },
      { name: 'social_media_2', label: '2 - Informa o nome da plataforma e usuário' },
      { name: 'passport_number', label: 'Passaporte número e série', hint: 'Exemplo: (AB 123456)', required: true },
      { name: 'passport_issue_place', label: 'País, estado e cidade que emitiu o passaporte' },
      { name: 'passport_issue_date', label: 'Data de emissão', hint: '(DD/MM/AAAA)' },
      { name: 'passport_expiry_date', label: 'Data de validade', hint: '(DD/MM/AAAA)' },
      { name: 'passport_lost_stolen', label: 'Você já perdeu ou roubaram o seu passaporte?', type: 'yesno' },
    ],
  },
  {
    title: 'Informações da Viagem',
    description: '',
    fields: [
      { name: 'travel_purpose', label: 'Qual o motivo da viagem aos EUA?', required: true },
      { name: 'specific_travel_plans', label: 'Você tem planos específicos de viagem?', type: 'yesno' },
      { name: 'arrival_date', label: 'Data prevista de chegada', hint: '(DD/MM/AAAA)' },
      { name: 'stay_duration', label: 'Duração prevista de permanência nos EUA' },
      { name: 'us_stay_address', label: 'Endereço onde vai ficar nos EUA' },
      { name: 'us_stay_location', label: 'Estado, cidade e CEP' },
      { name: 'trip_payer', label: 'Pessoa ou empresa que está pagando sua viagem' },
      { name: 'payer_phone', label: 'Número de Telefone', type: 'tel' },
      { name: 'payer_email', label: 'Endereço de E-mail', type: 'email' },
      { name: 'payer_relation', label: 'Relacionamento com você' },
      { name: 'payer_same_address', label: 'O endereço da pessoa que está pagando sua viagem é igual ao seu endereço residencial ou de correspondência?', type: 'yesno' },
      { name: 'travel_companions', label: 'Existem outras pessoas viajando com você?', type: 'yesno' },
      { name: 'been_to_us', label: 'Você já esteve nos EUA?', type: 'yesno' },
      { name: 'last_us_arrival', label: 'Data de chegada', hint: '(DD/MM/AAAA)' },
      { name: 'last_us_stay', label: 'Tempo de permanência' },
      { name: 'us_driver_license', label: 'Você tem ou já teve carteira de motorista americana?', type: 'yesno' },
      { name: 'had_us_visa', label: 'Tem visto emitido para o EUA?', type: 'yesno' },
      { name: 'previous_visa_issue_date', label: 'Data de emissão do visto', hint: '(DD/MM/AAAA)' },
      { name: 'previous_visa_number', label: 'Número do visto' },
      { name: 'same_visa_type', label: 'Você está solicitando o mesmo tipo de visto?', type: 'yesno' },
      { name: 'same_country_application', label: 'Você está se inscrevendo no mesmo país onde o visto acima foi emitido? E este é o seu país de residência principal?', type: 'yesno' },
      { name: 'ten_fingerprints', label: 'Você já tirou impressão digital dos 10 dedos?', type: 'yesno' },
      { name: 'visa_lost_stolen', label: 'Você já perdeu ou teve seu visto americano roubado?', type: 'yesno' },
      { name: 'visa_cancelled', label: 'Seu visto americano já foi cancelado ou revogado?', type: 'yesno' },
      { name: 'visa_refused', label: 'Seu visto americano já foi recusado?', type: 'yesno' },
      { name: 'immigrant_petition', label: 'Alguém entrou com pedido de visto de imigrante em seu nome junto a imigração dos EUA?', type: 'yesno' },
      { name: 'us_contact_name', label: 'Nome da pessoa de contato no EUA' },
      { name: 'us_contact_org', label: 'Nome da organização nos EUA' },
      { name: 'us_contact_relation', label: 'Relacionamento com você' },
      { name: 'us_contact_address', label: 'Endereço do contato nos EUA' },
      { name: 'us_contact_details', label: 'Telefone e e-mail do contato nos EUA' },
    ],
  },
  {
    title: 'Família',
    description: '',
    fields: [
      { name: 'father_last_name', label: 'Sobrenome do pai' },
      { name: 'father_name', label: 'Nome do pai' },
      { name: 'father_birth_date', label: 'Data de nascimento do pai', hint: '(DD/MM/AAAA)' },
      { name: 'father_in_us', label: 'Seu pai está nos EUA?', type: 'yesno' },
      { name: 'mother_last_name', label: 'Sobrenome da mãe' },
      { name: 'mother_name', label: 'Nome da mãe' },
      { name: 'mother_birth_date', label: 'Data de nascimento da mãe', hint: '(DD/MM/AAAA)' },
      { name: 'mother_in_us', label: 'Sua mãe está nos EUA?', type: 'yesno' },
      { name: 'spouse_last_name', label: 'Sobrenome do cônjuge' },
      { name: 'spouse_name', label: 'Nome do cônjuge' },
      { name: 'spouse_birth', label: 'Data e local de Nascimento do cônjuge' },
      { name: 'close_relatives_us', label: 'Você tem parentes próximos nos EUA (não incluindo seus pais)?', type: 'yesno' },
      { name: 'other_relatives_us', label: 'Você tem outro parente nos EUA?', type: 'yesno' },
    ],
  },
  {
    title: 'Trabalho e Educação',
    description: '',
    fields: [
      { name: 'occupation', label: 'Ocupação principal', required: true },
      { name: 'employer_school', label: 'Nome do empregador atual ou escola' },
      { name: 'role', label: 'Função' },
      { name: 'employment_dates', label: 'Datas de admissão e demissão' },
      { name: 'employer_address', label: 'Endereço Completo com CEP' },
      { name: 'employer_phone', label: 'Telefone', type: 'tel' },
      { name: 'monthly_income', label: 'Renda Mensal', hint: 'Para comprovar no dia da entrevista' },
      { name: 'previously_employed', label: 'Estava empregado anteriormente?', type: 'yesno' },
      { name: 'education_history', label: 'Cursou ou está cursando ensino médio ou superior?', type: 'yesno' },
      { name: 'institution_name', label: 'Nome da instituição' },
      { name: 'institution_address', label: 'Endereço completo com CEP' },
      { name: 'course_name', label: 'Nome do curso' },
      { name: 'course_dates', label: 'Data de início e fim do curso' },
      { name: 'clan_tribe', label: 'Você pertence a um clã ou tribo?', type: 'yesno' },
      { name: 'languages', label: 'Informe os idiomas que você fala' },
      { name: 'traveled_last_5_years', label: 'Você viajou para algum país nos últimos 5 anos?', type: 'yesno' },
      { name: 'countries_visited', label: 'Informe os países que visitou' },
      { name: 'organizations', label: 'Você já pertenceu a alguma organização profissional, social ou de caridade?', type: 'yesno' },
    ],
  },
  {
    title: 'Segurança',
    description: '',
    fields: [
      { name: 'military_service', label: 'Você já serviu o exército?', type: 'textarea', hint: 'Se sim, informe: ramo do serviço, posição, especialidade militar, período.' },
      { name: 'communicable_disease', label: 'Você tem alguma doença transmissível de importância para a saúde pública?', type: 'yesno' },
      { name: 'mental_physical_threat', label: 'Você tem algum distúrbio mental ou físico que represente ameaça?', type: 'yesno' },
      { name: 'deported', label: 'Você já foi deportado de algum país?', type: 'yesno' },
      { name: 'additional_notes', label: 'Observações adicionais', type: 'textarea' },
      { name: 'declaration', label: 'Declaro que as informações declaradas acima são verdadeiras e que estou ciente que a omissão de informações ou a apresentação de dados ou documentos falsos e/ou divergentes podem comprometer o processo de visto.', type: 'checkbox', required: true },
    ],
  },
];

const state = {
  user: null,
  application: null,
  data: {},
  currentStep: 0,
  saveTimer: null,
  saving: false,
};

const loading = document.querySelector('#application-loading');
const app = document.querySelector('#application-content');
const form = document.querySelector('#visa-form');
const fieldsRoot = document.querySelector('#form-fields');
const panelTitle = document.querySelector('#step-title');
const panelDescription = document.querySelector('#step-description');
const progressRoot = document.querySelector('#application-progress');
const prevButton = document.querySelector('#prev-step');
const nextButton = document.querySelector('#next-step');
const saveIndicator = document.querySelector('#save-indicator');
const saveText = document.querySelector('#save-text');
const userEmail = document.querySelector('#user-email');
const successPanel = document.querySelector('#success-panel');
const stepCounter = document.querySelector('#step-counter');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function inputFor(field) {
  const value = state.data[field.name] ?? '';
  const req = field.required ? 'required' : '';
  const autocomplete = field.autocomplete ? `autocomplete="${field.autocomplete}"` : '';
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
  const hint = field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : '';

  if (field.type === 'checkbox') {
    return `<label class="declaration-box"><input type="checkbox" name="${field.name}" ${value === true ? 'checked' : ''} ${req}><span>${escapeHtml(field.label)}</span></label>`;
  }

  let control = '';
  if (field.type === 'yesno') {
    control = `<select name="${field.name}" ${req}><option value="">Selecione...</option><option value="sim" ${value === 'sim' ? 'selected' : ''}>Sim</option><option value="nao" ${value === 'nao' ? 'selected' : ''}>Não</option></select>`;
  } else if (field.type === 'select') {
    control = `<select name="${field.name}" ${req}><option value="">Selecione...</option>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea name="${field.name}" ${req} ${placeholder}>${escapeHtml(value)}</textarea>`;
  } else {
    control = `<input name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${req} ${autocomplete} ${placeholder}>`;
  }

  return `<div class="field-group"><label>${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>${hint}${control}</div>`;
}

function renderProgress() {
  progressRoot.innerHTML = steps.map((step, index) => {
    const classes = ['progress-step'];
    if (index === state.currentStep) classes.push('active');
    if (index < state.currentStep) classes.push('done');
    const marker = index < state.currentStep ? '✓' : String(index + 1);
    return `<button type="button" class="${classes.join(' ')}" data-step="${index}" ${index > state.currentStep ? 'disabled' : ''} aria-label="Passo ${index + 1}: ${escapeHtml(step.title)}"><b>${marker}</b><span>${escapeHtml(step.title)}</span></button>`;
  }).join('');

  progressRoot.querySelectorAll('.progress-step.done').forEach((button) => {
    button.addEventListener('click', async () => {
      collectVisibleData();
      await saveDraft(false);
      state.currentStep = Number(button.dataset.step);
      renderStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderStep() {
  const step = steps[state.currentStep];
  panelTitle.textContent = step.title;
  panelDescription.textContent = step.description;
  panelDescription.hidden = !step.description;
  fieldsRoot.innerHTML = step.fields.map(inputFor).join('');
  prevButton.hidden = state.currentStep === 0;
  nextButton.textContent = state.currentStep === steps.length - 1 ? 'Enviar Questionário' : 'Próximo Passo →';
  stepCounter.textContent = `Passo ${state.currentStep + 1} de ${steps.length}`;
  renderProgress();

  fieldsRoot.querySelectorAll('input,select,textarea').forEach((element) => {
    element.addEventListener('input', scheduleSave);
    element.addEventListener('change', scheduleSave);
  });
}

function collectVisibleData() {
  fieldsRoot.querySelectorAll('input,select,textarea').forEach((element) => {
    state.data[element.name] = element.type === 'checkbox' ? element.checked : element.value;
  });
}

function setSaveState(type, text) {
  saveIndicator.className = `save-indicator ${type || ''}`.trim();
  saveText.textContent = text;
}

function scheduleSave() {
  collectVisibleData();
  setSaveState('saving', 'Salvando...');
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => saveDraft(), 700);
}

async function saveDraft(showState = true) {
  if (!state.application || state.saving) return;
  collectVisibleData();
  state.saving = true;
  if (showState) setSaveState('saving', 'Salvando...');

  const { error } = await sb
    .from('visa_applications')
    .update({ form_data: state.data, current_step: state.currentStep })
    .eq('id', state.application.id);

  state.saving = false;
  if (error) {
    setSaveState('', 'Falha ao salvar');
    console.error(error);
    return;
  }
  setSaveState('saved', 'Progresso salvo');
}

async function ensureApplication() {
  const { data: existing, error: existingError } = await sb
    .from('visa_applications')
    .select('*')
    .eq('user_id', state.user.id)
    .eq('country', 'US')
    .eq('status', 'draft')
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error } = await sb
    .from('visa_applications')
    .insert({ user_id: state.user.id, country: 'US', status: 'draft' })
    .select('*')
    .single();
  if (error) throw error;
  return created;
}

async function submitApplication() {
  collectVisibleData();
  if (state.data.declaration !== true) {
    alert('Você precisa aceitar a declaração antes de enviar.');
    return;
  }

  nextButton.disabled = true;
  nextButton.textContent = 'Enviando...';

  const { error } = await sb
    .from('visa_applications')
    .update({
      form_data: state.data,
      current_step: state.currentStep,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', state.application.id);

  if (error) {
    console.error(error);
    alert('Não foi possível enviar agora. Seu progresso continua salvo. Tente novamente.');
    nextButton.disabled = false;
    nextButton.textContent = 'Enviar Questionário';
    return;
  }

  document.querySelector('#form-panel').hidden = true;
  progressRoot.hidden = true;
  document.querySelector('.application-status-row').hidden = true;
  successPanel.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  collectVisibleData();
  await saveDraft(false);

  if (state.currentStep < steps.length - 1) {
    state.currentStep += 1;
    renderStep();
    await saveDraft(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  await submitApplication();
});

prevButton.addEventListener('click', async () => {
  collectVisibleData();
  await saveDraft(false);
  state.currentStep = Math.max(0, state.currentStep - 1);
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  collectVisibleData();
  await saveDraft(false);
  await sb.auth.signOut();
  window.location.href = './login.html';
});

(async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.replace('./login.html');
      return;
    }

    state.user = session.user;
    userEmail.textContent = session.user.email || '';
    state.application = await ensureApplication();
    state.data = state.application.form_data || {};
    if (!state.data.email && session.user.email) state.data.email = session.user.email;
    state.currentStep = Math.max(0, Math.min(Number(state.application.current_step || 0), steps.length - 1));
    loading.hidden = true;
    app.hidden = false;
    renderStep();
    setSaveState('saved', 'Progresso salvo');
  } catch (error) {
    console.error(error);
    loading.textContent = 'Não foi possível carregar seu formulário. Atualize a página ou tente novamente mais tarde.';
  }
})();
