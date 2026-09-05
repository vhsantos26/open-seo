# Handoff para a próxima sessão

## Leia primeiro

1. `AGENTS.md` — regras de engenharia do upstream;
2. `docs/product/SEO_OS_CONTEXT.md` — visão, decisões, custos e roadmap;
3. `docs/SELF_HOSTING_DOCKER.md` — comportamento oficial do Docker;
4. `docs/DATAFORSEO_API_KEY.md` — configuração da fonte paga.

## Estado atual

- fork remoto: `https://github.com/vhsantos26/open-seo`;
- clone principal: `/Users/hugo/Developer/open-seo`;
- `origin` aponta para o fork;
- `upstream` aponta para `every-app/open-seo`;
- `main` é a branch de integração;
- `production` é a branch planejada para deploy na VPS;
- nenhuma credencial deve ser adicionada ao Git.

## Próximo trabalho recomendado

Executar a Fase 0, nesta ordem:

1. instalar dependências e rodar checks do upstream;
2. subir o OpenSEO local com DataForSEO Sandbox ou credenciais de teste;
3. documentar o inventário técnico da VPS sem registrar segredos;
4. validar consumo de memória no build e em repouso;
5. validar site audit, Workflow e `scheduled()` em Docker;
6. validar MCP com Hermes;
7. preparar compose de produção, healthcheck, backup e rollback;
8. criar workflow de imagem Docker para a branch `production`;
9. somente então fazer o primeiro deploy da VPS.

## Prompt sugerido

> Leia `AGENTS.md`, `docs/product/SEO_OS_CONTEXT.md` e
> `docs/product/NEXT_SESSION.md`. Estamos construindo um SEO Operating System
> self-hosted sobre este fork. Comece pela Fase 0 e preserve compatibilidade
> com o upstream. Não use credenciais reais nem faça deploy na VPS sem revisar
> comigo os alvos e segredos.
