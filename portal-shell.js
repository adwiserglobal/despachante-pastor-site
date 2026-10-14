(function () {
  var sidebar = document.getElementById('portal-sidebar');
  var backdrop = document.getElementById('portal-sidebar-backdrop');
  var toggle = document.getElementById('portal-menu-toggle');
  function setOpen(open) {
    sidebar.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
  }
  toggle.addEventListener('click', function () { setOpen(!sidebar.classList.contains('is-open')); });
  backdrop.addEventListener('click', function () { setOpen(false); });

  // Botões da sidebar acionam os botões existentes da página
  document.querySelectorAll('[data-proxy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setOpen(false);
      var target = document.querySelector(btn.getAttribute('data-proxy'));
      if (target) target.click();
    });
  });

  // Sino de notificações: avisos de mudança de status (tabela client_notifications) + lembretes de rascunho
  var bell = document.getElementById('portal-bell');
  var panel = document.getElementById('portal-bell-panel');
  var badge = document.getElementById('portal-bell-badge');
  var list = document.getElementById('portal-bell-list');
  var KEY = 'pastor_seen_notifications';
  var sb = window.despachanteSupabase;
  var statusItems = [];
  var draftItems = [];

  function seen() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function saveSeen(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }

  function fmt(iso) {
    try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  function render() {
    var s = seen();
    var unread = statusItems.filter(function (i) { return !i.read; }).length
      + draftItems.filter(function (i) { return s.indexOf(i.id) === -1; }).length;
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : unread;
    bell.classList.toggle('has-unread', unread > 0);
    list.replaceChildren();
    var all = statusItems.concat(draftItems);
    if (!all.length) {
      var p = document.createElement('p');
      p.className = 'portal-bell-empty';
      p.textContent = 'Nenhuma notificação por enquanto.';
      list.appendChild(p);
      return;
    }
    all.forEach(function (i) {
      var isNew = i.kind === 'status' ? !i.read : s.indexOf(i.id) === -1;
      var a = document.createElement('a');
      a.className = 'portal-bell-item' + (isNew ? ' is-new' : '');
      a.href = i.href;
      var t = document.createElement('strong'); t.textContent = i.title;
      var d = document.createElement('small'); d.textContent = i.text + (i.when ? ' · ' + i.when : '');
      a.append(t, d);
      list.appendChild(a);
    });
  }

  function loadDrafts(apps) {
    draftItems = (apps || []).map(function (app) {
      var data = app.form_data || {};
      var name = data.full_name || data.applicant_name || 'Minha aplicação';
      var step = Math.max(0, Math.min(Number(app.current_step || 0), 4)) + 1;
      return {
        kind: 'draft',
        id: app.id + ':' + step,
        title: 'Questionário em andamento',
        text: name + ' · etapa ' + step + ' de 5. Continue de onde parou.',
        href: '/vistos/estados-unidos?application=' + encodeURIComponent(app.id)
      };
    });
    render();
  }
  document.addEventListener('portal:applications', function (e) { loadDrafts(e.detail); });
  if (window.__portalApplications) loadDrafts(window.__portalApplications);

  async function loadStatusNotifications() {
    if (!sb) return;
    try {
      var res = await sb.from('client_notifications')
        .select('id,title,body,created_at,read_at')
        .order('created_at', { ascending: false }).limit(20);
      if (res.error) throw res.error;
      statusItems = (res.data || []).map(function (n) {
        return { kind: 'status', id: n.id, read: !!n.read_at, title: n.title, text: n.body, when: fmt(n.created_at), href: './portal.html#acompanhamento' };
      });
      render();
    } catch (e) { console.error('Notificações indisponíveis:', e && e.message); }
  }
  loadStatusNotifications();
  setInterval(loadStatusNotifications, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadStatusNotifications(); });

  bell.addEventListener('click', async function (e) {
    e.stopPropagation();
    var open = panel.hidden;
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
    if (open) {
      saveSeen(draftItems.map(function (i) { return i.id; }));
      var ids = statusItems.filter(function (i) { return !i.read; }).map(function (i) { return i.id; });
      if (ids.length && sb) {
        try { await sb.from('client_notifications').update({ read_at: new Date().toISOString() }).in('id', ids); } catch (err) {}
      }
      setTimeout(function () { statusItems.forEach(function (i) { i.read = true; }); render(); }, 1500);
    }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target)) { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); }
  });
})();
