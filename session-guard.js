/* Sessão do portal: expira 40 minutos após o login; depois disso é preciso entrar de novo. */
(function () {
  var MAX = 40 * 60 * 1000;
  var WARN = 5 * 60 * 1000;
  var sb = window.despachanteSupabase;
  if (!sb) return;

  function loginTime(session) {
    var t = session && session.user && session.user.last_sign_in_at ? Date.parse(session.user.last_sign_in_at) : NaN;
    return isNaN(t) ? null : t;
  }
  function remaining(session) {
    var t = loginTime(session);
    return t === null ? MAX : MAX - (Date.now() - t);
  }
  function isExpired(session) { return remaining(session) <= 0; }
  window.PastorSession = { MAX: MAX, remaining: remaining, isExpired: isExpired };

  var cls = document.body && document.body.className || '';
  if (cls.indexOf('client-portal-page') === -1 && cls.indexOf('application-page') === -1) return;

  var expiring = false;
  var toast = null;

  function showToast(text) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'session-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
  }

  async function expire() {
    if (expiring) return;
    expiring = true;
    try { if (typeof window.__beforeSessionExpire === 'function') await window.__beforeSessionExpire(); } catch (e) {}
    try { await sb.auth.signOut(); } catch (e) {}
    window.location.replace('/login.html?expired=1');
  }

  async function check() {
    if (expiring) return;
    var res = await sb.auth.getSession();
    var session = res && res.data && res.data.session;
    if (!session) return;
    var left = remaining(session);
    if (left <= 0) { expire(); return; }
    if (left <= WARN) {
      var minutes = Math.max(1, Math.ceil(left / 60000));
      showToast('Sua sessão expira em ' + minutes + ' min. Seu progresso é salvo automaticamente; depois disso será preciso entrar de novo.');
    }
  }

  check();
  setInterval(check, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
