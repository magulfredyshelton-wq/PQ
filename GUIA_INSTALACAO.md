# Pequenos Astronautas · Instalação e teste

[Actualização e comandos da Expedição 3D](GUIA_3D.md)

O backend Python serve o jogo e a API no mesmo endereço. O PostgreSQL guarda contas, partidas, convites e conversas. Podes começar no Windows com o teu venv de Python 3.15 e testar com duas contas antes de configurar o acesso pela Internet.

## 1. Criar a base no Windows

Instala o PostgreSQL pelo instalador oficial. Mantém a porta 5432 para este exemplo e guarda a palavra-passe do utilizador administrativo `postgres`. Abre o **SQL Shell (psql)** e liga-te à base `postgres` com esse utilizador. [PostgreSQL para Windows](https://www.postgresql.org/download/windows/)

No SQL Shell, cria um utilizador para o jogo, define a sua palavra-passe e cria a base:

```sql
CREATE ROLE astronautas LOGIN;
\password astronautas
CREATE DATABASE astronautas OWNER astronautas;
```

O comando `\password` pede a palavra-passe sem a escreveres no comando. O backend vai usar a conta `astronautas`. Para um PostgreSQL gerido, cria a base e as credenciais pelo painel do fornecedor. [CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html) · [psql](https://www.postgresql.org/docs/current/app-psql.html)

## 2. Preparar o venv e arrancar

Extrai o ZIP e abre o PowerShell na pasta que contém `backend` e `frontend`.

```powershell
cd backend
py -3.15 --version
py -3.15 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Se já tens um venv com Python 3.15, conserva-o e executa o comando de instalação com o seu interpretador. Se o lançador `py` estiver indisponível, usa o caminho do executável do Python 3.15 seguido de `-m venv .venv`. No VS Code, selecciona `backend\.venv\Scripts\python.exe`. [Documentação do venv](https://docs.python.org/3.15/library/venv.html) · [Instalação do Psycopg](https://www.psycopg.org/psycopg3/docs/basic/install.html)

No `backend/.env`, coloca a palavra-passe que definiste. Se copiaste um `.env` anterior, acrescenta `ASTRO_DATABASE_URL` e retira a entrada `ASTRO_DB`.

```dotenv
ASTRO_DATABASE_URL=host=127.0.0.1 port=5432 dbname=astronautas user=astronautas password=trocar_esta_senha
ASTRO_HOST=127.0.0.1
ASTRO_PORT=8000
ASTRO_PUBLIC_URL=http://127.0.0.1:8000
ASTRO_EMAIL_MODO=local
ASTRO_CEREBRO=auto
OLLAMA_ENABLED=0
```

Para senhas com espaços, delimita o valor da senha com aspas simples dentro da ligação, como `password='minha senha'`. Se a senha tiver uma aspa simples ou uma barra invertida, escapa-a com `\` conforme a sintaxe libpq. [Parâmetros de ligação](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

A partir de `backend`, executa:

```powershell
.\.venv\Scripts\python.exe migrate.py
.\.venv\Scripts\python.exe run.py
```

O PostgreSQL aplica os ficheiros de `backend/migrations/` por ordem e regista cada versão na tabela `migracoes`. Se voltares a executar `migrate.py`, só as migrações novas são aplicadas. O arranque também faz essa verificação.

Abre [Pequenos Astronautas](http://127.0.0.1:8000/) e confirma a [saúde da API](http://127.0.0.1:8000/api/saude). Para este teste, o backend serve directamente o frontend que vem no ZIP.

### Se já tinhas contas e partidas no SQLite

Antes de arrancar a nova versão, pára o servidor antigo e guarda uma cópia do ficheiro da base, normalmente `backend/data/astronautas.sqlite3`. O importador usa essa cópia como fonte e uma base PostgreSQL sem dados do jogo como destino. Deixa o backend parado durante a importação e confirma que `ASTRO_DATABASE_URL` aponta para a base nova.

```powershell
.\.venv\Scripts\python.exe importar_sqlite.py "C:\copia\astronautas.sqlite3"
```

A importação leva contas, nicknames, partidas, comandos e mensagens. Mantém os identificadores dos jogadores e das partidas. Os jogadores entram novamente com o mesmo email e palavra-passe. Os links pendentes de confirmação de email e os convites antigos ficam na base anterior. Pede novos links de confirmação se necessário. Depois de importares, arranca `run.py` e verifica **As minhas partidas**.

## 3. Testar com duas contas

1. Abre o jogo numa janela normal e noutra privada. Em **Criar conta**, usa dois emails fictícios, como `aurora@example.test` e `cosmos@example.test`.
2. Para cada conta, abre no PC do servidor o ficheiro de `backend/emails_demo/` que contém o endereço correspondente. Segue o link e preenche nome, idade, nickname e palavra-passe. Usa, por exemplo, `aurora_01` e `cosmos_02`. A palavra-passe precisa de pelo menos 12 caracteres. Se as janelas abrirem o link no mesmo perfil, copia-o para a janela em que vais testar aquela conta.
3. Entra com email e palavra-passe. Para simular um jogador de 8 a 14 anos, abre **As minhas partidas**, indica um email fictício diferente para o responsável e aprova o pedido através do ficheiro de `backend/emails_demo/` correspondente.
4. O anfitrião escolhe **Nova partida → Convidar astronauta → Gerar código privado**. Partilha esse código fora do jogo. O colega cola-o em **As minhas partidas → Convites** e escolhe **Continuar**. O código só pode ser usado uma vez e expira em 30 minutos.
5. Abre **Conversa** e troca frases predefinidas. Testa uma denúncia e um bloqueio com contas fictícias. Para testar voz entre dois jogadores de 15 anos ou mais, usa `ASTRO_CONVERSA_LIVRE=1`, reinicia e abre o jogo em localhost ou HTTPS. [Acesso ao microfone](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
6. Escolhe Lua ou Marte, distribui a carga pelo manifesto e confirma a prontidão. No final da missão, verifica o desfecho e o relatório. Quando houver votos diferentes, ambos recebem um aviso. As decisões tomadas enquanto o colega está desligado ficam assinaladas no diário.


## 4. Activar o cérebro R1, o Ollama e o Vite

### Rede neural R1

Instala a dependência dentro do venv e reinicia o backend.

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements-neural.txt
```

Com `ASTRO_CEREBRO=auto`, a API deve mostrar `"cerebro": "r1"` quando a rede estiver disponível. Usa `ASTRO_CEREBRO=r1` para exigir a R1 ao arrancar. Se precisares de correr a demo enquanto resolves a instalação do NumPy, usa `ASTRO_CEREBRO=leve`. O NumPy 2.5.3 tem pacotes oficiais para CPython 3.15 em Windows x86-64 e ARM64. Se o teu índice de pacotes não os encontrar, confirma a arquitectura, o interpretador e o índice configurado no pip. [Ficheiros oficiais do NumPy 2.5.3](https://pypi.org/project/numpy/2.5.3/#files)

### LLM com Ollama

Instala o Ollama no PC que executa o backend e abre a aplicação. Num segundo terminal:

```powershell
ollama pull llama3.2:3b
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Em `backend/.env`, coloca:

```dotenv
OLLAMA_ENABLED=1
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

Reinicia o backend. Para testar o LLM no jogo, usa uma conta com idade de 15 anos ou mais, chega a um desafio e escreve uma proposta na opção de resposta aberta. Com o Ollama indisponível, o jogo tenta interpretar pelo léxico. [Ollama para Windows](https://docs.ollama.com/windows) · [Llama 3.2](https://ollama.com/library/llama3.2)

### Frontend com Vite

Para trabalhar no frontend, mantém o backend na porta 8000. Abre outro PowerShell, vai à pasta `frontend` e executa:

```powershell
npm ci
npm run dev -- --strictPort
```

Abre [o endereço de desenvolvimento](http://localhost:5173/). O Vite encaminha `/api` para o Python. Na demo, o link de confirmação pode abrir o endereço do backend. Depois de confirmares a conta, volta ao endereço do Vite para entrar. `npm run build` gera `frontend/dist` com os três ecrãs. Para servir essa versão, configura `ASTRO_FRONTEND` com o caminho absoluto para `dist` e reinicia o backend. [Documentação do Vite 6](https://v6.vite.dev/guide/)

## 5. Jogar em dois computadores

### Na mesma rede, com texto

No PC servidor, usa `ipconfig` para saber o IPv4 local. Em `backend/.env`, define `ASTRO_HOST=0.0.0.0` e `ASTRO_PUBLIC_URL=http://IP_DO_SERVIDOR:8000`, substituindo o marcador pelo IP. Mantém `ASTRO_EMAIL_MODO=local`. Reinicia `run.py` e abre esse mesmo endereço nos dois computadores. Se o Windows pedir acesso à rede, permite-o na rede privada que estás a usar para o teste. Os ficheiros de confirmação continuam a ser gerados no PC servidor.

### Hospedar uma instalação de teste com HTTPS e email real

1. Usa um servidor para o jogo, uma base PostgreSQL persistente, um domínio apontado para o servidor e credenciais SMTP. Coloca as pastas `backend` e `frontend` juntas. Para transferir uma instalação PostgreSQL existente, cria um backup com `pg_dump` e restaura-o no servidor de destino. [Documentação do pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
2. Cria o venv no servidor e instala `requirements-asgi.txt`. Em Linux, a partir de `backend`:

   ```bash
   python3.15 -m venv .venv
   ./.venv/bin/python -m pip install -r requirements-asgi.txt
   ./.venv/bin/python -m pip install -r requirements-neural.txt
   ```

   Para um servidor Windows, usa os comandos equivalentes com `py -3.15` e `.\.venv\Scripts\python.exe`. A instalação neural é necessária para usar a R1.

3. No servidor, cria `backend/.env` a partir de `.env.example` e adapta:

   ```dotenv
   ASTRO_HOST=127.0.0.1
   ASTRO_PORT=8000
   ASTRO_DATABASE_URL=host=127.0.0.1 port=5432 dbname=astronautas user=astronautas password=trocar_esta_senha
   ASTRO_PUBLIC_URL=https://jogo.teudominio.com
   ASTRO_EMAIL_MODO=smtp
   ASTRO_SMTP_HOST=smtp.teufornecedor.com
   ASTRO_SMTP_PORTA=587
   ASTRO_SMTP_DE=jogo@teudominio.com
   ASTRO_SMTP_UTILIZADOR=jogo@teudominio.com
   ASTRO_SMTP_SENHA=coloca_a_credencial_no_servidor
   ```

   Substitui os marcadores pelos dados reais. Se o PostgreSQL estiver noutro servidor, usa o endereço privado e as opções TLS indicadas pelo fornecedor. A porta 5432 serve a ligação do backend à base. Se o fornecedor indicar a porta 465, o código usa TLS desde o início da ligação. Para 587, usa STARTTLS. Guarda a credencial SMTP no servidor. Para usar o Ollama em produção, instala e descarrega o modelo nesse servidor ou configura `OLLAMA_URL` para o serviço privado que o executa.

4. Aplica as migrações e arranca o FastAPI na interface local:

   ```bash
   ./.venv/bin/python migrate.py
   ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
   ```

   Para manter o processo activo após reinícios num servidor Linux, adapta o utilizador, o grupo e os caminhos do ficheiro `deploy/astronautas.service`. Instala-o em `/etc/systemd/system/astronautas.service` e executa `sudo systemctl daemon-reload` seguido de `sudo systemctl enable --now astronautas`. O serviço substitui o processo iniciado no terminal.

5. No Caddy, usa o domínio real na primeira linha de `deploy/Caddyfile` e mantém `reverse_proxy 127.0.0.1:8000`. Abre as portas 80 e 443 para o Caddy. Com o DNS já a apontar para o servidor, o Caddy pode emitir o certificado HTTPS. Numa instalação que usa um serviço Caddy, coloca o ficheiro na localização que o serviço lê e recarrega-o. [Configuração de HTTPS no Caddy](https://caddyserver.com/docs/quick-starts/https) · [Proxy inverso](https://caddyserver.com/docs/quick-starts/reverse-proxy)
6. Nas duas máquinas, abre o mesmo domínio HTTPS. Confirma um email real, entra com o código privado e testa as frases predefinidas. A gravação no navegador requer um contexto seguro, como HTTPS ou localhost, e permissão para usar o microfone. [Acesso ao microfone no navegador](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## 6. Se algo falhar

| Sintoma | O que verificar |
|---|---|
| A migração falha ao ligar ao PostgreSQL | Confirma que o serviço está a correr e que host, porta, base, utilizador e senha em `ASTRO_DATABASE_URL` estão correctos. |
| A página abre mas o login falha | Abre `/api/saude` no mesmo endereço. Verifica se o Python está a correr e se `ASTRO_PUBLIC_URL` corresponde ao endereço que o navegador usa. |
| O email da demo não aparece | Confirma `ASTRO_EMAIL_MODO=local` e vê `backend/emails_demo/` no computador do servidor. |
| O email real não chega | Confirma as credenciais SMTP, o endereço do remetente, o domínio em `ASTRO_PUBLIC_URL` e a pasta de spam. |
| O código não é aceite | Confirma que ambos usam o mesmo servidor, que o código ainda está válido e que a conta do colega tem a autorização exigida. |
| A voz não grava | Confirma que ambos têm 15 anos ou mais, que activaste `ASTRO_CONVERSA_LIVRE=1` e que o navegador permite o microfone em localhost ou HTTPS. |
| As partidas antigas desapareceram da lista | Confirma a base indicada em `ASTRO_DATABASE_URL`, se os dados foram importados e se entraste com a mesma conta. |
| A IA usa sempre o léxico | Confirma que o modelo está em `/api/tags`, que `OLLAMA_ENABLED=1` e que a conta tem acesso à resposta aberta. |

Para correr os testes automatizados, cria uma base `astronautas_teste` com o mesmo proprietário. Abre o PowerShell em `backend` e aponta os testes para essa base. Cada teste cria e limpa o seu próprio esquema:

```powershell
$env:ASTRO_TEST_DATABASE_URL = "host=127.0.0.1 port=5432 dbname=astronautas_teste user=astronautas password=trocar_esta_senha"
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m unittest -v
```

Para testar só as regras sem base de dados, corre `python -m unittest -v test_missao` dentro de `backend`. Em `frontend`, corre `npm test` e `npm run build`. O workflow `.github/workflows/testes.yml` usa PostgreSQL 16 quando o projecto estiver no GitHub.

## 7. Privacidade, denúncias e retenção

Em SMTP, o registo de menores de 15 anos fica desactivado por defeito. `ASTRO_PILOTO_FAMILIAR=1` permite experimentar esse grupo numa instalação controlada. A autorização por email dá acesso ao cooperativo e à conversa por frases. A conta pode jogar a solo antes da autorização. A idade continua auto-declarada e o fluxo confirma acesso à caixa de email e uma declaração do responsável. Antes de um lançamento público dirigido a crianças, valida o método de verificação de idade e de autoridade parental, o tratamento de dados e o processo de moderação aplicáveis. [Orientação da FTC sobre consentimento verificável](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

O texto livre e a voz começam desligados. Se activados, só ficam disponíveis quando ambos os membros têm pelo menos 15 anos. O filtro de texto detecta formatos comuns de emails, números de telefone e links. Pode deixar passar outras formas de escrever contactos e a voz pode conter informação pessoal.

| Dado | Retenção no servidor |
|---|---|
| Frases e texto | 7 dias |
| Voz | 24 horas |
| Resultados de comandos para repetição | 7 dias |
| Denúncias | Até revisão humana. As revistas são removidas após 90 dias contados da criação. |

O FastAPI executa a limpeza no arranque e a cada 5 minutos. A retenção indicada aplica-se à base activa. Alinha a retenção dos backups com a política da tua instalação. O bloqueio interrompe a conversa nos dois sentidos e impede a mesma dupla de se juntar por novos códigos.

As denúncias ficam numa fila PostgreSQL para revisão por um operador autorizado. A tabela guarda o motivo, os identificadores dos envolvidos, a partida e, quando aplicável, o ID da mensagem. A denúncia não faz uma cópia da mensagem ou do áudio. Para identificar a fila por rever, usa uma sessão administrativa do PostgreSQL:

```sql
SELECT id, partida, autor, alvo, mensagem, motivo, criada_em
FROM denuncias
WHERE revista_em IS NULL
ORDER BY criada_em;
```

Depois de tratar um caso, regista a revisão com `UPDATE denuncias SET revista_em = now() WHERE id = 123;`, substituindo `123` pelo ID. Define quem acompanha a fila antes de disponibilizar o jogo a outras pessoas.
