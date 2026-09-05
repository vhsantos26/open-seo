# Contexto do produto — SEO Operating System

Atualizado em 5 de setembro de 2026.

Este é o documento-mestre para preservar as decisões do fork entre sessões,
workspaces e agentes. Não registrar credenciais, tokens ou conteúdo privado
integral neste arquivo.

## Objetivo

Transformar o OpenSEO em uma plataforma própria e evolutiva, executada na VPS
já existente, para cadastrar empresas e domínios, coletar dados de SEO,
priorizar oportunidades, acompanhar mudanças e conduzir ações até validação.

O primeiro projeto piloto é o **Dois Rios**:

- site principal: `https://doisrios.com/`;
- aplicação: `https://app.doisrios.com/`;
- mercado: Brasil;
- idioma: português do Brasil.

A VPS já executa **Hermes** e **Securo**. A implantação não pode degradar esses
serviços. Hermes será a camada principal de agente/orquestração e consumirá a
plataforma por MCP dentro da rede privada.

## Decisão principal

Manter um fork próprio do OpenSEO e gerar uma imagem Docker própria.

```text
every-app/open-seo (upstream)
          |
          v
vhsantos26/open-seo (nosso fork)
          |
          v
imagem Docker versionada
          |
          v
VPS: nossa plataforma + Hermes + Securo
```

Não reescrever capacidades que o upstream já oferece. O primeiro build deve
ficar funcionalmente próximo do upstream; as extensões entram depois em
módulos isolados para facilitar atualizações.

### Estratégia de Git

- `upstream`: `https://github.com/every-app/open-seo.git`;
- `origin`: `https://github.com/vhsantos26/open-seo.git`;
- `main`: integração estável do produto e base para novos workspaces;
- `production`: branch de deploy da VPS;
- mudanças entram em branches curtas e PRs para `main`;
- promoção para a VPS ocorre por PR de `main` para `production`;
- nunca fazer desenvolvimento diretamente em `production`;
- imagens são publicadas com versão e digest; não usar `latest` em produção;
- sincronizar `upstream/main` primeiro numa branch de integração e executar a
  suíte completa antes de incorporar em `main`.

## Experiência desejada

O fluxo principal da plataforma será:

1. cadastrar empresa, marca e produto;
2. cadastrar domínio principal e superfícies adicionais;
3. indicar mercado, idioma, público, objetivos e proposta de valor;
4. classificar cada superfície como pública/indexável ou privada;
5. cadastrar concorrentes e páginas prioritárias;
6. conectar GSC, GA4 e, posteriormente, GitHub/CMS;
7. mostrar estimativa e pedir aprovação do gasto inicial;
8. executar baseline assíncrono;
9. apresentar dados, findings, oportunidades e ações no dashboard;
10. repetir rotinas controladas e comparar resultados ao longo do tempo.

### Modelo de domínio pretendido

```text
company 1 ── N site/project 1 ── N connection
   |              |
   |              +── crawl, keywords, rankings, GSC, GA4
   |
   +── negócio, marca, produtos, público, claims e regras editoriais
```

No piloto, `Project` + `Project Context` do OpenSEO podem representar a
empresa e seu domínio. A primeira evolução relevante de schema deve introduzir
`company` acima de `project`, preservando compatibilidade com os registros do
upstream.

## O que já existe, o que é configuração e o que construiremos

| Capacidade                        | Situação                        | Ação                                 |
| --------------------------------- | ------------------------------- | ------------------------------------ |
| Projetos/domínios                 | Já existe                       | Usar no piloto                       |
| Contexto de negócio               | Já existe em Project Context    | Configurar e ampliar depois          |
| Concorrentes e key pages          | Já existe                       | Preencher                            |
| Research log                      | Já existe                       | Usar para evitar pesquisas repetidas |
| Keywords salvas, tags e métricas  | Já existe                       | Usar                                 |
| Keyword research                  | Já existe via DataForSEO        | Configurar chave e budgets           |
| GSC                               | Já existe e não usa créditos    | Configurar OAuth                     |
| GA4                               | Já existe                       | Opcional no piloto                   |
| Rank tracking                     | Já existe, inclusive agendado   | Configurar e validar cron Docker     |
| Site audit                        | Já existe, com crawler próprio  | Reutilizar                           |
| Lighthouse                        | Já existe via DataForSEO        | Controlar frequência                 |
| Backlinks                         | Já existe via DataForSEO        | Usar com moderação                   |
| SAM/Agent Skills/MCP              | Já existe                       | Preferir Hermes via MCP no piloto    |
| AI Visibility                     | Já existe                       | Não reconstruir no MVP               |
| Cadastro separado de empresa      | Não existe como modelo desejado | Construir                            |
| Finding → Evidence → Action       | Não existe completo             | Construir                            |
| SEO Inbox e approvals             | Não existe completo             | Construir                            |
| Finding → GitHub → PR → validação | Não existe                      | Construir depois do MVP              |
| Grafo editorial e canibalização   | Parcial                         | Construir depois do MVP              |

