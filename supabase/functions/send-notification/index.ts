import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM = Deno.env.get("RESEND_FROM") ?? "Despachante Pastor <atendimento@despachantepastor.com.br>";
const REPLY_TO = Deno.env.get("RESEND_REPLY_TO") ?? "desp.pastor@gmail.com";
const SITE = "https://www.despachantepastor.com.br";
const LOGO = `${SITE}/assets/logo-white.png`;
const STAFF = ["despachantepastorinterno@gmail.com", "desp.pastor@gmail.com"];
const WHATSAPP = "https://wa.me/551144382633";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const esc = (value: unknown) =>
  String(value ?? "").slice(0, 2000).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const titleCase = (name: string) =>
  name.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, space, letter) => space + letter.toUpperCase());
const firstName = (name: unknown) => titleCase(String(name ?? "").trim().split(/\s+/)[0] ?? "");

const FONT = "'Segoe UI',Helvetica,Arial,sans-serif";

const row = (label: string, value: unknown) =>
  value
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #edf0f4;color:#8793a2;font-size:12px;letter-spacing:.06em;text-transform:uppercase;width:110px;font-family:${FONT}">${label}</td><td style="padding:10px 0;border-bottom:1px solid #edf0f4;color:#0b1d38;font-size:15px;font-weight:600;font-family:${FONT}">${esc(value)}</td></tr>`
    : "";

const pill = (text: string, bg: string, color: string) =>
  `<span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-family:${FONT}">${esc(text)}</span>`;

function layout(o: { preheader: string; kicker: string; title: string; inner: string; cta?: { label: string; href: string }; client?: boolean }) {
  const button = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 0"><tr><td style="border-radius:999px;background:#d3ad5b;background-image:linear-gradient(135deg,#ecd595,#d3ad5b 55%,#c8943d)"><a href="${o.cta.href}" style="display:inline-block;padding:15px 32px;border-radius:999px;color:#04142e;font-size:15px;font-weight:700;text-decoration:none;font-family:${FONT}">${esc(o.cta.label)}</a></td></tr></table>`
    : "";
  const reason = o.client
    ? "Você recebeu este e-mail porque há uma solicitação em andamento na sua Área do cliente."
    : "Notificação automática do site Despachante Pastor.";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(4,20,46,.12)">
<tr><td align="center" bgcolor="#04142e" style="background:#04142e;background-image:linear-gradient(160deg,#04142e,#0a2145 60%,#0c2a56);padding:34px 24px 28px">
  <img src="${LOGO}" width="92" height="92" alt="Despachante Pastor" style="display:block;border:0;width:92px;height:92px">
  <div style="margin-top:14px;color:#e2c57f;font-size:11px;font-weight:700;letter-spacing:.2em;font-family:${FONT}">DESPACHANTE PASTOR</div>
</td></tr>
<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:#d3ad5b;background-image:linear-gradient(90deg,#ecd595,#d3ad5b,#c8943d)">&nbsp;</td></tr>
<tr><td style="padding:38px 36px 36px;font-family:${FONT}">
  <div style="color:#a67c25;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">${esc(o.kicker)}</div>
  <h1 style="margin:10px 0 18px;color:#04142e;font-size:26px;line-height:1.25;font-weight:800;font-family:${FONT}">${esc(o.title)}</h1>
  ${o.inner}
  ${button}
</td></tr>
<tr><td bgcolor="#04142e" style="background:#04142e;padding:26px 36px;font-family:${FONT}">
  <div style="color:#ffffff;font-size:13px;font-weight:700">Despachante Pastor</div>
  <div style="margin-top:6px;color:#b8c7db;font-size:12px;line-height:1.7">Rua Cesário Mota, 245 · Santo André, SP<br>
  Telefone e WhatsApp: <a href="${WHATSAPP}" style="color:#e2c57f;text-decoration:none">(11) 4438-2633</a></div>
  <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);color:#7f90aa;font-size:11px;line-height:1.6">${reason}</div>
</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 16px;color:#4a5b72;font-size:16px;line-height:1.7;font-family:${FONT}">${html}</p>`;

// Saudação com o nome da pessoa (titular) ou referência ao solicitante (familiar)
function greet(d: Record<string, unknown>) {
  const titular = String(d.relationship ?? "Titular") === "Titular";
  const name = titleCase(String(d.name ?? "").trim());
  return titular
    ? p(`<strong style="color:#04142e;font-size:18px">Olá, ${esc(firstName(d.name))}!</strong>`)
    : p(`<strong style="color:#04142e;font-size:18px">Olá!</strong><br>Atualização sobre a solicitação de <strong style="color:#04142e">${esc(name)}</strong>.`);
}

const STATUS_COPY: Record<string, { subject: string; title: string; text: string; tag: [string, string, string] }> = {
  in_review: {
    subject: "Sua solicitação está em análise",
    title: "Sua solicitação está em análise",
    text: "Nossa equipe começou a analisar o questionário enviado. Avisaremos por e-mail a cada novidade, e você também pode acompanhar tudo na Área do cliente.",
    tag: ["Em análise", "#f6edd8", "#8c6725"],
  },
  completed: {
    subject: "Sua solicitação foi concluída",
    title: "Solicitação concluída",
    text: "O atendimento da sua solicitação foi concluído. Se tiver qualquer dúvida, é só responder este e-mail ou falar conosco pelo WhatsApp.",
    tag: ["Concluído", "#e3f6ec", "#1f7a4d"],
  },
};

