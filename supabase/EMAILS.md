# E-mails automáticos (Resend)

Já aplicado no Supabase (projeto Despachante Pastor). Este arquivo é só registro.

## Fluxo
Gatilhos no banco → `public.send_email_event()` (pg_net) → Edge Function `send-notification` → API do Resend.
A função só aceita chamadas com o cabeçalho `x-webhook-secret` igual ao segredo guardado no Vault (`email_webhook_secret`).

## Eventos
| Evento | Gatilho | Destinatário |
|---|---|---|
| Novo contato do site | INSERT em `quote_requests` | despachantepastorinterno@gmail.com e desp.pastor@gmail.com |
| Formulário de visto enviado | `visa_applications.status` → `submitted` | equipe |
| Cliente respondeu pedido de informação | `visa_info_requests` → `answered` | equipe |
| Questionário recebido | `status` → `submitted` | cliente (único e-mail ao cliente: avisa que o atendimento será exclusivamente via WhatsApp, sem link) |

Em análise, pedido de informações e concluído **não enviam mais e-mail ao cliente** (a Edge Function ignora `client_status` e `client_info_request`); o contato segue pelo WhatsApp. O aviso no sino da Área do cliente continua.

## Configuração
- Segredo da função: `RESEND_API_KEY` (Supabase → Edge Functions → Secrets). Use uma chave do Resend com permissão "Sending access" para o domínio despachantepastor.com.br.
- Opcionais: `RESEND_FROM` (padrão `Despachante Pastor <atendimento@despachantepastor.com.br>`) e `RESEND_REPLY_TO` (padrão desp.pastor@gmail.com).
- Domínio no Resend: DKIM e SPF verificados; o registro MX de recebimento não é necessário para enviar.

## Kanban de contatos (/interno)
- Tabela `lead_stages` (colunas do quadro: nome, cor, posição) e, em `quote_requests`, os campos `stage_id`, `position` e `notes`.
- Gatilho `assign_new_lead_stage`: todo lead novo entra na primeira coluna, no topo, e ignora `stage_id`/`position`/`notes` enviados pelo formulário público.
- O e-mail de "novo contato" continua disparado pelo gatilho `email_on_lead_created_trigger`.
- Ações da API interna: `create_stage`, `update_stage`, `reorder_stages`, `delete_stage` (move os cartões para a primeira coluna restante), `move_quote`, `update_quote_notes`, `delete_quote`.
