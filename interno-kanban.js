// Kanban de contatos da área interna: colunas personalizáveis, arrastar e soltar, WhatsApp, observações e exportação CSV.

const PALETTE = ['#4c7ebe', '#d3ad5b', '#9b6bd1', '#2f9e6b', '#e07a5f', '#d64f6b', '#2aa5b5', '#8793a2'];

const ICONS = {
  whatsapp: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3.2A12.73 12.73 0 0 0 5.1 22.43L3.4 28.8l6.52-1.71a12.7 12.7 0 0 0 6.1 1.55h.01A12.72 12.72 0 0 0 16.04 3.2Zm0 23.3a10.55 10.55 0 0 1-5.38-1.47l-.39-.23-3.87 1.02 1.03-3.77-.25-.39a10.55 10.55 0 1 1 8.86 4.84Zm5.79-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.98-2.34-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64 0 1.55 1.14 3.06 1.3 3.27.16.21 2.23 3.4 5.4 4.77.75.33 1.34.52 1.8.67.76.24 1.45.2 2 .12.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.37.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function normalizeWhatsapp(raw) {
  let digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
}

function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function whatsappLink(row, serviceLabel) {
  const digits = normalizeWhatsapp(row.phone);
  if (!digits) return '';
  const hello = firstName(row.name) ? `Olá, ${firstName(row.name)}!` : 'Olá!';
  const text = `${hello} Aqui é do Despachante Pastor. Recebemos o seu contato pelo site sobre ${serviceLabel.toLowerCase()} e vamos te ajudar. Podemos conversar?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function createKanban({ root, api, readableService, fmtDate, onChange }) {
  let stages = [];
  let cards = [];
  let query = '';
  let dragId = null;
  let busy = 0;

  const searchValue = () => query.trim().toLowerCase();
  const stageCards = (stageId) => cards
    .filter((card) => card.stage_id === stageId)
    .filter((card) => {
      const q = searchValue();
      if (!q) return true;
      return [card.name, card.email, card.phone, card.vehicle_plate, readableService(card.service)].some((v) => String(v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => a.position - b.position);

  function toast(message) {
    document.querySelector('.kb-toast')?.remove();
    const node = el('div', 'kb-toast', message);
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  async function safe(action, rollback) {
    busy++;
    try {
      await action();
    } catch (error) {
      console.error(error);
      rollback?.();
      render();
      window.alert(error?.message || 'Não foi possível concluir a ação.');
    } finally {
      busy--;
    }
  }

  // ---------- Diálogos ----------
  function openDialog(build) {
    const dialog = el('dialog', 'kb-dialog');
    const shell = el('div', 'kb-dialog-shell');
    dialog.appendChild(shell);
    const close = () => dialog.close();
    build(shell, close);
    dialog.addEventListener('close', () => { dialog.remove(); busy = Math.max(0, busy); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    dialog.showModal();
    return dialog;
  }

  function swatches(current, onPick) {
    const wrap = el('div', 'kb-swatches');
    PALETTE.forEach((color) => {
      const button = el('button', `kb-swatch${color.toLowerCase() === String(current).toLowerCase() ? ' is-active' : ''}`);
      button.type = 'button';
      button.style.background = color;
      button.setAttribute('aria-label', `Cor ${color}`);
      button.addEventListener('click', () => {
        wrap.querySelectorAll('.kb-swatch').forEach((s) => s.classList.remove('is-active'));
        button.classList.add('is-active');
        onPick(color);
      });
      wrap.appendChild(button);
    });
    return wrap;
  }

  function openStageDialog(stage) {
    const isNew = !stage;
    let color = stage?.color || PALETTE[1];
    openDialog((shell, close) => {
      shell.appendChild(el('span', 'kb-kicker', isNew ? 'NOVA COLUNA' : 'EDITAR COLUNA'));
      shell.appendChild(el('h2', '', isNew ? 'Criar coluna' : 'Editar coluna'));
      const label = el('label', 'kb-label', 'Nome da coluna');
      const input = el('input', 'kb-input');
      input.type = 'text';
      input.maxLength = 40;
      input.value = stage?.name || '';
      input.placeholder = 'Ex.: Aguardando documentos';
      label.appendChild(input);
      shell.appendChild(label);
      shell.appendChild(el('div', 'kb-label', 'Cor'));
      shell.appendChild(swatches(color, (c) => { color = c; }));

      const actions = el('div', 'kb-actions');
      if (!isNew) {
        const idx = stages.findIndex((s) => s.id === stage.id);
        const left = el('button', 'kb-btn ghost', '← Mover');
        left.type = 'button';
        left.disabled = idx <= 0;
        left.addEventListener('click', () => { close(); moveStage(stage.id, -1); });
        const right = el('button', 'kb-btn ghost', 'Mover →');
        right.type = 'button';
        right.disabled = idx >= stages.length - 1;
        right.addEventListener('click', () => { close(); moveStage(stage.id, 1); });
        const del = el('button', 'kb-btn danger', 'Excluir');
        del.type = 'button';
        del.disabled = stages.length <= 1;
        del.addEventListener('click', () => {
          const count = cards.filter((c) => c.stage_id === stage.id).length;
          const fallback = stages.find((s) => s.id !== stage.id);
          if (!window.confirm(`Excluir a coluna "${stage.name}"?${count ? `\n\nOs ${count} cartão(ões) serão movidos para "${fallback.name}".` : ''}`)) return;
          close();
          deleteStage(stage.id);
        });
        actions.append(left, right, del);
      }
      const spacer = el('span', 'kb-spacer');
      const cancel = el('button', 'kb-btn ghost', 'Cancelar');
      cancel.type = 'button';
      cancel.addEventListener('click', close);
      const save = el('button', 'kb-btn primary', isNew ? 'Criar coluna' : 'Salvar');
      save.type = 'button';
      save.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        close();
        if (isNew) createStage(name, color); else updateStage(stage.id, name, color);
      });
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') save.click(); });
      actions.append(spacer, cancel, save);
      shell.appendChild(actions);
      setTimeout(() => input.focus(), 30);
    });
  }

  function openCardDialog(card) {
    openDialog((shell, close) => {
      const stage = stages.find((s) => s.id === card.stage_id);
      shell.appendChild(el('span', 'kb-kicker', 'CONTATO DO SITE'));
      shell.appendChild(el('h2', '', card.name || 'Sem nome'));
      shell.appendChild(el('p', 'kb-muted', `Recebido em ${fmtDate(card.created_at)}`));

      const grid = el('div', 'kb-detail-grid');
      [['E-mail', card.email], ['Telefone', card.phone], ['Serviço', readableService(card.service)], ['Placa', card.vehicle_plate]].forEach(([k, v]) => {
        const item = el('div', 'kb-detail');
        item.append(el('small', '', k), el('strong', '', v || '—'));
        grid.appendChild(item);
      });
      shell.appendChild(grid);

      const moveLabel = el('label', 'kb-label', 'Coluna');
      const select = el('select', 'kb-input');
      stages.forEach((s) => {
        const option = el('option', '', s.name);
        option.value = s.id;
        option.selected = s.id === card.stage_id;
        select.appendChild(option);
      });
      moveLabel.appendChild(select);
      shell.appendChild(moveLabel);

      const notesLabel = el('label', 'kb-label', 'Observações internas');
      const notes = el('textarea', 'kb-input');
      notes.rows = 4;
      notes.maxLength = 4000;
      notes.value = card.notes || '';
      notes.placeholder = 'Anotações sobre o atendimento (visíveis só para a equipe)';
      notesLabel.appendChild(notes);
      shell.appendChild(notesLabel);

      const actions = el('div', 'kb-actions');
      const wa = whatsappLink(card, readableService(card.service));
      if (wa) {
        const link = el('a', 'kb-btn whatsapp');
        link.href = wa; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.innerHTML = `${ICONS.whatsapp}<span>WhatsApp</span>`;
        actions.appendChild(link);
      }
      if (card.email) {
        const mail = el('a', 'kb-btn ghost', 'E-mail');
        mail.href = `mailto:${card.email}`;
        actions.appendChild(mail);
      }
      const del = el('button', 'kb-btn danger', 'Excluir');
      del.type = 'button';
      del.addEventListener('click', () => {
        if (!window.confirm(`Excluir o contato de ${card.name || 'este cliente'}?\n\nEsta ação é permanente.`)) return;
        close();
        deleteCard(card.id);
      });
      actions.append(el('span', 'kb-spacer'), del);
      const save = el('button', 'kb-btn primary', 'Salvar');
      save.type = 'button';
      save.addEventListener('click', () => {
        const toStage = select.value;
        const newNotes = notes.value.trim();
        close();
        if (newNotes !== (card.notes || '')) saveNotes(card, newNotes);
        if (toStage !== card.stage_id) moveCard(card.id, toStage, endPosition(toStage));
      });
      actions.appendChild(save);
      shell.appendChild(actions);
      void stage;
    });
  }

  // ---------- Ações ----------
  const endPosition = (stageId) => {
    const list = cards.filter((c) => c.stage_id === stageId);
    return list.length ? Math.max(...list.map((c) => c.position)) + 1 : 0;
  };

  function moveCard(id, stageId, position) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const before = { stage_id: card.stage_id, position: card.position };
    card.stage_id = stageId;
    card.position = position;
    render();
    safe(() => api('move_quote', { id, stage_id: stageId, position }), () => Object.assign(card, before));
  }

  function saveNotes(card, notes) {
    const before = card.notes;
    card.notes = notes || null;
    safe(() => api('update_quote_notes', { id: card.id, notes }), () => { card.notes = before; });
  }

  function deleteCard(id) {
    const snapshot = cards;
    cards = cards.filter((c) => c.id !== id);
    render();
    safe(() => api('delete_quote', { id }), () => { cards = snapshot; });
  }

  async function createStage(name, color) {
    await safe(async () => {
      const { stage } = await api('create_stage', { name, color });
      stages = [...stages, stage];
      render();
    });
  }

  function updateStage(id, name, color) {
    const stage = stages.find((s) => s.id === id);
    const before = { name: stage.name, color: stage.color };
    stage.name = name;
    stage.color = color;
    render();
    safe(() => api('update_stage', { id, name, color }), () => Object.assign(stage, before));
  }

  function moveStage(id, direction) {
    const previous = stages;
    const index = stages.findIndex((s) => s.id === id);
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    stages = next;
    render();
    safe(() => api('reorder_stages', { ids: next.map((s) => s.id) }), () => { stages = previous; });
  }

  function deleteStage(id) {
    const previousStages = stages;
    const previousCards = cards.map((c) => ({ ...c }));
    const fallback = stages.find((s) => s.id !== id);
    cards.forEach((c) => { if (c.stage_id === id) { c.stage_id = fallback.id; c.position = endPosition(fallback.id) + 1; } });
    stages = stages.filter((s) => s.id !== id);
    render();
    safe(() => api('delete_stage', { id }), () => { stages = previousStages; cards = previousCards; });
  }

  // ---------- CSV ----------
  function csvEscape(value) {
    return `"${String(value ?? '').replace(/\r?\n/g, ' ').trim().replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const rows = stages.flatMap((stage) => stageCards(stage.id).map((card) => [
      fmtDate(card.created_at), card.name, card.email, card.phone, readableService(card.service), card.vehicle_plate, stage.name, card.notes,
    ]));
    if (!rows.length) { toast('Não há contatos para exportar.'); return; }
    const header = ['Recebido', 'Cliente', 'E-mail', 'Telefone', 'Serviço', 'Placa', 'Coluna', 'Observações'];
    const csv = '﻿' + [header, ...rows].map((line) => line.map(csvEscape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = el('a');
    link.href = url;
    link.download = `contatos-despachante-pastor-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`${rows.length} contato${rows.length === 1 ? '' : 's'} exportado${rows.length === 1 ? '' : 's'} em CSV.`);
  }

  // ---------- Renderização ----------
  function renderCard(card, stage, isFirst) {
    const node = el('article', 'kb-card');
    node.draggable = true;
    node.dataset.id = card.id;
    node.style.setProperty('--stage', stage.color);

    const top = el('div', 'kb-card-top');
    top.appendChild(el('strong', 'kb-card-name', card.name || 'Sem nome'));
    const fresh = isFirst && Date.now() - new Date(card.created_at).getTime() < 48 * 3600 * 1000;
    if (fresh) top.appendChild(el('span', 'kb-new', 'Novo'));
    top.appendChild(el('small', 'kb-time', timeAgo(card.created_at)));
    node.appendChild(top);

    const chips = el('div', 'kb-chips');
    chips.appendChild(el('span', 'kb-chip', readableService(card.service)));
    if (card.vehicle_plate) chips.appendChild(el('span', 'kb-chip plate', card.vehicle_plate));
    node.appendChild(chips);

    const info = el('div', 'kb-info');
    if (card.phone) { const l = el('span'); l.innerHTML = ICONS.phone; l.append(card.phone); info.appendChild(l); }
    if (card.email) { const l = el('span'); l.innerHTML = ICONS.mail; l.append(card.email); info.appendChild(l); }
    node.appendChild(info);
    if (card.notes) node.appendChild(el('p', 'kb-note', card.notes));

    const actions = el('div', 'kb-card-actions');
    const wa = whatsappLink(card, readableService(card.service));
    if (wa) {
      const link = el('a', 'kb-wa');
      link.href = wa; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.title = 'Conversar no WhatsApp';
      link.innerHTML = `${ICONS.whatsapp}<span>WhatsApp</span>`;
      link.addEventListener('click', (event) => event.stopPropagation());
      link.draggable = false;
      actions.appendChild(link);
    }
    const open = el('button', 'kb-open', 'Abrir');
    open.type = 'button';
    open.addEventListener('click', (event) => { event.stopPropagation(); openCardDialog(card); });
    actions.appendChild(open);
    node.appendChild(actions);

    node.addEventListener('dblclick', () => openCardDialog(card));
    node.addEventListener('dragstart', (event) => {
      dragId = card.id;
      busy++;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.id);
      requestAnimationFrame(() => node.classList.add('is-dragging'));
    });
    node.addEventListener('dragend', () => {
      dragId = null;
      busy = Math.max(0, busy - 1);
      node.classList.remove('is-dragging');
      root.querySelectorAll('.kb-list.is-over').forEach((l) => l.classList.remove('is-over'));
      root.querySelectorAll('.kb-drop-line').forEach((l) => l.remove());
    });
    return node;
  }

  function dropIndex(list, clientY) {
    const items = [...list.querySelectorAll('.kb-card:not(.is-dragging)')];
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
  }

  function wireDropZone(list, stage) {
    list.addEventListener('dragover', (event) => {
      if (!dragId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      list.classList.add('is-over');
      const items = [...list.querySelectorAll('.kb-card:not(.is-dragging)')];
      const index = dropIndex(list, event.clientY);
      let line = list.querySelector('.kb-drop-line');
      if (!line) line = el('div', 'kb-drop-line');
      if (items[index]) list.insertBefore(line, items[index]); else list.appendChild(line);
    });
    list.addEventListener('dragleave', (event) => {
      if (!list.contains(event.relatedTarget)) { list.classList.remove('is-over'); list.querySelector('.kb-drop-line')?.remove(); }
    });
    list.addEventListener('drop', (event) => {
      event.preventDefault();
      const id = dragId || event.dataTransfer.getData('text/plain');
      if (!id) return;
      const siblings = [...list.querySelectorAll('.kb-card:not(.is-dragging)')].map((n) => cards.find((c) => c.id === n.dataset.id)).filter(Boolean);
      const index = dropIndex(list, event.clientY);
      const prev = siblings[index - 1];
      const next = siblings[index];
      let position;
      if (prev && next) position = (prev.position + next.position) / 2;
      else if (prev) position = prev.position + 1;
      else if (next) position = next.position - 1;
      else position = 0;
      list.classList.remove('is-over');
      list.querySelector('.kb-drop-line')?.remove();
      dragId = null;
      busy = Math.max(0, busy - 1);
      moveCard(id, stage.id, position);
    });
  }

  function renderColumn(stage, index) {
    const col = el('section', 'kb-col');
    col.style.setProperty('--stage', stage.color);
    const list = stageCards(stage.id);

    const head = el('header', 'kb-col-head');
    head.appendChild(el('span', 'kb-dot'));
    head.appendChild(el('h3', 'kb-col-title', stage.name));
    head.appendChild(el('span', 'kb-count', String(list.length)));
    const menu = el('button', 'kb-icon-btn');
    menu.type = 'button';
    menu.title = 'Editar coluna';
    menu.setAttribute('aria-label', `Editar coluna ${stage.name}`);
    menu.innerHTML = ICONS.dots;
    menu.addEventListener('click', () => openStageDialog(stage));
    head.appendChild(menu);
    col.appendChild(head);

    const body = el('div', 'kb-list');
    list.forEach((card) => body.appendChild(renderCard(card, stage, index === 0)));
    if (!list.length) body.appendChild(el('div', 'kb-empty', searchValue() ? 'Nenhum resultado' : 'Arraste cartões para cá'));
    wireDropZone(body, stage);
    col.appendChild(body);
    return col;
  }

  function render() {
    const scroll = root.querySelector('.kb-board')?.scrollLeft || 0;
    root.replaceChildren();

    const toolbar = el('div', 'kb-toolbar');
    const search = el('label', 'kb-search');
    search.innerHTML = ICONS.search;
    const input = el('input');
    input.type = 'search';
    input.placeholder = 'Buscar por nome, telefone, e-mail ou placa';
    input.value = query;
    input.addEventListener('input', () => {
      query = input.value;
      const pos = input.selectionStart;
      render();
      const again = root.querySelector('.kb-search input');
      again.focus();
      again.setSelectionRange(pos, pos);
    });
    search.appendChild(input);
    const add = el('button', 'kb-btn outline');
    add.type = 'button';
    add.innerHTML = `${ICONS.plus}<span>Nova coluna</span>`;
    add.addEventListener('click', () => openStageDialog(null));
    const exp = el('button', 'kb-btn outline');
    exp.type = 'button';
    exp.innerHTML = `${ICONS.download}<span>Exportar CSV</span>`;
    exp.addEventListener('click', exportCsv);
    toolbar.append(search, el('span', 'kb-spacer'), add, exp);
    root.appendChild(toolbar);

    const board = el('div', 'kb-board');
    stages.forEach((stage, index) => board.appendChild(renderColumn(stage, index)));
    root.appendChild(board);
    board.scrollLeft = scroll;
    onChange?.({ cards, stages });
  }

  return {
    set(nextCards, nextStages) {
      cards = (nextCards || []).map((c) => ({ ...c, position: Number(c.position) || 0 }));
      stages = [...(nextStages || [])].sort((a, b) => a.position - b.position);
      render();
    },
    get busy() { return busy > 0 || Boolean(document.querySelector('dialog.kb-dialog[open]')); },
    openCard(id) { const c = cards.find((x) => x.id === id); if (c) openCardDialog(c); },
    getCards: () => cards,
    getStages: () => stages,
  };
}
