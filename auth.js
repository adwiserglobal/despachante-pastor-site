const supabaseClient = window.despachanteSupabase;

const tabs = document.querySelectorAll('.auth-tab');
const form = document.querySelector('#auth-form');
const nameGroup = document.querySelector('#name-group');
const fullNameInput = document.querySelector('#full-name');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const submitButton = document.querySelector('#auth-submit');
const messageBox = document.querySelector('#auth-message');
const authTitle = document.querySelector('#auth-title');
const authSubtitle = document.querySelector('#auth-subtitle');

let mode = 'login';

function safeNext() {
  const value = new URLSearchParams(window.location.search).get('next') || 'visa-eua.html';
  if (/^(?:https?:)?\/\//i.test(value) || value.includes('..')) return 'visa-eua.html';
  return value.replace(/^\/+/, '') || 'visa-eua.html';
}

function goNext() {
  window.location.href = `./${safeNext()}`;
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
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  const signup = mode === 'signup';
  nameGroup.hidden = !signup;
  fullNameInput.required = signup;
  authTitle.textContent = signup ? 'Crie sua conta' : 'Entre na sua conta';
  authSubtitle.textContent = signup
    ? 'Crie seu acesso para continuar com o formulário do visto americano.'
    : 'Entre para continuar exatamente de onde você parou.';
  submitButton.textContent = signup ? 'Criar conta e continuar' : 'Entrar e continuar';
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();
  submitButton.disabled = true;
  submitButton.textContent = mode === 'signup' ? 'Criando conta...' : 'Entrando...';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    if (mode === 'signup') {
      const fullName = fullNameInput.value.trim();
      if (!fullName) throw new Error('Informe seu nome completo.');
      if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/${safeNext()}`,
        },
      });
      if (error) throw error;

      if (data.session) {
        goNext();
        return;
      }

      showMessage('Conta criada. Confira seu e-mail para confirmar o cadastro. Depois da confirmação, você seguirá para o formulário.', 'success');
      submitButton.disabled = false;
      submitButton.textContent = 'Criar conta e continuar';
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    goNext();
  } catch (error) {
    let message = error?.message || 'Não foi possível concluir a autenticação.';
    if (message.toLowerCase().includes('invalid login credentials')) message = 'E-mail ou senha incorretos.';
    if (message.toLowerCase().includes('already registered')) message = 'Este e-mail já possui uma conta. Tente entrar.';
    showMessage(message);
    submitButton.disabled = false;
    submitButton.textContent = mode === 'signup' ? 'Criar conta e continuar' : 'Entrar e continuar';
  }
});

(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) goNext();
})();
