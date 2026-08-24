# MTK DIGITAL AI — MVP conectado ao Supabase

Versão 0.2 do MVP com autenticação real, sessão SSR, onboarding persistente e dashboard conectado ao banco Supabase.

## O que já funciona

- Cadastro com e-mail e senha via Supabase Auth
- Login e logout
- Sessão protegida via `proxy.ts`
- Perfil criado automaticamente ao cadastrar usuário
- Onboarding da empresa
- Organização criada automaticamente
- Trial de 7 dias + 100 créditos ao criar organização
- Empresa + MTK Brain/DNA persistidos no Supabase
- Dashboard lendo empresa, MTK Score, créditos, conteúdos e campanhas reais
- MTK AI usando o contexto salvo da empresa
- Posts gerados são salvos na Biblioteca
- Campanhas geradas são salvas em Campanhas
- RLS e Storage já configurados no projeto Supabase

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Preencha `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave publishable do projeto Supabase.
3. Adicione `OPENAI_API_KEY`.
4. Para custo controlado no MVP, o padrão sugerido é `OPENAI_MODEL=gpt-5.6-luna`.
5. Instale e execute:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000/cadastro`.

## Variáveis

```env
NEXT_PUBLIC_SUPABASE_URL=https://utayahhwdojgipgctqgd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Importante para produção

No Supabase Auth, configure a URL do site e as URLs de redirect para o domínio final da Vercel. No deploy, cadastre as mesmas variáveis de ambiente na Vercel. Não coloque `OPENAI_API_KEY` em variáveis `NEXT_PUBLIC_*`.
