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

function renderApplications(applications) {
  applicationList.replaceChildren();
  if (!applications.length) {
    const empty = document.createElement('div');
    empty.className = 'portal-empty';
    empty.textContent = 'Você ainda não iniciou uma aplicação. Escolha “Nova aplicação” ou “Adicionar familiar” para começar.';
    applicationList.appendChild(empty);
    return;
  }
  const drafts = applications.filter(a => a.status === 'draft');
  const previous = [];
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
    const {data, error} = await portalSb.from('visa_applications')
      .select('id,country,status,current_step,form_data,created_at,updated_at')
      .eq('user_id',session.user.id)
      .eq('country','US')
      .eq('status','draft')
      .order('updated_at',{ascending:false})
      .limit(100);
    if(error)throw error;
    const applications=data||[];
    renderApplications(applications);
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