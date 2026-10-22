# FireUtils.admin

Painel de administração do **Fire Utils** (plugin de proteção contra incêndio para Revit). App React + Vite, publicado no Vercel, usado só pelo administrador.

Seções: **Usuários** (e licenças), **Versões** (versionamento e patch notes) e **Biblioteca** (famílias do Revit).

> Estado atual: **Fase 0** (base, login, guarda de admin) e **Fase 1** (usuários, licenças, auditoria) prontas. Versões e Biblioteca ainda são placeholders.

## Backend necessário (repositório `ETOS.FireUtils`)

O painel depende de migrações e de uma Edge Function que ficam no repositório do site:

- `20261020120000_admin_base.sql`: `admins`, `is_admin()`, `admin_auditoria`, políticas de admin em `licencas`/`perfis`, trigger de auditoria de licenças.
- `20261020130000_admin_usuarios_rpc.sql`: `admin_listar_usuarios` e `admin_resumo_licencas`.
- Edge Function `admin-usuarios`: convidar, link de redefinição, banir/desbanir, excluir.

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
