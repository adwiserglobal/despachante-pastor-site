import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_EMAILS = new Set([
  'despachantepastorinterno@gmail.com',
  'desp.pastor@gmail.com',
]);

const FIREBASE_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID || 'despachante-pastor-4e8fa';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bzjxwrcefctxzxhmxtcd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeFirebasePrivateKey(rawValue) {
  if (!rawValue) return null;

  let value = String(rawValue).trim();

  // Be tolerant if the whole Firebase service-account JSON was pasted by mistake.
  if (value.startsWith('{')) {
    try {
      const serviceAccount = JSON.parse(value);
      if (serviceAccount?.private_key) value = String(serviceAccount.private_key);
    } catch {
      // Continue with normal PEM parsing below and return a useful error if invalid.
    }
  }

  // Vercel/env UIs sometimes preserve the JSON quotes around the private_key value.
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      value = JSON.parse(value);
    } catch {
      value = value.slice(1, -1);
    }
  }

  value = String(value)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();

  const begin = '-----BEGIN PRIVATE KEY-----';
  const end = '-----END PRIVATE KEY-----';
  const beginIndex = value.indexOf(begin);
  const endIndex = value.indexOf(end);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY inválida. Cole somente o valor private_key do JSON do Firebase, incluindo BEGIN PRIVATE KEY e END PRIVATE KEY.');
  }

  // Strip accidental prefixes/suffixes such as `private_key=` without exposing the key.
  value = value.slice(beginIndex, endIndex + end.length);
  return `${value}\n`;
}

function getFirebaseAdmin() {
  if (!FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    throw new Error('Firebase Admin não configurado no servidor.');
  }

  if (!getApps().length) {
    const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }

  return getAuth();
}

function getSupabaseAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Service Role não configurada no servidor.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function verifyInternalUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Sessão ausente.'), { status: 401 });

  const decoded = await getFirebaseAdmin().verifyIdToken(token, true);
  const email = String(decoded.email || '').trim().toLowerCase();
  const provider = decoded.firebase?.sign_in_provider;
  const authAgeSeconds = Math.floor(Date.now() / 1000) - Number(decoded.auth_time || 0);

  if (!decoded.email_verified) {
    throw Object.assign(new Error('E-mail Google não verificado.'), { status: 403 });
  }
  if (provider !== 'google.com') {
    throw Object.assign(new Error('O acesso interno exige autenticação Google.'), { status: 403 });
  }
  if (!ALLOWED_EMAILS.has(email)) {
    throw Object.assign(new Error('Conta não autorizada.'), { status: 403 });
  }
  if (!Number.isFinite(authAgeSeconds) || authAgeSeconds < 0 || authAgeSeconds > 60 * 60 * 4) {
    throw Object.assign(new Error('Sua sessão expirou. Entre novamente.'), { status: 401 });
  }

  return { uid: decoded.uid, email };
}

async function audit(sb, user, action, resourceType, resourceId = null) {
  try {
    await sb.from('internal_access_audit').insert({
      admin_user_id: null,
      admin_email: user.email,
      action: String(action || 'unknown').slice(0, 80),
      resource_type: String(resourceType || 'unknown').slice(0, 80),
      resource_id: resourceId || null,
    });
  } catch (error) {
    console.error('Falha ao registrar auditoria interna:', error?.message || error);
  }
}

