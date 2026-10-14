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

  // Sino de notificações
  var bell = document.getElementById('portal-bell');
  var panel = document.getElementById('portal-bell-panel');
  var badge = document.getElementById('portal-bell-badge');
  var list = document.getElementById('portal-bell-list');
  var KEY = 'pastor_seen_notifications';
  var items = [];

  function seen() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function saveSeen(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }

  function render() {
    var s = seen();
    var unread = items.filter(function (i) { return s.indexOf(i.id) === -1; }).length;
    badge.hidden = unread === 0;
    badge.textContent = unread;
    bell.classList.toggle('has-unread', unread > 0);
    list.replaceChildren();
    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'portal-bell-empty';
      p.textContent = 'Nenhuma notificação por enquanto.';
      list.appendChild(p);
      return;
    }
    items.forEach(function (i) {
      var a = document.createElement('a');
      a.className = 'portal-bell-item' + (s.indexOf(i.id) === -1 ? ' is-new' : '');
      a.href = i.href;
      var t = document.createElement('strong'); t.textContent = i.title;
      var d = document.createElement('small'); d.textContent = i.text;
      a.append(t, d);
      list.appendChild(a);
    });
  }

  function load(apps) {
    items = (apps || []).map(function (app) {
      var data = app.form_data || {};
      var name = data.full_name || data.applicant_name || 'Minha aplicação';
      var step = Math.max(0, Math.min(Number(app.current_step || 0), 4)) + 1;
      return {
        id: app.id + ':' + step,
        title: 'Questionário em andamento',
        text: name + ' · etapa ' + step + ' de 5. Continue de onde parou.',
        href: '/vistos/estados-unidos?application=' + encodeURIComponent(app.id)
      };
    });
    render();
  }
  document.addEventListener('portal:applications', function (e) { load(e.detail); });
  if (window.__portalApplications) load(window.__portalApplications);

  bell.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = panel.hidden;
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
    if (open) {
      saveSeen(items.map(function (i) { return i.id; }));
      setTimeout(render, 1200);
    }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target)) { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); }
  });
})();