type Mail = { to: string[]; subject: string; html: string; replyTo?: string };

function build(event: string, d: Record<string, unknown>): Mail | null {
  const staffCta = { label: "Abrir área interna", href: `${SITE}/interno` };
  const portalCta = { label: "Abrir Área do cliente", href: `${SITE}/portal` };
  const who = String(d.name ?? "sem nome").slice(0, 80);
  switch (event) {
    case "lead_created":
      return {
        to: STAFF,
        subject: `Novo contato pelo site: ${who}`,
        html: layout({
          preheader: `${who} pediu um orçamento pelo site.`, kicker: "Novo contato", title: "Novo contato pelo site", cta: staffCta,
          inner: p(`<strong style="color:#04142e">${esc(titleCase(String(d.name ?? "")))}</strong> enviou o formulário de orçamento.`) +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${row("Nome", d.name)}${row("E-mail", d.email)}${row("Telefone", d.phone)}${row("Serviço", d.service)}${row("Placa", d.vehicle_plate)}</table>`,
        }),
      };
    case "visa_submitted":
      return {
        to: STAFF,
        subject: `Novo formulário de visto enviado: ${who}`,
        html: layout({
          preheader: `${who} enviou o questionário do visto americano.`, kicker: "Visto americano", title: "Novo formulário de visto", cta: staffCta,
          inner: p(`<strong style="color:#04142e">${esc(titleCase(String(d.name ?? "")))}</strong> enviou o questionário do visto americano. Os dados completos e os anexos estão na área interna.`),
        }),
      };
    case "visa_reply":
      return {
        to: STAFF,
        subject: `Cliente respondeu ao pedido de informações: ${who}`,
        html: layout({
          preheader: `${who} respondeu ao pedido de informações.`, kicker: "Resposta recebida", title: "O cliente respondeu", cta: staffCta,
          inner: p(`<strong style="color:#04142e">${esc(titleCase(String(d.name ?? "")))}</strong> respondeu ao pedido de informações adicionais. Veja o texto e os anexos na área interna.`),
        }),
      };
    case "client_status": {
      const copy = STATUS_COPY[String(d.status)];
      if (!copy || !d.to) return null;
      return {
        to: [String(d.to)], replyTo: REPLY_TO, subject: copy.subject,
        html: layout({
          preheader: copy.title, kicker: "Atualização da solicitação", title: copy.title, client: true, cta: portalCta,
          inner: greet(d) + `<div style="margin:0 0 18px">${pill(copy.tag[0], copy.tag[1], copy.tag[2])}</div>` + p(esc(copy.text)),
        }),
      };
    }
    case "client_info_request":
      if (!d.to) return null;
      return {
        to: [String(d.to)], replyTo: REPLY_TO, subject: "Precisamos de mais informações sobre a sua solicitação",
        html: layout({
          preheader: "Nossa equipe precisa de informações adicionais para continuar.", kicker: "Atualização da solicitação", title: "Precisamos de mais informações", client: true,
          cta: { label: "Responder na Área do cliente", href: `${SITE}/portal` },
          inner: greet(d) + `<div style="margin:0 0 18px">${pill("Informações solicitadas", "#fdeed9", "#a45f12")}</div>` + p("Nossa equipe enviou o seguinte pedido:") +
            `<div style="margin:0 0 18px;padding:18px 20px;border-left:4px solid #d3ad5b;border-radius:0 12px 12px 0;background:#fffbf0;color:#04142e;font-size:16px;line-height:1.7;white-space:pre-wrap;font-family:${FONT}">${esc(d.message)}</div>` +
            p("Você pode responder por escrito e anexar arquivos diretamente na Área do cliente."),
        }),
      };
    default:
      return null;
  }
}

// Lê o segredo a cada chamada (evita guardar valor vazio de uma instância antiga)
function findResendKey(): string {
  const direct = Deno.env.get("RESEND_API_KEY");
  if (direct) return direct.trim();
  for (const [name, value] of Object.entries(Deno.env.toObject())) {
    if (name.trim().toUpperCase().replace(/[^A-Z]/g, "") === "RESENDAPIKEY" && value) return value.trim();
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = req.headers.get("x-webhook-secret") ?? "";
  const { data: valid, error: secretError } = await supabase.rpc("check_email_webhook_secret", { p_secret: secret });
  if (secretError || valid !== true) return new Response("Unauthorized", { status: 401 });

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const mail = build(String(payload.event ?? ""), payload.data ?? {});
  if (!mail) return new Response(JSON.stringify({ skipped: true }), { status: 200 });

  const apiKey = findResendKey();
  if (!apiKey) return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500 });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html, ...(mail.replyTo ? { reply_to: mail.replyTo } : {}) }),
  });
  const result = await response.text();
  if (!response.ok) console.error("Resend recusou o envio:", response.status, result);
  return new Response(result, { status: response.ok ? 200 : 502, headers: { "Content-Type": "application/json" } });
});
