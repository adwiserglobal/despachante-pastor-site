const sb = window.despachanteSupabase;
const form = document.querySelector('#reset-form');
const subtitle = document.querySelector('#reset-subtitle');
const invalid = document.querySelector('#reset-invalid');
const message = document.querySelector('#auth-message');
const submit = document.querySelector('#reset-submit');

let ready = false;
function showReady() {
  if (ready) return;
  ready = true;
  subtitle.textContent = 'Escolha uma nova senha para a sua conta.';
  form.hidden = false;
  invalid.hidden = true;
}
function show(text, type) {
  message.textContent = text;
  message.className = 'auth-message show ' + type;
}

// O link do e-mail cria uma sessão temporária de recuperação (evento PASSWORD_RECOVERY)
sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') showReady(); });
setTimeout(async () => {
  if (ready) return;
  const { data } = await sb.auth.getSession();
  if (data.session && /type=recovery|access_token|code=/.test(location.href + location.hash)) showReady();
  else { subtitle.textContent = ''; invalid.hidden = false; }
}, 1800);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#new-password').value;
  const confirm = document.querySelector('#confirm-password').value;
  if (password.length < 6) return show('A senha precisa ter pelo menos 6 caracteres.', 'error');
  if (password !== confirm) return show('As senhas não conferem.', 'error');
  submit.disabled = true;
  submit.textContent = 'Salvando…';
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    submit.disabled = false;
    submit.textContent = 'Salvar nova senha';
    return show(error.message && error.message.includes('different') ? 'Escolha uma senha diferente da anterior.' : (error.message || 'Não foi possível salvar a senha.'), 'error');
  }
  show('Senha alterada com sucesso! Redirecionando para o login…', 'success');
  await sb.auth.signOut();
  setTimeout(() => window.location.replace('/login.html'), 1800);
});
