const sb = window.despachanteSupabase;

const steps = [
  {
    title: 'Dados pessoais',
    description: 'Informações pessoais, contato e passaporte.',
    fields: [
      { name: 'full_name', label: 'Nome completo', required: true, full: true, autocomplete: 'name' },
      { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
      { name: 'birth_date', label: 'Data de nascimento', type: 'date', required: true },
      { name: 'birth_place', label: 'Local de nascimento', placeholder: 'Cidade / Estado / País' },
      { name: 'marital_status', label: 'Estado civil', type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável', 'Outro'] },
      { name: 'nationality', label: 'Nacionalidade', required: true },
      { name: 'other_nationality', label: 'Tem ou teve outra nacionalidade?', type: 'yesno' },
      { name: 'permanent_resident_elsewhere', label: 'É residente permanente de outro país ou região?', type: 'yesno' },
      { name: 'rg', label: 'RG' },
      { name: 'address', label: 'Endereço completo com CEP', full: true, autocomplete: 'street-address' },
      { name: 'city', label: 'Cidade', autocomplete: 'address-level2' },
      { name: 'state', label: 'Estado', autocomplete: 'address-level1' },
      { name: 'country', label: 'País', autocomplete: 'country-name' },
      { name: 'mailing_same', label: 'Endereço de correspondência é o mesmo?', type: 'yesno' },
      { name: 'primary_phone', label: 'Telefone principal', type: 'tel', autocomplete: 'tel' },
      { name: 'secondary_phone', label: 'Telefone secundário', type: 'tel' },
      { name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email' },
      { name: 'social_media', label: 'Redes sociais usadas nos últimos anos', full: true, hint: 'Informe plataforma e usuário. Ex.: Instagram — @usuario' },
      { name: 'passport_number', label: 'Número do passaporte', required: true },
      { name: 'passport_issue_place', label: 'Local de emissão do passaporte' },
      { name: 'passport_issue_date', label: 'Data de emissão', type: 'date' },
      { name: 'passport_expiry_date', label: 'Data de validade', type: 'date' },
      { name: 'passport_lost_stolen', label: 'Já perdeu ou teve um passaporte roubado?', type: 'yesno', full: true },
    ],
  },
  {
    title: 'Informações da viagem',
    description: 'Objetivo, planejamento da viagem e histórico de vistos dos EUA.',
    fields: [
      { name: 'travel_purpose', label: 'Motivo da viagem aos Estados Unidos', required: true, full: true },
      { name: 'specific_travel_plans', label: 'Já possui planos específicos de viagem?', type: 'yesno' },
      { name: 'arrival_date', label: 'Data prevista de chegada', type: 'date' },
      { name: 'stay_duration', label: 'Duração prevista da permanência' },
      { name: 'us_stay_address', label: 'Endereço onde ficará nos EUA', full: true },
      { name: 'trip_payer', label: 'Quem pagará a viagem?' },
      { name: 'payer_relation', label: 'Relação do pagador com você' },
      { name: 'payer_phone', label: 'Telefone do pagador', type: 'tel' },
      { name: 'payer_email', label: 'E-mail do pagador', type: 'email' },
      { name: 'travel_companions', label: 'Outras pessoas viajarão com você?', type: 'yesno' },
      { name: 'been_to_us', label: 'Já esteve nos Estados Unidos?', type: 'yesno' },
      { name: 'last_us_arrival', label: 'Última data de chegada aos EUA', type: 'date' },
      { name: 'last_us_stay', label: 'Tempo da última permanência' },
      { name: 'had_us_visa', label: 'Já teve visto americano?', type: 'yesno' },
      { name: 'previous_visa_issue_date', label: 'Data de emissão do visto anterior', type: 'date' },
      { name: 'previous_visa_number', label: 'Número do visto anterior' },
      { name: 'same_visa_type', label: 'Está solicitando o mesmo tipo de visto?', type: 'yesno' },
      { name: 'ten_fingerprints', label: 'Já teve as impressões dos 10 dedos coletadas?', type: 'yesno' },
      { name: 'visa_lost_stolen', label: 'Já perdeu ou teve visto americano roubado?', type: 'yesno' },
      { name: 'visa_cancelled', label: 'Já teve visto americano cancelado ou revogado?', type: 'yesno' },
      { name: 'visa_refused', label: 'Já teve visto americano recusado?', type: 'yesno' },
      { name: 'immigrant_petition', label: 'Alguém já apresentou petição de imigração em seu nome nos EUA?', type: 'yesno', full: true },
      { name: 'us_contact_name', label: 'Pessoa de contato nos EUA' },
      { name: 'us_contact_org', label: 'Organização de contato nos EUA' },
      { name: 'us_contact_relation', label: 'Relação com o contato' },
      { name: 'us_contact_details', label: 'Endereço, telefone e e-mail do contato', type: 'textarea', full: true },
    ],
  },
  {
    title: 'Família',
    description: 'Informações familiares solicitadas no processo.',
    fields: [
      { name: 'father_name', label: 'Nome completo do pai' },
      { name: 'father_birth_date', label: 'Data de nascimento do pai', type: 'date' },
      { name: 'father_in_us', label: 'Seu pai está nos EUA?', type: 'yesno' },
      { name: 'mother_name', label: 'Nome completo da mãe' },
      { name: 'mother_birth_date', label: 'Data de nascimento da mãe', type: 'date' },
      { name: 'mother_in_us', label: 'Sua mãe está nos EUA?', type: 'yesno' },
      { name: 'spouse_name', label: 'Nome completo do cônjuge' },
      { name: 'spouse_birth', label: 'Data e local de nascimento do cônjuge', full: true },
      { name: 'close_relatives_us', label: 'Tem parentes próximos nos EUA, além de seus pais?', type: 'yesno' },
      { name: 'other_relatives_us', label: 'Tem outros parentes nos EUA?', type: 'yesno' },
    ],
  },
  {
    title: 'Trabalho e educação',
    description: 'Histórico profissional, acadêmico e viagens recentes.',
    fields: [
      { name: 'occupation', label: 'Ocupação principal', required: true },
      { name: 'employer_school', label: 'Empregador atual ou instituição de ensino' },
      { name: 'role', label: 'Cargo / função / curso' },
      { name: 'employment_dates', label: 'Período de vínculo' },
      { name: 'employer_address', label: 'Endereço do empregador ou instituição', full: true },
      { name: 'employer_phone', label: 'Telefone', type: 'tel' },
      { name: 'monthly_income', label: 'Renda mensal aproximada', hint: 'Informe apenas se aplicável.' },
      { name: 'previously_employed', label: 'Teve empregos anteriores?', type: 'yesno' },
      { name: 'education_history', label: 'Cursou ou cursa ensino médio ou superior?', type: 'yesno' },
      { name: 'institution_name', label: 'Nome da instituição' },
      { name: 'course_name', label: 'Curso' },
      { name: 'course_dates', label: 'Período do curso' },
      { name: 'languages', label: 'Idiomas que fala', full: true },
      { name: 'traveled_last_5_years', label: 'Viajou a outros países nos últimos 5 anos?', type: 'yesno' },
      { name: 'countries_visited', label: 'Países visitados', type: 'textarea', full: true },
      { name: 'organizations', label: 'Já pertenceu a organização profissional, social ou de caridade?', type: 'textarea', full: true },
    ],
  },
  {
    title: 'Segurança e declaração',
    description: 'Últimas informações antes de enviar o questionário para análise.',
    fields: [
      { name: 'military_service', label: 'Já serviu às Forças Armadas?', type: 'textarea', full: true, hint: 'Se sim, informe ramo, posição, especialidade e período.' },
      { name: 'communicable_disease', label: 'Possui doença transmissível de importância para a saúde pública?', type: 'yesno', full: true },
      { name: 'mental_physical_threat', label: 'Possui condição mental ou física associada a comportamento que possa representar ameaça?', type: 'yesno', full: true },
      { name: 'deported', label: 'Já foi deportado ou removido de algum país?', type: 'yesno', full: true },
      { name: 'additional_notes', label: 'Observações adicionais', type: 'textarea', full: true },
      { name: 'declaration', label: 'Declaro que as informações fornecidas neste questionário são verdadeiras e completas, e estou ciente de que a decisão sobre o visto cabe exclusivamente às autoridades consulares competentes.', type: 'checkbox', full: true, required: true },
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

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function inputFor(field) {
  const value = state.data[field.name] ?? '';
  const req = field.required ? 'required' : '';
  const autocomplete = field.autocomplete ? `autocomplete="${field.autocomplete}"` : '';
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
  const full = field.full ? ' full' : '';
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

  return `<div class="field-group${full}"><label>${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>${hint}${control}</div>`;
}

function renderProgress() {
  progressRoot.innerHTML = steps.map((step, index) => {
    const classes = ['progress-step'];
    if (index === state.currentStep) classes.push('active');
    if (index < state.currentStep) classes.push('done');
    return `<button type="button" class="${classes.join(' ')}" data-step="${index}" ${index > state.currentStep ? 'disabled' : ''}><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(step.title)}</span></button>`;
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
  fieldsRoot.innerHTML = step.fields.map(inputFor).join('');
  prevButton.hidden = state.currentStep === 0;
  nextButton.textContent = state.currentStep === steps.length - 1 ? 'Enviar questionário' : 'Continuar';
  renderProgress();

  fieldsRoot.querySelectorAll('input,select,textarea').forEach((element) => {
    element.addEventListener('input', scheduleSave);
    element.addEventListener('change', scheduleSave);
  });
}

function collectVisibleData() {
  const elements = fieldsRoot.querySelectorAll('input,select,textarea');
  elements.forEach((element) => {
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
    nextButton.textContent = 'Enviar questionário';
    return;
  }

  document.querySelector('#form-panel').hidden = true;
  progressRoot.hidden = true;
  successPanel.classList.add('show');
  setSaveState('saved', 'Enviado');
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
  window.location.href = './login.html?next=visa-eua.html';
});

(async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.replace('./login.html?next=visa-eua.html');
      return;
    }

    state.user = session.user;
    userEmail.textContent = session.user.email || '';
    state.application = await ensureApplication();
    state.data = state.application.form_data || {};
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
