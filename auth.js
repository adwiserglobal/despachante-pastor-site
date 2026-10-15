const supabaseClient = window.despachanteSupabase;

const tabs = document.querySelectorAll('.auth-tab');
const form = document.querySelector('#auth-form');
const passwordGroup = document.querySelector('#password-group');
const forgotRow = document.querySelector('#forgot-row');
const forgotLink = document.querySelector('#forgot-link');
const tabsBar = document.querySelector('.auth-tabs');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const submitButton = document.querySelector('#auth-submit');
const messageBox = document.querySelector('#auth-message');
const authTitle = document.querySelector('#auth-title');
const authSubtitle = document.querySelector('#auth-subtitle');

let mode = 'login';

function goPortal() {
  window.PastorLoader?.show();
  window.location.href = './portal.html';
}

function showMessage(text, type = 'error') {
  messageBox.textContent = text;
  messageBox.className = `auth-message show ${type}`;
}

function clearMessage() {
  messageBox.textContent = '';
  messageBox.className = 'auth-message';
}

function setMode(nextMode) {
  mode = nextMode;
  clearMessage();
  const signup = mode === 'signup';
  const forgot = mode === 'forgot';
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  tabsBar.hidden = forgot;
  passwordGroup.hidden = forgot;
  passwordInput.required = !forgot;
  forgotRow.hidden = mode !== 'login';
  backRow.hidden = !forgot;
  passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  authTitle.textContent = forgot ? 'Recupere sua senha' : signup ? 'Crie sua conta' : 'Entre na sua conta';
  authSubtitle.textContent = forgot
    ? 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.'
    : signup
      ? 'Crie seu acesso para acompanhar e continuar suas solicitações.'
      : 'Entre para acessar suas solicitações e continuar de onde parou.';
  submitButton.textContent = forgot ? 'Enviar link de recuperação' : signup ? 'Criar conta' : 'Entrar';
}

forgotLink.addEventListener('click', () => setMode('forgot'));
const backRow = document.querySelector('#back-login-row');
document.querySelector('#back-login').addEventListener('click', () => setMode('login'));

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();
  submitButton.disabled = true;
  submitButton.textContent = mode === 'signup' ? 'Criando conta...' : mode === 'forgot' ? 'Enviando...' : 'Entrando...';
  window.PastorLoader?.show();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (mode === 'forgot') {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error && error.status !== 400 && error.status !== 404) throw error;
      await window.PastorLoader?.hide?.(450);
      showMessage('Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.', 'success');
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar link de recuperação';
      return;
    }
    if (mode === 'signup') {
      if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal.html`,
        },
      });
      if (error) throw error;

      if (data.session) {
        goPortal();
        return;
      }

      await window.PastorLoader?.hide?.(550);
      showMessage('Conta criada. Confira seu e-mail para confirmar o cadastro. Depois da confirmação, você poderá acessar suas solicitações.', 'success');
      submitButton.disabled = false;
      submitButton.textContent = 'Criar conta';
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    goPortal();
  } catch (error) {
    let message = error?.message || 'Não foi possível concluir a autenticação.';
    if (message.toLowerCase().includes('invalid login credentials')) message = 'E-mail ou senha incorretos.';
    if (message.toLowerCase().includes('already registered')) message = 'Este e-mail já possui uma conta. Tente entrar.';
    await window.PastorLoader?.hide?.(450);
    showMessage(message);
    submitButton.disabled = false;
    submitButton.textContent = mode === 'signup' ? 'Criar conta' : mode === 'forgot' ? 'Enviar link de recuperação' : 'Entrar';
  }
});

(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session && window.PastorSession?.isExpired(data.session)) {
    await supabaseClient.auth.signOut();
    showMessage('Sua sessão expirou. Entre novamente para continuar.', 'error');
  } else if (data.session) {
    window.PastorLoader?.show();
    goPortal();
  } else if (new URLSearchParams(window.location.search).get('expired') === '1') {
    showMessage('Sua sessão expirou após 40 minutos. Entre novamente para continuar.', 'error');
  }
})();
