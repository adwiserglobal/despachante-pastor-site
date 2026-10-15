const portalSb = window.despachanteSupabase;
const loading = document.querySelector('#portal-loading');
const content = document.querySelector('#portal-content');
const userEmail = document.querySelector('#portal-user-email');
const applicationList = document.querySelector('#portal-applications');
const documentsList = document.querySelector('#portal-document-list');
const familyDialog = document.querySelector('#family-application-dialog');
const familyForm = document.querySelector('#family-application-form');
const logoutButton = document.querySelector('#portal-logout');

window.PastorLoader?.show();

function applicationLink(id) {
  return '/vistos/estados-unidos?application=' + encodeURIComponent(id);
}

function createApplicationCard(application) {
  const data = application.form_data || {};
  const relationship = data.applicant_relationship || 'Titular';
  const applicant = data.full_name || data.applicant_name || (relationship === 'Titular' ? 'Minha aplicação' : 'Familiar');
  const draft = application.status === 'draft';
  const step = Math.max(0, Math.min(Number(application.current_step || 0), 4));
  const percent = draft ? Math.round((step + 1) / 5 * 100) : 100;
  const card = document.createElement('article');
  card.className = 'request-card';

  const flag = document.createElement('div');
  flag.className = 'request-country';
  flag.setAttribute('role', 'img');
  flag.setAttribute('aria-label', 'Bandeira dos Estados Unidos');
  flag.textContent = '🇺🇸';

  const details = document.createElement('div');
  details.className = 'request-copy';
  const top = document.createElement('div');
  top.className = 'request-meta';
  const title = document.createElement('h2');
  title.textContent = 'Visto Americano';
  const status = document.createElement('span');
  status.className = 'request-status';
  const statusNames = {draft:'Em andamento',submitted:'Enviado',in_review:'Em análise',needs_information:'Informações solicitadas',completed:'Concluído',archived:'Arquivado'};
  status.textContent = statusNames[application.status] || 'Em acompanhamento';
  top.append(title,status);
  const person = document.createElement('p');
  person.className = 'applicant-label';
  person.textContent = applicant + ' · ' + relationship;
  const description = document.createElement('p');
  description.textContent = draft
    ? 'Aplicação salva. Continue exatamente do ponto em que parou.'
    : 'Aplicação enviada. O acompanhamento será realizado pelo WhatsApp.';
  details.append(top,person,description);

  if (draft) {
    const progress = document.createElement('div');
    progress.className = 'request-progress';
    const label = document.createElement('div');
    label.className = 'request-progress-label';
    const stage = document.createElement('span');
    stage.textContent = 'Etapa ' + (step + 1) + ' de 5';
    const value = document.createElement('span');
    value.textContent = percent + '%';
    label.append(stage,value);
    const track = document.createElement('div');
    track.className = 'request-progress-track';
    const fill = document.createElement('div');
    fill.className = 'request-progress-fill';
    fill.style.width = percent + '%';
    track.appendChild(fill);
    progress.append(label,track);
    details.appendChild(progress);
  }

  card.append(flag,details);
  if (draft) {
    const action = document.createElement('a');
    action.className = 'request-continue';
    action.href = applicationLink(application.id);
    action.textContent = 'Continuar aplicação →';
    action.addEventListener('click', async (event) => {
      event.preventDefault();
      window.PastorLoader?.show();
      await new Promise(resolve => setTimeout(resolve, 400));
      window.location.assign(action.href);
    });
    card.appendChild(action);
  }
  return card;
}

let currentUserId = null;
let infoByApp = {};

// --- Anexos das respostas ao pedido de informações ---
async function detectFileKind(file) {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const ascii = String.fromCharCode(...head);
  if (ascii.includes('%PDF')) return 'application/pdf';
  if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'image/png';
  if (head[0] === 0xFF && head[1] === 0xD8) return 'image/jpeg';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  if (ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|mif1|heif/.test(ascii.slice(8, 16))) return 'heic';
  return null;
}

async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('compress')), 'image/jpeg', 0.85));
}

