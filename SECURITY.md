# Segurança e dados pessoais (PII)

## O que o código já faz
- Documentos (passaporte, visto) ficam no bucket **privado** `visa-documents` do Supabase e só são abertos por **URL assinada de curta duração** (60 s para o cliente, 90 s para a equipe).
- A equipe acessa documentos apenas pela API `/api/internal`, que valida o login Firebase, confere a lista de e-mails autorizados, usa a chave `service_role` só no servidor e **registra auditoria** de cada visualização.
- Upload: apenas JPG/PNG/WebP/PDF até 10 MB, com conferência da assinatura real do arquivo e nome aleatório (o nome original pode conter dados pessoais).
- Páginas da área do cliente e do formulário são servidas com `Cache-Control: no-store`, `noindex`, `X-Frame-Options: DENY` e Content-Security-Policy restritiva. Todo o site usa HSTS.
- Em trânsito, tudo trafega por HTTPS/TLS. Em repouso, banco e storage do Supabase são criptografados (AES-256) pelo provedor.

## O que precisa ser conferido no painel do Supabase (não é visível no repositório)
1. **Storage → `visa-documents` → Public bucket: desligado.**
2. **RLS ligado** em `visa_applications` e nas demais tabelas com dados pessoais. Cada cliente só pode `select/insert/update` linhas com `user_id = auth.uid()`; nenhuma política para `anon`.
3. Política do bucket: o cliente só lê/grava em `visa-documents/<auth.uid()>/...` e **não pode listar** pastas de outros usuários, por exemplo:
   ```sql
   create policy "own folder insert" on storage.objects for insert to authenticated
     with check (bucket_id = 'visa-documents' and (storage.foldername(name))[1] = auth.uid()::text);
   create policy "own folder read" on storage.objects for select to authenticated
     using (bucket_id = 'visa-documents' and (storage.foldername(name))[1] = auth.uid()::text);
   ```
4. No bucket, defina tipos MIME permitidos e limite de 10 MB também no servidor (o limite do navegador não é barreira de segurança).
5. Ative backups com criptografia e MFA para todos os administradores do Supabase, Firebase e Vercel. Mantenha `SUPABASE_SERVICE_ROLE_KEY` e a chave Firebase apenas nas variáveis de ambiente da Vercel.

## Criptografia em nível de campo (opcional)
Para proteger CPF, passaporte e SSN mesmo de quem tem acesso ao banco, seria necessário criptografar no servidor com chave própria (KMS / `pgsodium` / Supabase Vault). Isso muda o fluxo de gravação e de leitura da equipe e deve ser planejado à parte.
