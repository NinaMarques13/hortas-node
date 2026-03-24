# Hortas Marketplace

Plataforma web para produtores urbanos cadastrarem suas hortas, gerenciarem estoques de produtos e se conectarem com outros produtores.

## Tecnologias

- **Backend**: Node.js, Express, MySQL, JWT (jsonwebtoken), bcryptjs
- **Frontend**: HTML, CSS, JavaScript (SPA vanilla, sem frameworks)
- **Banco de dados**: MySQL 8+

## Estrutura do Projeto

```
node-api/
  src/
    server.js             # Entrada da aplicacao, monta rotas e middlewares
    db.js                 # Pool de conexoes MySQL
    migrate.js            # Criacao das tabelas no banco
    seed.js               # Popula o catalogo de produtos (111 itens)
    seed-dados.js         # Cria produtores, hortas e estoques de exemplo
    middlewares/
      validadorJwt.js     # Middleware de validacao do token JWT
    routes/
      auth.routes.js      # Registro, login, perfil, recuperacao de senha
      hortas.routes.js    # CRUD de hortas com verificacao de propriedade
      estoques.routes.js  # CRUD de estoque vinculado a hortas
      produtos.routes.js  # Listagem do catalogo de produtos
  public/
    index.html            # Shell do SPA
    css/styles.css        # Design system completo (dark theme)
    js/
      auth.js             # Gerenciamento de token e sessao (localStorage)
      api.js              # Cliente HTTP com injecao automatica de JWT
      router.js           # Roteador SPA baseado em hash
      app.js              # Inicializacao, sidebar, toasts
      pages/
        login.js           # Tela de login
        register.js        # Cadastro de produtor
        forgot-password.js # Recuperacao de senha por perguntas de seguranca
        dashboard.js       # Painel com cards de todas as hortas
        hortas-manage.js   # CRUD de hortas do produtor logado
        estoque-manage.js  # CRUD de estoque por horta
        profile.js         # Perfil com dados de contato e privacidade
```

## Banco de Dados

Tabelas principais:

- **produtor** - Dados do produtor (nome, CPF, email, senha hash, chave PIX, endereco, configuracoes de privacidade)
- **seguranca_produtor** - Perguntas e respostas de seguranca (hash) vinculadas ao produtor
- **hortas** - Hortas cadastradas, vinculadas a um produtor e a um endereco
- **endereco_hortas** - Endereco completo da horta (rua, bairro, cidade, estado, CEP)
- **produtos** - Catalogo fixo de 111 produtos (hortalicas, frutas, ervas)
- **estoques** - Lotes de estoque vinculando produto a horta, com quantidade e datas

## Instalacao

### Requisitos

- Node.js 18+
- MySQL 8+

### Passos

1. Clone o repositorio e entre na pasta do projeto:

```bash
cd node-api
```

2. Instale as dependencias:

```bash
npm install
```

3. Configure o arquivo `.env` na raiz de `node-api/`:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hortas_db
DB_USER=root
DB_PASS=root
JWT_SECRET_KEY=sua_chave_secreta
PORT=8000
```

4. Crie o banco de dados:

```sql
CREATE DATABASE hortas_db;
```

5. Execute as migracoes e o seeder de produtos:

```bash
npm run setup
```

6. (Opcional) Popule com dados de exemplo (5 produtores com hortas e estoques):

```bash
npm run seed:dados
```

7. Inicie o servidor:

```bash
npm run dev
```

Acesse `http://localhost:8000`.

## Scripts Disponiveis

| Comando            | Descricao                                     |
|--------------------|-----------------------------------------------|
| `npm start`        | Inicia o servidor em producao                 |
| `npm run dev`      | Inicia com hot-reload (node --watch)          |
| `npm run migrate`  | Cria as tabelas no banco                      |
| `npm run seed`     | Popula o catalogo de produtos                 |
| `npm run seed:dados`| Cria produtores, hortas e estoques de exemplo |
| `npm run setup`    | Executa migrate + seed em sequencia           |

## Rotas da API

### Autenticacao

