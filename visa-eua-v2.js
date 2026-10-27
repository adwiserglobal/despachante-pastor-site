const sb = window.despachanteSupabase;
window.PastorLoader?.show();

const steps = window.VISA_STEPS;

const state = {
  user: null,
  application: null,
  data: {},
  currentStep: 0,
  saveTimer: null,
  saving: false,
  reviewing: false,
  submitting: false,
  uploading: false,
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

// Prévias locais dos anexos enviados nesta sessão (campo -> { url, isImage, size })
const localPreviews = new Map();

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

async function viewDocument(fieldName) {
  const preview = localPreviews.get(fieldName);
  const path = state.data[fieldName];
  const popup = window.open('', '_blank');
  try {
    let url = preview?.url;
    if (!url) {
      const { data, error } = await sb.storage.from('visa-documents').createSignedUrl(path, 300);
      if (error || !data?.signedUrl) throw error || new Error('sem url');
      url = data.signedUrl;
    }
    if (popup) { popup.opener = null; popup.location.href = url; } else { window.location.assign(url); }
  } catch (error) {
    console.error(error);
    if (popup) popup.close();
    alert('Não foi possível abrir o documento agora. Ele continua salvo no seu formulário.');
  }
}

function inputFor(field) {
  const rawValue = state.data[field.name] ?? '';
  const value = field.type === 'checkbox' ? rawValue : window.VisaValidation.format(field.name,rawValue);
  const req = field.required ? 'required' : '';
  const mark = field.required ? ' *' : '';
  const autocomplete = field.autocomplete ? `autocomplete="${field.autocomplete}"` : '';
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
  const hint = field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : '';

  if (field.type === 'file') {
    const path = state.data[field.name];
    const preview = localPreviews.get(field.name);
    const kind = /\.pdf$/i.test(path || '') ? 'PDF' : 'Imagem';
    const thumb = preview?.isImage
      ? `<img class="file-thumb" src="${preview.url}" alt="Prévia do documento anexado">`
      : `<span class="file-attached-icon" aria-hidden="true">${kind === 'PDF' ? 'PDF' : '✓'}</span>`;
    const card = path ? `<div class="file-attached" role="status">${thumb}
        <div class="file-attached-info"><strong>✓ Documento anexado</strong><small>${kind}${preview ? ' · ' + formatBytes(preview.size) : ''} · salvo com segurança</small></div>
        <button type="button" class="file-view" data-view-file="${field.name}">Visualizar</button></div>` : '';
    return `<div class="field-group"><label for="${field.name}">${escapeHtml(field.label)}${mark}</label>
      ${card}
      <input id="${field.name}" type="file" name="${field.name}" accept="image/jpeg,image/png,image/webp,application/pdf"
      ${!path && field.required ? 'required' : ''} aria-describedby="${field.name}-hint">
      <small id="${field.name}-hint" class="field-hint">${path
        ? 'Para trocar o documento, selecione outro arquivo.'
        : 'JPG, PNG, WebP ou PDF, até 10 MB.'}</small></div>`;
  }
  if (field.type === 'checkbox') {
    return `<label class="declaration-box"><input type="checkbox" name="${field.name}" ${value === true ? 'checked' : ''} ${req}><span>${escapeHtml(field.label)}</span></label>`;
  }

  let control = '';
  if (field.type === 'yesno') {
    control = `<select name="${field.name}" ${req}><option value="">Selecione...</option><option value="sim" ${value === 'sim' ? 'selected' : ''}>Sim</option><option value="nao" ${value === 'nao' ? 'selected' : ''}>Não</option></select>`;
  } else if (field.type === 'select') {
    control = `<select name="${field.name}" ${req}><option value="">Selecione...</option>${field.options.map(option =>
      `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`
    ).join('')}</select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea name="${field.name}" ${req} ${placeholder}>${escapeHtml(value)}</textarea>`;
  } else {
    const numericDate = window.VisaValidation.dateFields.has(field.name);
    const extra = numericDate
      ? 'inputmode="numeric" maxlength="10" placeholder="DD/MM/AAAA"'
      : field.name === 'cpf' ? 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00"'
      : field.name === 'passport_number' ? 'maxlength="24" autocapitalize="characters"'
      : ['primary_phone','secondary_phone','business_phone','payer_phone','employer_phone'].includes(field.name)
        ? 'inputmode="tel" maxlength="19"'
      : field.name === 'monthly_income' ? 'inputmode="decimal" placeholder="Ex.: 5.000,00"'
      : field.name === 'us_ssn' ? 'inputmode="numeric" maxlength="11"'
      : field.name === 'rg' ? 'inputmode="numeric" maxlength="14" autocapitalize="characters"'
      : field.name === 'previous_visa_number' ? 'inputmode="numeric" maxlength="8"'
      : field.name === 'employer_school' ? 'maxlength="160"' : '';
    control = `<input name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${extra} ${req} ${autocomplete} ${placeholder}>`;
  }

  return `<div class="field-group"><label>${escapeHtml(field.label)}${mark}</label>${hint}${control}</div>`;
}

function isFieldVisible(field) {
  if (!field.showIf) return true;
  return Object.entries(field.showIf).every(([key, value]) => (state.data[key] ?? false) === value);
}

function refreshConditionalFields() {
  const current = steps[state.currentStep].fields;
  const active = new Set([...fieldsRoot.querySelectorAll('input,select,textarea')].map(el => el.name));
  const desired = new Set(current.filter(isFieldVisible).map(field => field.name));
  if ([...active].length !== desired.size || [...desired].some(name => !active.has(name))) {
    collectVisibleData();
    renderStep();
  }
}

// Identifica o tipo real do arquivo pela assinatura (não confia na extensão nem no tipo informado)
async function detectFileKind(file) {
  const head=new Uint8Array(await file.slice(0,1024).arrayBuffer());
  const ascii=String.fromCharCode(...head);
  if(ascii.slice(0,1024).includes('%PDF'))return 'application/pdf';
  if(head[0]===0x89 && ascii.slice(1,4)==='PNG')return 'image/png';
  if(head[0]===0xFF && head[1]===0xD8)return 'image/jpeg';
  if(ascii.startsWith('RIFF') && ascii.slice(8,12)==='WEBP')return 'image/webp';
  if(ascii.slice(4,8)==='ftyp' && /heic|heix|hevc|mif1|heif/.test(ascii.slice(8,16)))return 'heic';
  return null;
}

// Reduz fotos grandes (comuns em celulares) para caber no limite sem perder legibilidade
async function shrinkImage(file) {
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,2600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(bitmap.width*scale);
  canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close?.();
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('compress')),'image/jpeg',0.85));
}

