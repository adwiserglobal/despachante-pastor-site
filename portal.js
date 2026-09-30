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

logoutButton.addEventListener('click', async () => {
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
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    console.error(error);
    loading.className = 'portal-error';
    loading.textContent = 'Não foi possível carregar suas solicitações agora. Atualize a página e tente novamente.';
  }
})();