| Metodo | Rota                    | Descricao                          | Auth |
|--------|-------------------------|------------------------------------|------|
| POST   | /api/auth/register      | Cadastro de produtor               | Nao  |
| POST   | /api/auth/login         | Login (retorna JWT)                | Nao  |
| POST   | /api/auth/forgot-password| Redefinir senha por perguntas      | Nao  |
| GET    | /api/auth/me            | Dados do produtor logado           | Sim  |
| PUT    | /api/auth/profile       | Atualizar perfil e privacidade     | Sim  |

### Hortas

| Metodo | Rota                    | Descricao                          | Auth |
|--------|-------------------------|------------------------------------|------|
| GET    | /api/hortas             | Listar hortas visiveis             | Nao  |
| GET    | /api/hortas/:id         | Detalhes de uma horta              | Nao  |
| POST   | /api/hortas             | Cadastrar nova horta               | Sim  |
| PUT    | /api/hortas/:id         | Editar horta (somente dono)        | Sim  |
| DELETE | /api/hortas/:id         | Excluir horta (somente dono)       | Sim  |

### Estoques

| Metodo | Rota                    | Descricao                          | Auth |
|--------|-------------------------|------------------------------------|------|
| GET    | /api/estoques/horta/:id | Listar estoque de uma horta        | Nao  |
| POST   | /api/estoques           | Adicionar lote (somente dono)      | Sim  |
| DELETE | /api/estoques/:id       | Remover lote                       | Sim  |

### Produtos

| Metodo | Rota                    | Descricao                          | Auth |
|--------|-------------------------|------------------------------------|------|
| GET    | /api/produtos           | Listar catalogo de produtos        | Nao  |

## Arquitetura

### Backend

O servidor Express serve arquivos estaticos da pasta `public/` e expoe a API REST em `/api`. Todas as rotas protegidas exigem um token JWT enviado no header `Authorization: Bearer <token>`. O middleware `validadorJwt` intercepta as requisicoes e injeta os dados do usuario em `req.usuario`.

As rotas de escrita (PUT, DELETE) em hortas e estoques verificam que o produtor autenticado e o dono do recurso antes de permitir a operacao. Isso impede que um produtor edite ou exclua dados de outro.

### Frontend

O frontend e um SPA (Single Page Application) construido com JavaScript vanilla. A navegacao usa rotas baseadas em hash (`#/login`, `#/dashboard`, etc). O roteador suporta parametros de URL (`#/hortas/estoque/:id`) e guards de autenticacao que redirecionam para o login quando necessario.

O token JWT e armazenado em `localStorage` e automaticamente injetado em todas as requisicoes pelo modulo `api.js`. Respostas 401 redirecionam automaticamente para a tela de login.

### Fluxo de Uso

1. O produtor acessa a aplicacao e cria uma conta informando nome, CPF, email, senha e perguntas de seguranca.
2. Apos o login, o produtor e redirecionado ao dashboard, que exibe cards com todas as hortas visiveis no marketplace.
3. Na secao "Minhas Hortas", o produtor pode cadastrar novas hortas com endereco completo, CNPJ e descricao.
4. Dentro de cada horta propria, o produtor gerencia o estoque adicionando ou removendo lotes de produtos do catalogo, com datas de plantio, colheita e validade.
5. Ao visitar a horta de outro produtor, a visualizacao e somente leitura. As informacoes de contato (telefone, endereco, chave PIX) aparecem apenas se o dono da horta optou por deixa-las publicas.
6. No perfil, o produtor configura seus dados de contato e escolhe individualmente quais informacoes ficam visiveis para outros produtores.
7. A recuperacao de senha utiliza as perguntas de seguranca definidas no cadastro, sem dependencia de servico de email.

## Credenciais de Teste

Se executou `npm run seed:dados`, estao disponiveis as seguintes contas (senha: `123456`):

| Nome             | Email               |
|------------------|---------------------|
| Maria Silva      | maria@hortas.com    |
| Joao Oliveira    | joao@hortas.com     |
| Ana Souza        | ana@hortas.com      |
| Carlos Santos    | carlos@hortas.com   |
| Fernanda Lima    | fernanda@hortas.com |