## Keywords e custos

Existem duas coisas diferentes:

1. o banco externo do DataForSEO, consultado pela API e cobrado por uso;
2. a lista local de keywords, métricas e tags salva no banco da plataforma.

Salvar, organizar e visualizar uma keyword local não custa. A cobrança ocorre
quando a plataforma consulta ou atualiza dados externos, por exemplo:

- descobrir sugestões e termos relacionados;
- obter volume, dificuldade, intenção e CPC;
- consultar a SERP atual;
- atualizar posições;
- pesquisar keywords de concorrentes;
- consultar backlinks.

GSC deve ser consultado primeiro: mostra gratuitamente queries pelas quais o
site já recebe impressões ou cliques. DataForSEO entra para descoberta e dados
de mercado que o GSC não fornece.

### Preços de referência em 05/09/2026

- DataForSEO Labs, maioria dos endpoints Google: US$ 0,012 por task +
  US$ 0,00012 por item;
- SERP Google Standard: US$ 0,0006 por 10 resultados;
- SERP Google Live: US$ 0,002 por 10 resultados;
- Backlinks: US$ 0,024 por request + US$ 0,000036 por linha;
- Lighthouse: US$ 0,005 por página/dispositivo;
- parâmetro clickstream do Labs: multiplica a chamada por 2;
- recarga mínima do DataForSEO: US$ 50, sem mensalidade;
- PTAX de referência de 04/09/2026: US$ 1 = R$ 5,1253.

Exemplo de Keyword Ideas:

| Itens retornados | Custo aproximado |
| ---------------: | ---------------: |
|               10 |       US$ 0,0132 |
|              100 |        US$ 0,024 |
|              500 |        US$ 0,072 |
|            1.000 |        US$ 0,132 |

O modo automático do OpenSEO pode tentar mais de uma fonte (`related`,
`suggestions`, `ideas`) se a primeira não trouxer cobertura suficiente. Uma
pesquisa pode, portanto, gerar de uma a três tasks. Resultados de pesquisa
idêntica ficam em cache por 24 horas; keywords salvas e suas últimas métricas
permanecem no banco até atualização explícita.

### Configuração inicial de custos

```text
Saldo inicial DataForSEO:  US$ 50
Budget lógico mensal:      US$ 15
Limite por operação:       US$ 0,50
Keywords acompanhadas:     100
Frequência:                 semanal
Dispositivo:                desktop
Profundidade:               top 50
Clickstream:                desligado
Recarga automática:         desligada
SAM:                        desligado no primeiro piloto
```

Estimativa do piloto: US$ 5–10/mês para dados e US$ 0–20/mês de IA, dependendo
de o Hermes absorver o uso no orçamento já existente. A recarga de US$ 50 é
saldo antecipado, não mensalidade.

### Guardrails obrigatórios

- mostrar estimativa antes de chamadas pagas;
- registrar o custo real retornado pelo provider;
- budget por empresa, job e mês;
- aprovação acima de US$ 0,50 por execução;
- alertas em 50%, 80% e 100%;
- interromper jobs pagos ao atingir o limite;
- manter GSC e verificações gratuitas funcionando;
- cache e research log antes de nova pesquisa;
- sem fan-out pago livre pelo agente;
- fila normal para rotinas; Live apenas quando a interação exigir;
- clickstream e AI Visibility em massa desligados por padrão.

## Arquitetura operacional

```text
Internet
   |
Cloudflare Access ou gate equivalente
   |
reverse proxy
   |
plataforma (fork do OpenSEO; porta somente em loopback)
   |
rede privada Docker
   +── MCP <──> Hermes
   +── worker opcional para jobs/filas
   +── GitHub adapter futuro

volume/banco:
projetos, contexto, keywords, auditorias, tokens GSC,
findings, evidências, ações, aprovações, execuções e budgets
```

### Riscos operacionais conhecidos

