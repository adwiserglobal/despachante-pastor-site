# Despachante Pastor — Site Institucional

Site institucional premium e responsivo criado para o Despachante Pastor.

## Identidade visual

- Azul-marinho como cor principal
- Dourado como cor de destaque
- Branco e tons neutros para contraste
- Tipografia: Manrope + Inter
- Layout responsivo para desktop, tablet e celular

## Estrutura

- Hero institucional
- Serviços
- Diferenciais
- Como funciona
- CTA institucional
- Área de contato
- Menu mobile
- Animações leves de entrada
- SEO básico e metatags sociais

## Configuração antes de publicar

No `index.html`, substitua o endereço de e-mail de atendimento pelo e-mail real da empresa.

No botão de WhatsApp, defina o número no atributo `data-whatsapp` usando DDI + DDD + número, sem espaços ou símbolos. Exemplo:

```html
data-whatsapp="5511999999999"
```

Enquanto o número estiver vazio, o botão de WhatsApp fica oculto automaticamente.

## Publicação

O projeto é estático e pode ser publicado diretamente na Vercel, Netlify, Cloudflare Pages ou GitHub Pages, sem etapa de build.


## SEO e GEO

- **Domínio:** as URLs canônicas, `sitemap.xml`, `robots.txt`, `llms.txt` e os dados estruturados (JSON-LD) usam `https://www.despachantepastor.com.br`. Se o domínio mudar, troque essa URL em `index.html`, `vistos.html`, `privacidade.html`, `sitemap.xml`, `robots.txt` e `llms.txt`.
- **Dados estruturados:** `LocalBusiness`/`ProfessionalService` e `FAQPage` na home; `Service` e `BreadcrumbList` em `/vistos`. Mantenha endereço, telefone e perguntas frequentes sempre iguais ao conteúdo visível da página.
- **Páginas privadas** (`/login`, `/portal`, formulário de visto, `/interno`, `/redefinir-senha`) têm `noindex` e estão bloqueadas no `robots.txt`.
- **Google Business Profile:** mantenha nome, endereço, telefone e site idênticos aos do site (NAP) para fortalecer a busca local.
