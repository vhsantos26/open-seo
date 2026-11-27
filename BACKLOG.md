# Backlog

## Pending

- [ ] Sincronizar o branch local `seo-os-fase-0-setup` com `origin/main` (ficou ~190 commits atrasado após o merge upstream de 01/10) — decidir: rebase/merge, ou abrir branch novo a partir de main (descoberto 2026-10-02)
- [ ] Confirmar se o app OAuth do Google (GSC) foi publicado (saiu de "Testing") — se não, o refresh token volta a expirar a cada 7 dias; há evidência de reconexão recente nos logs (descoberto 2026-10-02)
- [ ] Configurar `CONTEXT_API_KEY` (Context.dev): decidido usar o free tier (US$0/mês, sem cartão, 1.000 créditos/mês, 1 req. concorrente — confirmado em context.dev/pricing 2026-10-02). Falta o Victor criar a conta e passar a key.
- [ ] Top-up de US$50 no DataForSEO para sair do bloqueio "verify your account" (status 40104) — pendente desde a Fase 0
- [ ] Limpeza periódica de imagens/build cache Docker na VPS (9.7GB imagens + 2.3GB cache reclamável) — não urgente, sem automação hoje (descoberto 2026-10-02)
- [ ] Investigar o check "upload" que falhou no CI do merge do PR #1 (não bloqueante, causa não investigada) (descoberto 2026-10-02)
- [ ] Quando o PR QualiCodeHQ/dois-rios#2492 (landing go-live: SSG, +`/termos` +`/privacidade`, og:image corrigido) for deployado: rodar site audit (esperar 3 URLs no sitemap), validar o checklist técnico deles (301 www, noindex, 404, JSON-LD) e cadastrar as novas Key Pages no OpenSEO. Prioridade alta: PR pulou staging, nunca rodou lá.
- [ ] Seção de blog/artigos do doisrios.com ainda não existe (PR #2492 resolve só landing+legal) — segue bloqueando os briefs do `CONTENT_PLAN_DOISRIOS.md`

## Deferred Decisions

- Onde a "nova página" do doisrios.com vai morar (blog? subdomínio?) — aguardando o Victor decidir antes de produzir o rascunho do Brief 1 do plano de conteúdo (`.context/product/CONTENT_PLAN_DOISRIOS.md`)
- Fases A-E do `.context/product/OPENSEO_AUTOMATION_PLAN.md` — pausadas para esta sessão de validação pós-merge; Fase D (guardrails de budget) parcialmente coberta pelo upstream agora, revisar o que ainda falta

## Done (recent)

- [x] Validado merge upstream de ~190 commits (v0.1.7→v0.1.10) na VPS: CI verde, imagem rebuildada pelo nosso pipeline próprio, container healthy — 2026-10-02