- Docker usa `AUTH_MODE=local_noauth`; nunca expor o container diretamente;
- self-host é um workspace compartilhado, sem RBAC granular por projeto;
- o build configura heap Node de 4 GB; medir recursos antes de coexistir com
  Hermes e Securo;
- provar o disparo do handler `scheduled()` no runtime Docker; se necessário,
  usar cron do host chamando somente o endpoint local;
- OAuth Google External/Testing normalmente emite refresh token que expira em
  sete dias; preparar consentimento Production ou política Workspace trusted;
- fixar e guardar `BETTER_AUTH_SECRET`, pois protege tokens GSC;
- fazer backup consistente do volume `.wrangler` e testar restore;
- comparar antes/depois não prova causalidade: registrar deploys, janelas e
  fatores externos.

## Roadmap

### Fase 0 — Fork, build e spike técnico (3–5 dias)

- fork e remotes configurados;
- dependências e testes locais;
- imagem própria versionada;
- inventário de CPU, RAM, disco, proxy, redes e backup da VPS;
- OpenSEO em ambiente de teste;
- DataForSEO Sandbox;
- validação do MCP com Hermes;
- validação de Workflow, Durable Objects e scheduled handler no Docker;
- conexão GSC e teste de renovação;
- backup e restore comprovados.

### Fase 1 — Piloto Dois Rios (5–7 dias + duas semanas de observação)

- preencher projeto e contexto;
- conectar GSC;
- baseline técnico de até 500 páginas, ajustado ao site;
- pesquisa inicial de 5–10 seeds;
- 100 keywords, desktop, top 50, semanal;
- 3–5 concorrentes;
- relatório semanal pelo Hermes com evidências;
- nenhuma escrita automática no site ou repositório.

Gate: reencontrar pelo menos 80% dos problemas críticos/altos já conhecidos e
detectáveis por crawl, zero métricas inventadas, custos registrados e revisão
humana do relatório em até 15 minutos.

### Fase 2 — Produto próprio / SEO Inbox (2–3 semanas)

- wizard integrado de empresa e domínio;
- runs, findings, evidence, opportunities, recommendations e actions;
- fingerprint e deduplicação;
- jobs idempotentes;
- budgets;
- approve/skip/modify na UI e no Hermes;
- deploy annotations e validação posterior.

### Fase 3 — SEO Engineering (2–4 semanas)

- GitHub inicialmente read-only;
- correlacionar finding de produção e arquivos;
- plano de remediação;
- criação de issue aprovada;
- implementação por agente somente após nova aprovação;
- CI e post-deploy validation.

Começar por canonical/noindex, sitemap/robots e metadata/JSON-LD.

### Fase 4 — Conteúdo e concorrência (3–5 semanas)

- grafo hub/spoke/money;
- keyword-to-page mapping;
- sinais de canibalização;
- briefs com claims e fontes permitidas;
- mudanças de concorrentes;
- teste com 3–5 páginas antes de escalar.

## Modelo mínimo da camada própria

| Entidade         | Campos mínimos                                             |
| ---------------- | ---------------------------------------------------------- |
| `run`            | projeto, tipo, início/fim, versão, custo e status          |
| `finding`        | categoria, severidade, confiança, escopo e fingerprint     |
| `evidence`       | fonte, timestamp, resumo, referência ao bruto e validade   |
| `opportunity`    | impacto, esforço, confiança e dependências                 |
| `recommendation` | racional, alternativas, riscos e definição de pronto       |
| `action`         | tipo, responsável, status, aprovação e issue/PR/publicação |
| `validation`     | baseline, janela, resultado, regressão e conclusão         |

Dados brutos e inferências devem permanecer separados. Publicação, merge e
mudanças destrutivas sempre exigem aprovação humana.

## Fontes

- OpenSEO: https://github.com/every-app/open-seo
- Self-host Docker: https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md
- DataForSEO Labs: https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api
- DataForSEO SERP: https://dataforseo.com/pricing/serp/google-organic-serp-api
- DataForSEO Backlinks: https://dataforseo.com/pricing/backlinks/backlinks
- DataForSEO Lighthouse: https://dataforseo.com/pricing/on-page/lighthouse-api
- GSC pricing: https://developers.google.com/webmaster-tools/pricing
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- OpenRouter fees: https://openrouter.ai/docs/faq
- PTAX: https://ptax.bcb.gov.br/ptax_internet/consultarTodasAsMoedas.do?method=consultaTodasMoedas