async function prepareReplyFile(file) {
  if (file.size === 0) throw new Error(file.name + ': o arquivo está vazio.');
  const kind = await detectFileKind(file);
  if (kind === 'heic') throw new Error(file.name + ': fotos HEIC do iPhone não são aceitas. Envie em JPG, PNG ou PDF.');
  if (!kind) throw new Error(file.name + ': envie uma imagem (JPG, PNG, WebP) ou PDF.');
  let blob = file;
  let type = kind;
  if (kind !== 'application/pdf' && file.size > 2 * 1024 * 1024) {
    try { blob = await shrinkImage(file); type = 'image/jpeg'; } catch (error) { console.error(error); }
  }
  if (blob.size > 10485760) throw new Error(file.name + ': o arquivo é maior que 10 MB.');
  return { blob, type, name: file.name };
}

function createInfoRequestBox(request, application) {
  const box = document.createElement('div');
  box.className = 'info-box' + (request.status === 'open' ? ' is-open' : ' is-answered');

  const ask = document.createElement('div');
  ask.className = 'info-ask';
  const label = document.createElement('small');
  label.textContent = 'Mensagem da equipe · ' + new Date(request.created_at).toLocaleDateString('pt-BR');
  const text = document.createElement('p');
  text.textContent = request.message;
  ask.append(label, text);
  box.appendChild(ask);

  if (request.status === 'answered') {
    const done = document.createElement('div');
    done.className = 'info-done';
    const files = Array.isArray(request.reply_files) ? request.reply_files.length : 0;
    done.textContent = '✓ Você respondeu em ' + new Date(request.replied_at).toLocaleDateString('pt-BR')
      + (request.reply_text ? ': “' + request.reply_text.slice(0, 200) + (request.reply_text.length > 200 ? '…' : '') + '”' : '')
      + (files ? ' · ' + files + ' anexo' + (files > 1 ? 's' : '') : '');
    box.appendChild(done);
    return box;
  }

  const form = document.createElement('form');
  form.className = 'info-form';
  const area = document.createElement('textarea');
  area.rows = 3;
  area.maxLength = 4000;
  area.placeholder = 'Escreva sua resposta…';
  const fileList = document.createElement('div');
  fileList.className = 'info-files';
  const bar = document.createElement('div');
  bar.className = 'info-bar';
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'info-plus';
  plus.title = 'Adicionar arquivo';
  plus.setAttribute('aria-label', 'Adicionar arquivo');
  plus.textContent = '+';
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/jpeg,image/png,image/webp,application/pdf';
  input.hidden = true;
  const send = document.createElement('button');
  send.type = 'submit';
  send.className = 'info-send';
  send.textContent = 'Enviar resposta';
  const status = document.createElement('span');
  status.className = 'info-status';
  bar.append(plus, status, send);
  form.append(area, fileList, bar, input);

  let selected = [];
  function renderFiles() {
    fileList.replaceChildren();
    selected.forEach((file, index) => {
      const chip = document.createElement('span');
      chip.className = 'info-chip';
      chip.textContent = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remover ' + file.name);
      remove.textContent = '×';
      remove.addEventListener('click', () => { selected.splice(index, 1); renderFiles(); });
      chip.appendChild(remove);
      fileList.appendChild(chip);
    });
  }
  plus.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    selected = selected.concat([...input.files]).slice(0, 10);
    input.value = '';
    renderFiles();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const reply = area.value.trim();
    if (!reply && !selected.length) { status.textContent = 'Escreva uma resposta ou adicione um arquivo.'; return; }
    send.disabled = plus.disabled = true;
    status.textContent = 'Enviando…';
    const uploaded = [];
    try {
      for (const original of selected) {
        const prepared = await prepareReplyFile(original);
        const extension = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[prepared.type];
        const path = currentUserId + '/' + application.id + '/info_reply/' + Date.now() + '_' + crypto.randomUUID() + '.' + extension;
        const { error } = await portalSb.storage.from('visa-documents').upload(path, prepared.blob, { contentType: prepared.type, upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }
      const { error } = await portalSb.from('visa_info_requests')
        .update({ status: 'answered', reply_text: reply || null, reply_files: uploaded })
        .eq('id', request.id);
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error(error);
      status.textContent = error.message || 'Não foi possível enviar. Tente novamente.';
      send.disabled = plus.disabled = false;
    }
  });
  box.appendChild(form);
  return box;
}