const quoteStatuses = new Set(['new', 'contacted', 'in_progress', 'won', 'closed']);
const visaStatuses = new Set(['draft', 'submitted', 'in_review', 'needs_information', 'completed', 'archived']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'Origem não autorizada.' });

  let user;
  try {
    user = await verifyInternalUser(req);
  } catch (error) {
    return json(res, error?.status || 401, { error: error?.message || 'Acesso não autorizado.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === 'object' ? body : {};

  const action = String(body.action || '');
  const sb = getSupabaseAdmin();

  try {
    if (action === 'whoami') {
      await audit(sb, user, 'login_check', 'internal_portal');
      return json(res, 200, { ok: true, email: user.email });
    }

    if (action === 'list_quotes') {
      const { data, error } = await sb
        .from('quote_requests')
        .select('id,created_at,name,email,phone,vehicle_plate,service,status,stage_id,position,notes')
        .order('position', { ascending: true })
        .limit(1000);
      if (error) throw error;
      const { data: stages, error: stagesError } = await sb
        .from('lead_stages').select('id,name,color,position').order('position', { ascending: true });
      if (stagesError) throw stagesError;
      await audit(sb, user, 'list', 'quote_requests');
      return json(res, 200, { rows: data || [], stages: stages || [] });
    }

    if (action === 'update_quote_status') {
      const id = String(body.id || '');
      const status = String(body.status || '');
      if (!/^[0-9a-f-]{36}$/i.test(id) || !quoteStatuses.has(status)) {
        return json(res, 400, { error: 'Dados inválidos.' });
      }
      const { error } = await sb.from('quote_requests').update({ status }).eq('id', id);
      if (error) throw error;
      await audit(sb, user, `status:${status}`, 'quote_requests', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'list_visas') {
      const { data, error } = await sb
        .from('visa_applications')
        .select('id,country,status,current_step,created_at,updated_at,submitted_at,form_data')
        .order('updated_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const { data: requestRows } = await sb.from('visa_info_requests')
        .select('application_id,status,created_at').order('created_at', { ascending: false }).limit(1000);
      const latestRequest = new Map();
      (requestRows || []).forEach((r) => { if (!latestRequest.has(r.application_id)) latestRequest.set(r.application_id, r.status); });

      const rows = (data || []).map((row) => ({
        info_request: latestRequest.get(row.id) || null,
        id: row.id,
        country: row.country,
        status: row.status,
        current_step: row.current_step,
        created_at: row.created_at,
        updated_at: row.updated_at,
        submitted_at: row.submitted_at,
        applicant_name: row.form_data?.full_name || '',
        applicant_email: row.form_data?.email || '',
      }));

      await audit(sb, user, 'list', 'visa_applications');
      return json(res, 200, { rows });
    }

    if (action === 'get_visa') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });

      const { data, error } = await sb
        .from('visa_applications')
        .select('id,country,status,current_step,created_at,updated_at,submitted_at,form_data')
        .eq('id', id)
        .single();
      if (error) throw error;
      const { data: requests } = await sb.from('visa_info_requests')
        .select('id,message,requested_by,created_at,status,reply_text,reply_files,replied_at')
        .eq('application_id', id).order('created_at', { ascending: false });
      await audit(sb, user, 'view_detail', 'visa_applications', id);
      return json(res, 200, { row: data, info_requests: requests || [] });
    }

    if (action === 'get_visa_document') {
      const id = String(body.id || '');
      const field = String(body.field || '');
      if (!/^[0-9a-f-]{36}$/i.test(id) || !['passport_file','previous_visa_file','other_nationality_file'].includes(field)) {
        return json(res, 400, { error: 'Documento inválido.' });
      }
      const {data:application,error:applicationError} = await sb.from('visa_applications')
        .select('id,user_id,form_data').eq('id',id).single();
      if(applicationError || !application) return json(res,404,{error:'Aplicação não encontrada.'});
      const path = application.form_data?.[field];
      const permittedPrefix = application.user_id + '/' + application.id + '/' + field + '/';
      if(typeof path !== 'string' || !path.startsWith(permittedPrefix)) {
        return json(res,404,{error:'Documento não encontrado.'});
      }
      const {data,error} = await sb.storage.from('visa-documents').createSignedUrl(path,90);
      if(error || !data?.signedUrl) return json(res,404,{error:'Não foi possível acessar este documento.'});
      await audit(sb,user,'view_document','visa_applications',id);
      return json(res,200,{url:data.signedUrl});
    }

    if (action === 'update_visa_status') {
      const id = String(body.id || '');
      const status = String(body.status || '');
      if (!/^[0-9a-f-]{36}$/i.test(id) || !visaStatuses.has(status)) {
        return json(res, 400, { error: 'Dados inválidos.' });
      }
      const { error } = await sb
        .from('visa_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await audit(sb, user, `status:${status}`, 'visa_applications', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'request_info') {
      const id = String(body.id || '');
      const message = String(body.message || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      if (message.length < 3 || message.length > 4000) {
        return json(res, 400, { error: 'Escreva o que você precisa do cliente (até 4000 caracteres).' });
      }
      const { data: application, error: findError } = await sb.from('visa_applications')
        .select('id,user_id,submitted_at').eq('id', id).single();
      if (findError || !application) return json(res, 404, { error: 'Aplicação não encontrada.' });
      if (!application.submitted_at) {
        return json(res, 400, { error: 'Esta aplicação ainda é um rascunho. O cliente precisa enviá-la antes.' });
      }
      const { error: insertError } = await sb.from('visa_info_requests').insert({
        application_id: id, user_id: application.user_id, message, requested_by: user.email || null,
      });
      if (insertError) throw insertError;
      const { error: statusError } = await sb.from('visa_applications')
        .update({ status: 'needs_information', updated_at: new Date().toISOString() }).eq('id', id);
      if (statusError) throw statusError;
      await audit(sb, user, 'request_info', 'visa_applications', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'get_info_reply_file') {
      const requestId = String(body.request_id || '');
      const index = Number(body.index);
      if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Number.isInteger(index) || index < 0) {
        return json(res, 400, { error: 'Dados inválidos.' });
      }
      const { data: request, error: requestError } = await sb.from('visa_info_requests')
        .select('id,application_id,user_id,reply_files').eq('id', requestId).single();
      if (requestError || !request) return json(res, 404, { error: 'Solicitação não encontrada.' });
      const file = Array.isArray(request.reply_files) ? request.reply_files[index] : null;
      const path = typeof file === 'string' ? file : file?.path;
      const prefix = request.user_id + '/' + request.application_id + '/info_reply/';
      if (typeof path !== 'string' || !path.startsWith(prefix)) return json(res, 404, { error: 'Arquivo não encontrado.' });
      const { data, error } = await sb.storage.from('visa-documents').createSignedUrl(path, 90);
      if (error || !data?.signedUrl) return json(res, 404, { error: 'Não foi possível acessar este arquivo.' });
      await audit(sb, user, 'view_document', 'visa_info_requests', requestId);
      return json(res, 200, { url: data.signedUrl });
    }

    // ----- Kanban de contatos -----
    if (action === 'create_stage') {
      const name = String(body.name || '').trim().slice(0, 40);
      const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? String(body.color) : '#d3ad5b';
      if (!name) return json(res, 400, { error: 'Informe o nome da coluna.' });
      const { data: last } = await sb.from('lead_stages').select('position').order('position', { ascending: false }).limit(1);
      const position = (last?.[0]?.position ?? -1) + 1;
      const { data, error } = await sb.from('lead_stages').insert({ name, color, position }).select('id,name,color,position').single();
      if (error) throw error;
      await audit(sb, user, 'create_stage', 'lead_stages', data.id);
      return json(res, 200, { stage: data });
    }

    if (action === 'update_stage') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      const patch = {};
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 40);
        if (!name) return json(res, 400, { error: 'O nome da coluna não pode ficar vazio.' });
        patch.name = name;
      }
      if (body.color !== undefined) {
        if (!/^#[0-9a-fA-F]{6}$/.test(String(body.color))) return json(res, 400, { error: 'Cor inválida.' });
        patch.color = String(body.color);
      }
      const { error } = await sb.from('lead_stages').update(patch).eq('id', id);
      if (error) throw error;
      await audit(sb, user, 'update_stage', 'lead_stages', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'reorder_stages') {
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      if (!ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return json(res, 400, { error: 'Dados inválidos.' });
      for (let i = 0; i < ids.length; i++) {
        const { error } = await sb.from('lead_stages').update({ position: i }).eq('id', ids[i]);
        if (error) throw error;
      }
      await audit(sb, user, 'reorder_stages', 'lead_stages');
      return json(res, 200, { ok: true });
    }

    if (action === 'delete_stage') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      const { data: stages, error: listError } = await sb.from('lead_stages').select('id,position').order('position', { ascending: true });
      if (listError) throw listError;
      if ((stages || []).length <= 1) return json(res, 400, { error: 'É preciso manter ao menos uma coluna.' });
      const target = stages.find((s) => s.id !== id);
      // Os cartões da coluna removida vão para a primeira coluna restante
      const { error: moveError } = await sb.from('quote_requests').update({ stage_id: target.id }).eq('stage_id', id);
      if (moveError) throw moveError;
      const { error } = await sb.from('lead_stages').delete().eq('id', id);
      if (error) throw error;
      await audit(sb, user, 'delete_stage', 'lead_stages', id);
      return json(res, 200, { ok: true, moved_to: target.id });
    }

    if (action === 'move_quote') {
      const id = String(body.id || '');
      const stageId = String(body.stage_id || '');
      const position = Number(body.position);
      if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(stageId) || !Number.isFinite(position)) {
        return json(res, 400, { error: 'Dados inválidos.' });
      }
      const { data: stage } = await sb.from('lead_stages').select('id').eq('id', stageId).maybeSingle();
      if (!stage) return json(res, 404, { error: 'Coluna não encontrada.' });
      const { error } = await sb.from('quote_requests').update({ stage_id: stageId, position }).eq('id', id);
      if (error) throw error;
      await audit(sb, user, 'move_quote', 'quote_requests', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'update_quote_notes') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      const notes = String(body.notes ?? '').slice(0, 4000);
      const { error } = await sb.from('quote_requests').update({ notes: notes || null }).eq('id', id);
      if (error) throw error;
      await audit(sb, user, 'update_notes', 'quote_requests', id);
      return json(res, 200, { ok: true });
    }

    if (action === 'delete_quote') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      await audit(sb, user, 'delete', 'quote_requests', id);
      const { error } = await sb.from('quote_requests').delete().eq('id', id);
      if (error) throw error;
      return json(res, 200, { ok: true });
    }

    if (action === 'delete_visa') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: 'ID inválido.' });
      const { data: application, error: findError } = await sb.from('visa_applications')
        .select('id,user_id,form_data').eq('id', id).single();
      if (findError || !application) return json(res, 404, { error: 'Aplicação não encontrada.' });

      // Remove os anexos do Storage (campos registrados + qualquer arquivo na pasta da aplicação)
      const fields = ['passport_file', 'previous_visa_file', 'other_nationality_file', 'info_reply'];
      const paths = new Set();
      for (const field of fields) {
        const path = application.form_data?.[field];
        const prefix = application.user_id + '/' + application.id + '/' + field + '/';
        if (typeof path === 'string' && path.startsWith(prefix)) paths.add(path);
        const { data: files } = await sb.storage.from('visa-documents').list(prefix.slice(0, -1), { limit: 100 });
        (files || []).forEach((file) => paths.add(prefix + file.name));
      }
      if (paths.size) {
        const { error: removeError } = await sb.storage.from('visa-documents').remove([...paths]);
        if (removeError) throw removeError;
      }
      await audit(sb, user, 'delete', 'visa_applications', id);
      const { error } = await sb.from('visa_applications').delete().eq('id', id);
      if (error) throw error;
      return json(res, 200, { ok: true, removed_files: paths.size });
    }

    return json(res, 400, { error: 'Ação inválida.' });
  } catch (error) {
    console.error('Erro na API interna:', error?.message || error);
    return json(res, 500, { error: 'Não foi possível concluir a operação.' });
  }
}
