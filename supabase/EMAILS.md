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
| Em análise | `status` → `in_review` (após envio) | cliente |
| Pedido de informações adicionais | INSERT em `visa_info_requests` | cliente (com a mensagem do despachante) |
| Concluído | `status` → `completed` (após envio) | cliente |

## Configuração
- Segredo da função: `RESEND_API_KEY` (Supabase → Edge Functions → Secrets). Use uma chave do Resend com permissão "Sending access" para o domínio despachantepastor.com.br.
- Opcionais: `RESEND_FROM` (padrão `Despachante Pastor <atendimento@despachantepastor.com.br>`) e `RESEND_REPLY_TO` (padrão desp.pastor@gmail.com).
- Domínio no Resend: DKIM e SPF verificados; o registro MX de recebimento não é necessário para enviar.
