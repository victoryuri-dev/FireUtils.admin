# FireUtils.admin

Painel de administração do **Fire Utils** (plugin de proteção contra incêndio para Revit). App React + Vite, publicado no Vercel, usado só pelo administrador.

Seções: **Usuários** (e licenças), **Versões** (versionamento e patch notes) e **Biblioteca** (famílias do Revit).

> Estado atual: **Fase 0** (base, login, guarda de admin) e **Fase 1** (usuários, licenças, auditoria) e **Fase 2** (versões) e **Fase 3** (biblioteca de famílias) prontas.

## Backend necessário (repositório `ETOS.FireUtils`)

O painel depende de migrações e de uma Edge Function que ficam no repositório do site:

- `20261020120000_admin_base.sql`: `admins`, `is_admin()`, `admin_auditoria`, políticas de admin em `licencas`/`perfis`, trigger de auditoria de licenças.
- `20261020130000_admin_usuarios_rpc.sql`: `admin_listar_usuarios` e `admin_resumo_licencas`.
- `20261020140000_plugin_releases.sql`: tabela `plugin_releases`, políticas do bucket `plugin-releases` e backfill dos arquivos que já estão lá.
- `20261020150000_catalogo.sql`: tabelas `catalogo_categorias`, `catalogo_familias`, `catalogo_config` e políticas de admin nos buckets `revit-families` e `plugin-assets` (`icons/`, `thumbnails/`).
- Edge Function `admin-usuarios`: convidar, link de redefinição, banir/desbanir, excluir.
- Edge Function `admin-catalogo`: conferir fantasmas e órfãos, publicar o `catalog.json`, importar e remover órfãos.

Sem elas aplicadas, o login cai em "Sem permissão".

## Rodando

```bash
cp .env.example .env   # preencha VITE_SUPABASE_ANON_KEY
npm install
npm run dev
npm test
npm run build
```

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase compartilhado |
| `VITE_SUPABASE_ANON_KEY` | **Somente a anon key** |

## Segurança

- Nunca coloque `service_role`, chave privada de licença ou de assinatura de pacotes no navegador, no repositório ou em `VITE_*`.
- Quem é admin vem da tabela `admins` + `public.is_admin()` (`security definer`), usada nas políticas RLS e nas Edge Functions. O front-end só consulta `is_admin()` para decidir o que exibir.
- Contas sem permissão veem "Sem permissão" e são deslogadas.
- Operações privilegiadas (usuários do Auth) ficam em Edge Functions que verificam `is_admin()` e gravam em `admin_auditoria`.

## Deploy (Vercel)

Framework Vite; defina as duas variáveis acima. `vercel.json` já faz o rewrite de SPA.

## Estrutura

```
src/pages/{Login,Usuarios,Versoes,Biblioteca}
src/components   Layout, Sidebar, Protegida, ConfirmaDigitando
src/lib          cliente Supabase, auth, helpers puros
test/            node --test
```

As migrações e Edge Functions do Supabase ficam no repositório do site (`ETOS.FireUtils`).

## Publicar uma versão

1. **Instalador:** gere o `FireUtils-Setup-X.Y.Z.exe` (build.ps1). O painel calcula o SHA-256 no navegador e sobe o `.sha256` sozinho.
2. **Pacote (só código Python):** no seu computador, rode `installer/publicar-pacote.ps1` (repositório `FireUtils.extension`). Ele assina o `.zip` com a chave RSA privada e gera o `.sig`. **A chave privada nunca vai para o painel**, que só recebe o `.zip` e o `.sig` prontos. O nome deve ser `FireUtils-Pacote-X.Y.Z-base-B.zip`, onde `B` é a menor versão de instalador que aceita o pacote.
3. Em **Versões → Nova versão**, escolha o tipo, arraste o(s) arquivo(s), confira versão/base, escreva as notas e salve como **rascunho**.
4. Abra o rascunho e clique em **Publicar**. O painel confere que os arquivos estão no bucket; só então a versão fica visível para os clientes. É possível **despublicar** depois; só rascunho pode ser excluído.

O upload passa pelo Storage do Supabase, então o limite de tamanho do projeto/bucket precisa comportar o instalador.

## Biblioteca de famílias

As tabelas do catálogo são o **rascunho**. O que a dockpane lê continua sendo o `plugin-assets/catalog.json`, gerado pela Edge Function `admin-catalogo` só quando tudo confere.

- **Catálogo:** categorias e famílias com miniatura, tamanho e selos de problema; criar, editar, substituir o `.rfa` ou a miniatura, mover de categoria, reordenar e excluir. O SHA-256 e o tamanho do `.rfa` são calculados no navegador.
- **Arquivos:** tudo o que existe nos buckets (`revit-families`, `icons/` e `thumbnails/`), classificado como *Em uso*, *Só no publicado* ou *Órfão*, e o que cada item usa.
- **Publicação:** o que mudou desde a última publicação, os problemas e os botões Publicar, Importar o catálogo publicado e Remover órfãos.

**Item fantasma** = o catálogo cita um arquivo que não existe no bucket (ou o tamanho do `.rfa` não bate). Isso **bloqueia a publicação**. **Órfão** = arquivo no bucket que nenhum item cita; só é removido pelo painel se nem o catálogo publicado o usa.

Substituir o `.rfa` de uma família nunca sobrescreve o arquivo antigo: o novo vai para uma chave com o hash (`<categoria>/<slug>-<hash8>.rfa`), e o antigo vira órfão depois de publicar. Assim a dockpane não baixa um arquivo cujo hash não bate com o catálogo publicado.

Primeira vez: em **Publicação → Importar catálogo publicado** para trazer o catálogo atual para as tabelas.