async function uploadDocument(event) {
  const element=event.currentTarget;
  let file=element.files?.[0];
  if(!file)return;
  if(state.uploading)return;
  const fail=(message)=>{element.value='';setSaveState('','Não foi possível concluir o anexo');alert(message);};
  if(file.size===0)return fail('O arquivo está vazio. Selecione outro arquivo.');
  let kind;
  try { kind=await detectFileKind(file); } catch { kind=null; }
  if(kind==='heic')return fail('Fotos em formato HEIC (iPhone) não são aceitas. Envie em JPG, PNG ou PDF. No iPhone: Ajustes > Câmera > Formatos > "Mais Compatível".');
  if(!kind)return fail('O arquivo não parece ser uma imagem (JPG, PNG, WebP) ou PDF válido. Selecione outro arquivo.');
  let uploadType=kind;
  if(kind!=='application/pdf' && file.size>2*1024*1024) {
    try {
      setSaveState('saving','Otimizando imagem...');
      file=await shrinkImage(file);
      uploadType='image/jpeg';
    } catch(error) {
      console.error('Não foi possível otimizar a imagem:',error);
    }
  }
  if(file.size>10485760)return fail('O arquivo é maior que 10 MB. Envie uma foto menor ou um PDF mais leve.');
  const fieldName=element.name;
  const previousPath=state.data[fieldName];
  // Nome aleatório: o nome original do arquivo pode conter dados pessoais
  const extension={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[uploadType];
  const path=`${state.user.id}/${state.application.id}/${fieldName}/${Date.now()}_${crypto.randomUUID()}.${extension}`;
  state.uploading=true;
  element.disabled=true;
  nextButton.disabled=true;
  setSaveState('saving','Enviando documento...');
  try {
    const {error}=await sb.storage.from('visa-documents').upload(path,file,{
      contentType:uploadType,upsert:false
    });
    if(error)throw error;
    state.data[fieldName]=path;
    const oldPreview=localPreviews.get(fieldName);
    if(oldPreview)URL.revokeObjectURL(oldPreview.url);
    localPreviews.set(fieldName,{url:URL.createObjectURL(file),isImage:uploadType!=='application/pdf',size:file.size});
    const saved=await saveDraft(false);
    if(!saved)throw new Error('O arquivo foi enviado, mas não foi possível salvar o vínculo. Tente salvar novamente.');
    setSaveState('saved','Documento anexado');
    if(previousPath && previousPath!==path){
      sb.storage.from('visa-documents').remove([previousPath]).catch(console.error);
    }
    renderStep();
  } catch(error) {
    console.error('Falha no upload do documento:',error);
    setSaveState('','Não foi possível concluir o anexo');
    alert(error.message || 'Não foi possível anexar o documento. Tente novamente.');
  } finally {
    state.uploading=false;
    element.disabled=false;
    nextButton.disabled=false;
  }
}

function renderReview() {
  state.reviewing = true;
  const visible = steps.flatMap(step => step.fields).filter(f => f.name !== 'declaration' && isFieldVisible(f));
  const summary = visible.map(field => {
    const value = state.data[field.name];
    const printable = field.type === 'file'
      ? (value ? 'Documento anexado' : 'Não anexado')
      : value === true ? 'Sim' : value === false ? 'Não' : (value || 'Não informado');
    const viewBtn = field.type === 'file' && value ? `<button type="button" class="file-view" data-view-file="${field.name}">Visualizar</button>` : '';
    return `<div class="review-item"><small>${escapeHtml(field.label)}</small><strong>${field.type === 'file' && value ? '✓ ' : ''}${escapeHtml(printable)}</strong>${viewBtn}</div>`;
  }).join('');
  panelTitle.textContent = 'Revise suas informações';
  panelDescription.textContent = 'Confira as respostas e os documentos antes do envio definitivo.';
  panelDescription.hidden = false;
  fieldsRoot.innerHTML = `<div class="review-grid">${summary}</div>`;
  fieldsRoot.querySelectorAll('[data-view-file]').forEach((button) => {
    button.addEventListener('click', () => viewDocument(button.dataset.viewFile));
  });
  progressRoot.hidden = true;
  prevButton.hidden = false;
  nextButton.textContent = 'Confirmar e enviar';
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

function validationError(field) {
  if (!isFieldVisible(field)) return '';
  const dataField = {...field, required: Boolean(field.required)};
  return window.VisaValidation.validate(dataField,state.data[field.name],state.data);
}

function validateStep(index,showErrors = true) {
  collectVisibleData();
  const fields = steps[index].fields.filter(isFieldVisible);
  for (const field of fields) {
    const message = validationError(field);
    const element = index === state.currentStep
      ? [...fieldsRoot.querySelectorAll('input,select,textarea')].find(input => input.name === field.name)
      : null;
    if (element && element.type !== 'file') element.setCustomValidity(message);
    if (message) {
      if (showErrors && element) {
        element.focus();
        element.reportValidity();
      }
      return {field:field.name,message};
    }
  }
  return null;
}

function validateAllSteps() {
  collectVisibleData();
  for (let index=0; index<steps.length; index++) {
    for (const field of steps[index].fields) {
      const message=validationError(field);
      if (message) return {index,field:field.name,message,label:field.label};
    }
  }
  return null;
}

function reportWholeFormError(problem) {
  state.reviewing=false;
  state.currentStep=problem.index;
  progressRoot.hidden=false;
  renderStep();
  validateStep(problem.index,true);
  window.scrollTo({top:0,behavior:'smooth'});
}

function onFieldInput(element) {
  if (element.type!=='checkbox' && element.tagName==='INPUT' && element.type!=='email') {
    const formatted=window.VisaValidation.format(element.name,element.value);
    if(formatted!==element.value)element.value=formatted;
  }
  element.setCustomValidity('');
  scheduleSave();
}

function onFieldBlur(element) {
  collectVisibleData();
  const field=steps[state.currentStep].fields.find(item=>item.name===element.name);
  if(!field || !isFieldVisible(field))return;
  const message=validationError(field);
  element.setCustomValidity(message);
  element.classList.toggle('field-invalid',Boolean(message));
  const group=element.closest('.field-group');
  if(group){
    let feedback=group.querySelector('.validation-feedback');
    if(!feedback && message){
      feedback=document.createElement('small');
      feedback.className='validation-feedback';
      feedback.setAttribute('role','alert');
      group.appendChild(feedback);
    }
    if(feedback)feedback.textContent=message;
    if(feedback)feedback.hidden=!message;
  }
}

function renderStep() {
  const step = steps[state.currentStep];
  panelTitle.textContent = step.title;
  panelDescription.textContent = step.description;
  panelDescription.hidden = !step.description;
  fieldsRoot.innerHTML = step.fields.filter(isFieldVisible).map(inputFor).join('');
  prevButton.hidden = state.currentStep === 0;
  nextButton.textContent = state.currentStep === steps.length - 1 ? 'Revisar informações →' : 'Próximo Passo →';
  nextButton.disabled = state.uploading;
  stepCounter.textContent = `Passo ${state.currentStep + 1} de ${steps.length}`;
  renderProgress();

  fieldsRoot.querySelectorAll('[data-view-file]').forEach((button) => {
    button.addEventListener('click', () => viewDocument(button.dataset.viewFile));
  });

  fieldsRoot.querySelectorAll('input,select,textarea').forEach((element) => {
    if (element.type === 'file') {
      element.addEventListener('change', uploadDocument);
    } else {
      element.addEventListener('input', () => onFieldInput(element));
      element.addEventListener('change', () => {
        onFieldInput(element);
        onFieldBlur(element);
        refreshConditionalFields();
      });
      element.addEventListener('blur', () => onFieldBlur(element));
    }
  });
}

function collectVisibleData() {
  fieldsRoot.querySelectorAll('input,select,textarea').forEach((element) => {
    if (element.type !== 'file') state.data[element.name] = element.type === 'checkbox' ? element.checked : element.value;
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

// Remove respostas de campos que ficaram ocultos (ex.: curso, depois de responder "Não")
function pruneHiddenFields() {
  for (let pass = 0; pass < 3; pass++) {
    steps.forEach((step) => step.fields.forEach((field) => {
      if (field.showIf && !isFieldVisible(field) && field.type !== 'file' && state.data[field.name] !== undefined && state.data[field.name] !== '' && state.data[field.name] !== false) {
        delete state.data[field.name];
      }
    }));
  }
}

async function saveDraft(showState = true) {
  if (!state.application) return false;
  if (state.saving) {
    await new Promise(resolve => setTimeout(resolve, 120));
    return saveDraft(showState);
  }
  collectVisibleData();
  pruneHiddenFields();
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
    return false;
  }
  setSaveState('saved', 'Progresso salvo');
  return true;
}

const SHARED_FAMILY_FIELDS = [
  'nationality','address','city','state','country','mailing_same',
  'travel_purpose','travel_purpose_other','specific_travel_plans','arrival_date','stay_duration',
  'us_stay_address','us_stay_location','trip_payer','payer_phone','payer_email','payer_relation','payer_same_address',
  'us_contact_name','us_contact_org','us_contact_relation','us_contact_address','us_contact_details',
];

async function ensureApplication() {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('application');
  const createNew = params.get('new') === '1';

  if (requestedId) {
    const {data, error} = await sb.from('visa_applications').select('*')
      .eq('id',requestedId).eq('user_id',state.user.id).eq('country','US').maybeSingle();
    if(error)throw error;
    if(!data)throw Object.assign(new Error('Aplicação não encontrada nesta conta.'),{userFacing:true});
    if(data.status!=='draft')throw Object.assign(new Error('Esta aplicação já foi enviada. Acompanhe na área do cliente.'),{userFacing:true});
    return data;
  }

  if (!createNew) {
    const {data, error} = await sb.from('visa_applications').select('*')
      .eq('user_id',state.user.id).eq('country','US').eq('status','draft')
      .order('updated_at',{ascending:false}).limit(1);
    if(error)throw error;
    if(data?.length)return data[0];
  }

  const permittedRelations = new Set(['Titular','Cônjuge','Filho(a)','Pai','Mãe','Irmão(ã)','Avô/Avó','Neto(a)','Outro familiar']);
  const relationship = params.get('relationship') || 'Titular';
  if(!permittedRelations.has(relationship))throw Object.assign(new Error('Selecione um grau de parentesco válido.'),{userFacing:true});
  const name=(params.get('applicant_name') || '').trim().slice(0,160);
  if(relationship!=='Titular' && !name)throw Object.assign(new Error('Informe o nome completo do familiar.'),{userFacing:true});
  const formData = {applicant_relationship:relationship};
  if(createNew) {
    // Reaproveita dados comuns da família (endereço, viagem, pagador, contato nos EUA) para não recomeçar do zero
    const {data:previous} = await sb.from('visa_applications').select('form_data')
      .eq('user_id',state.user.id).eq('country','US').order('updated_at',{ascending:false}).limit(1);
    const source = previous?.[0]?.form_data || {};
    SHARED_FAMILY_FIELDS.forEach((field) => {
      if(source[field] !== undefined && source[field] !== '') formData[field] = source[field];
    });
  }
  if(name) {
    formData.applicant_name=name;
    formData.full_name=name;
  }
  const {data:created,error} = await sb.from('visa_applications').insert({
    user_id:state.user.id,country:'US',status:'draft',form_data:formData,current_step:0
  }).select('*').single();
  if(error) {
    if(error.code==='23505')throw Object.assign(new Error('Você já tem um questionário em andamento. Continue e envie esse questionário na área do cliente antes de iniciar outro.'),{userFacing:true});
    throw error;
  }
  window.history.replaceState(null,'','/vistos/estados-unidos?application='+encodeURIComponent(created.id));
  return created;
}

async function submitApplication() {
  collectVisibleData();
  pruneHiddenFields();
  if (state.data.declaration !== true) {
    await window.PastorLoader?.hide?.(200);
    alert('Você precisa aceitar a declaração antes de enviar.');
    return;
  }

  nextButton.disabled = true;
  nextButton.textContent = 'Enviando...';

  if (!state.data.passport_file || (state.data.had_us_visa === 'sim' && !state.data.previous_visa_file)) {
    await window.PastorLoader?.hide?.(0);
    alert('Anexe a foto do passaporte e, se tiver visto anterior, a foto dele.');
    nextButton.disabled = false;
    return;
  }
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
    await window.PastorLoader?.hide?.(550);
    alert((error.message ? error.message + '\n\n' : '') + 'Seu progresso continua salvo. Corrija o ponto indicado e tente novamente.');
    nextButton.disabled = false;
    nextButton.textContent = 'Confirmar e enviar';
    return;
  }

  await window.PastorLoader?.hide?.(650);
  state.reviewing = false;
  document.querySelector('#form-panel').hidden = true;
  progressRoot.hidden = true;
  document.querySelector('.application-status-row').hidden = true;
  successPanel.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if(state.submitting || state.uploading)return;
  if(!form.reportValidity())return;
  if(!state.reviewing){
    const issue=validateStep(state.currentStep,true);
    if(issue)return;
  }
  state.submitting=true;
  window.PastorLoader?.show();
  try {
    collectVisibleData();
    const saved=await saveDraft(false);
    if(!saved)throw new Error('Não foi possível salvar o seu progresso. Verifique a conexão e tente novamente.');

    if(state.currentStep<steps.length-1){
      const previousStep=state.currentStep;
      state.currentStep+=1;
      const nextSaved=await saveDraft(false);
      if(!nextSaved){
        state.currentStep=previousStep;
        renderStep();
        throw new Error('Não foi possível salvar a próxima etapa. Tente novamente.');
      }
      renderStep();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }

    const problem=validateAllSteps();
    if(problem){
      reportWholeFormError(problem);
      throw new Error('Verifique o campo "'+problem.label+'" antes de continuar.');
    }
    if(!state.reviewing){
      renderReview();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    await submitApplication();
  } catch(error) {
    console.error(error);
    alert(error.message || 'Não foi possível continuar. Tente novamente.');
  } finally {
    state.submitting=false;
    await window.PastorLoader?.hide?.(450);
  }
});

prevButton.addEventListener('click', async () => {
  if (state.reviewing) {
    state.reviewing = false;
    progressRoot.hidden = false;
    renderStep();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  collectVisibleData();
  await saveDraft(false);
  state.currentStep = Math.max(0, state.currentStep - 1);
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Salva o rascunho antes de a sessão expirar
window.__beforeSessionExpire = async () => { collectVisibleData(); await saveDraft(false); };

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
    const applicationName = state.data.full_name || state.data.applicant_name || 'Titular';
    const applicantRelation = state.data.applicant_relationship || 'Titular';
    const applicationSubtitle = document.querySelector('.application-title small');
    if(applicationSubtitle)applicationSubtitle.textContent = applicationName + ' · ' + applicantRelation;
    if (!state.data.email && session.user.email) state.data.email = session.user.email;
    state.currentStep = Math.max(0, Math.min(Number(state.application.current_step || 0), steps.length - 1));
    loading.hidden = true;
    app.hidden = false;
    renderStep();
    setSaveState('saved', 'Progresso salvo');
    await window.PastorLoader?.hide?.(550);
  } catch (error) {
    console.error(error);
    await window.PastorLoader?.hide?.(350);
    loading.textContent = error?.userFacing && error.message
      ? error.message
      : 'Não foi possível carregar seu formulário. Atualize a página ou tente novamente mais tarde.';
  }
})();
