const portalSb = window.despachanteSupabase;

const loading = document.querySelector('#portal-loading');
const content = document.querySelector('#portal-content');
const userEmail = document.querySelector('#portal-user-email');
const statusEl = document.querySelector('#us-visa-status');
const descriptionEl = document.querySelector('#us-visa-description');
const stepLabelEl = document.querySelector('#us-visa-step-label');
const percentEl = document.querySelector('#us-visa-percent');
const progressFillEl = document.querySelector('#us-visa-progress-fill');
const logoutButton = document.querySelector('#portal-logout');
const continueApplicationLink = document.querySelector('.request-continue');

window.PastorLoader?.show();

function showApplicationState(application) {
  const totalSteps = 5;
  const currentStep = Math.max(0, Math.min(Number(application?.current_step || 0), totalSteps - 1));
  const displayStep = currentStep + 1;
  const percent = Math.round((displayStep / totalSteps) * 100);

  stepLabelEl.textContent = `Etapa ${displayStep} de ${totalSteps}`;
  percentEl.textContent = `${percent}%`;
  progressFillEl.style.width = `${percent}%`;

  if (!application) {
    statusEl.textContent = 'Pronto para continuar';
    descriptionEl.textContent = 'Continue sua aplicação de visto americano. Seu progresso será salvo automaticamente.';
    return;
  }

  statusEl.textContent = 'Em andamento';
  descriptionEl.textContent = 'Sua aplicação está salva e pode ser retomada exatamente de onde você parou.';
}

continueApplicationLink?.addEventListener('click', async (event) => {
  event.preventDefault();
  const href = continueApplicationLink.getAttribute('href');
  window.PastorLoader?.show();
  await new Promise((resolve) => setTimeout(resolve, 520));
  window.location.href = href || '/vistos/estados-unidos';
});

logoutButton.addEventListener('click', async () => {
  window.PastorLoader?.show();
  await portalSb.auth.signOut();
  window.location.replace('./login.html');
});

(async function initPortal() {
  try {
    const { data: { session } } = await portalSb.auth.getSession();
    if (!session) {
      window.location.replace('./login.html');
      return;
    }

    userEmail.textContent = session.user.email || '';

    const { data: application, error } = await portalSb
      .from('visa_applications')
      .select('id,status,current_step')
      .eq('user_id', session.user.id)
      .eq('country', 'US')
      .eq('status', 'draft')
      .maybeSingle();

    if (error) throw error;

    showApplicationState(application || null);
    const {data: history, error: historyError} = await portalSb.from('visa_applications')
      .select('id,country,status,current_step,form_data,created_at')
      .eq('user_id', session.user.id).order('created_at',{ascending:false}).limit(50);
    if(historyError) throw historyError;
    const records=history||[];
    const historical=document.querySelector('#other-requests');
    const documents=document.querySelector('#portal-document-list');
    historical.replaceChildren();
    const completed=records.filter(item=>item.status!=='draft');
    if(completed.length){
      const title=document.createElement('h2');title.textContent='Solicitações anteriores';historical.appendChild(title);
      completed.forEach(item=>{
        const el=document.createElement('article');el.className='previous-request-card';
        const name=document.createElement('strong');name.textContent=item.country==='US'?'Visto Americano':item.country;
        const status=document.createElement('span');status.textContent=item.status==='submitted'?'Enviado':item.status;
        el.append(name,status);historical.appendChild(el);
      });
    }
    documents.replaceChildren();
    const docs=records.flatMap(item=>['passport_file','previous_visa_file']
      .map(key=>({key,path:item.form_data?.[key]}))).filter(item=>item.path);
    if(!docs.length)documents.textContent='Nenhum documento anexado ainda.';
    docs.forEach(doc=>{
      const button=document.createElement('button');
      button.className='portal-document-button';
      button.textContent=doc.key==='passport_file'?'Passaporte ↗':'Visto anterior ↗';
      button.addEventListener('click',async()=>{
        const {data,error}=await portalSb.storage.from('visa-documents').createSignedUrl(doc.path,60);
        if(error){alert('Não foi possível abrir este anexo.');return;}
        window.open(data.signedUrl,'_blank','noopener,noreferrer');
      });
      documents.appendChild(button);
    });
    if(!application&&completed.length){
      statusEl.textContent='Enviado';
      descriptionEl.textContent='Seu questionário foi enviado. O acompanhamento será realizado pelo WhatsApp.';
      continueApplicationLink.innerHTML='Iniciar nova aplicação <span aria-hidden="true">→</span>';
    }
    loading.hidden = true;
    content.hidden = false;
    await window.PastorLoader?.hide?.(550);
  } catch (error) {
    console.error(error);
    await window.PastorLoader?.hide?.(350);
    loading.className = 'portal-error';
    loading.textContent = 'Não foi possível carregar suas solicitações agora. Atualize a página e tente novamente.';
  }
})();