const TRACK_STEPS = ['Enviado', 'Em análise', 'Concluído'];

function trackIndex(status) {
  return ({submitted:0,in_review:1,needs_information:1,completed:2})[status] ?? 0;
}

function createTrackingCard(application) {
  const data = application.form_data || {};
  const applicant = data.full_name || data.applicant_name || 'Minha aplicação';
  const relationship = data.applicant_relationship || 'Titular';
  const index = trackIndex(application.status);
  const needsInfo = application.status === 'needs_information';
  const completed = application.status === 'completed';
  const card = document.createElement('article');
  card.className = 'track-card' + (needsInfo ? ' needs-info' : '') + (completed ? ' is-complete' : '');

  const head = document.createElement('div');
  head.className = 'track-head';
  const title = document.createElement('h2');
  title.textContent = 'Visto Americano';
  const badge = document.createElement('span');
  badge.className = 'request-status';
  const names = {submitted:'Enviado',in_review:'Em análise',needs_information:'Informações solicitadas',completed:'Concluído'};
  badge.textContent = names[application.status] || 'Em acompanhamento';
  head.append(title, badge);

  const person = document.createElement('p');
  person.className = 'applicant-label';
  person.textContent = applicant + ' · ' + relationship;

  const steps = document.createElement('ol');
  steps.className = 'track-steps';
  TRACK_STEPS.forEach((label, i) => {
    const li = document.createElement('li');
    const state = i < index || (completed && i === index) ? 'done' : i === index ? 'current' : 'next';
    li.className = 'track-step is-' + state + (state === 'current' && needsInfo ? ' is-alert' : '');
    const dot = document.createElement('span');
    dot.className = 'track-dot';
    dot.textContent = state === 'done' ? '✓' : String(i + 1);
    const text = document.createElement('span');
    text.className = 'track-label';
    text.textContent = (i === 1 && needsInfo) ? 'Informações solicitadas' : label;
    li.append(dot, text);
    steps.appendChild(li);
  });

  const note = document.createElement('p');
  note.className = 'track-note';
  const when = application.updated_at ? new Date(application.updated_at).toLocaleDateString('pt-BR') : '';
  note.textContent = needsInfo
    ? 'Nossa equipe precisa de informações adicionais. Responda abaixo.'
    : application.status === 'submitted'
      ? 'Questionário recebido. Nossa equipe vai iniciar a análise em breve.'
    : completed
      ? 'Atendimento concluído.' + (when ? ' Atualizado em ' + when + '.' : '')
      : 'Acompanhamento pelo WhatsApp.' + (when ? ' Última atualização em ' + when + '.' : '');

  card.append(head, person, steps, note);
  (infoByApp[application.id] || []).slice(0, 3).forEach((request) => card.appendChild(createInfoRequestBox(request, application)));
  return card;
}

function renderApplications(applications) {
  applicationList.replaceChildren();
  const drafts = applications.filter(a => a.status === 'draft');
  // Só aparece depois que o cliente enviou o questionário (submitted_at); rascunhos nunca entram aqui
  const tracked = applications.filter(a => a.submitted_at && ['submitted','in_review','needs_information','completed'].includes(a.status));
  const trackingRoot = document.querySelector('#portal-tracking');
  const trackingSection = document.querySelector('#portal-tracking-section');
  if (trackingRoot) {
    trackingRoot.replaceChildren(...tracked.map(createTrackingCard));
    trackingSection.hidden = tracked.length === 0;
  }
  if (!drafts.length) {
    const empty = document.createElement('div');
    empty.className = 'portal-empty';
    empty.textContent = tracked.length
      ? 'Nenhum questionário em andamento. Use “Nova aplicação” ou “Adicionar familiar” para iniciar outro.'
      : 'Você ainda não iniciou uma aplicação. Escolha “Nova aplicação” ou “Adicionar familiar” para começar.';
    applicationList.appendChild(empty);
    return;
  }
  drafts.forEach(a => applicationList.appendChild(createApplicationCard(a)));
}

function renderDocuments(applications) {
  documentsList.replaceChildren();
  const documents = applications.flatMap(application =>
    ['passport_file','previous_visa_file'].map(field => ({application,field,path:application.form_data?.[field]}))
  ).filter(document => document.path);
  if (!documents.length) {
    documentsList.textContent = 'Nenhum documento anexado ainda.';
    return;
  }
  documents.forEach(({application,field,path}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'portal-document-button';
    const label = field === 'passport_file' ? 'Passaporte' : 'Visto anterior';
    const applicant = application.form_data?.full_name || application.form_data?.applicant_name || 'Titular';
    button.textContent = label + ' · ' + applicant + ' ↗';
    button.addEventListener('click', async () => {
      const {data,error} = await portalSb.storage.from('visa-documents').createSignedUrl(path,60);
      if (error || !data?.signedUrl) {
        alert('Não foi possível abrir este documento.');
        return;
      }
      window.open(data.signedUrl,'_blank','noopener,noreferrer');
    });
    documentsList.appendChild(button);
  });
}

document.querySelector('#new-self-application').addEventListener('click', () => {
  window.PastorLoader?.show();
  window.location.assign('/vistos/estados-unidos?new=1&relationship=Titular');
});
document.querySelector('#new-family-application').addEventListener('click', () => familyDialog.showModal());
document.querySelector('#family-modal-close').addEventListener('click', () => familyDialog.close());
familyDialog.addEventListener('click',event => {if(event.target===familyDialog)familyDialog.close();});
familyForm.addEventListener('submit',event => {
  event.preventDefault();
  if (!familyForm.reportValidity())return;
  const params = new URLSearchParams({
    new:'1',
    relationship:familyForm.elements.relationship.value,
    applicant_name:familyForm.elements.applicant_name.value.trim()
  });
  familyDialog.close();
  window.PastorLoader?.show();
  window.location.assign('/vistos/estados-unidos?' + params.toString());
});
logoutButton.addEventListener('click', async () => {
  window.PastorLoader?.show();
  await portalSb.auth.signOut();
  window.location.replace('./login.html');
});

(async function initPortal() {
  try {
    const {data:{session}} = await portalSb.auth.getSession();
    if (!session) {
      window.location.replace('./login.html');
      return;
    }
    userEmail.textContent = session.user.email || '';
    currentUserId = session.user.id;
    const {data, error} = await portalSb.from('visa_applications')
      .select('id,country,status,current_step,form_data,created_at,updated_at,submitted_at')
      .eq('user_id',session.user.id)
      .eq('country','US')
      .order('updated_at',{ascending:false})
      .limit(100);
    if(error)throw error;
    const applications=data||[];
    const {data:infoRows}=await portalSb.from('visa_info_requests')
      .select('id,application_id,message,created_at,status,reply_text,reply_files,replied_at')
      .order('created_at',{ascending:false});
    infoByApp={};
    (infoRows||[]).forEach(r=>{(infoByApp[r.application_id]=infoByApp[r.application_id]||[]).push(r);});
    renderApplications(applications);
    window.__portalApplications=applications.filter(a=>a.status==='draft');
    document.dispatchEvent(new CustomEvent('portal:applications',{detail:applications.filter(a=>a.status==='draft')}));
    if (new URLSearchParams(location.search).get('add_family') === '1') {
      familyDialog.showModal();
      history.replaceState(null,'','/portal.html');
    }
    // Os anexos de questionários enviados não ficam acessíveis ao cliente.
    loading.hidden=true;
    content.hidden=false;
    await window.PastorLoader?.hide?.(550);
  } catch(error) {
    console.error(error);
    await window.PastorLoader?.hide?.(350);
    loading.className='portal-error';
    loading.textContent='Não foi possível carregar suas solicitações agora. Atualize a página e tente novamente.';
  }
})();