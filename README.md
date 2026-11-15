# Pequenos Astronautas

[Como actualizar e jogar a Expedição 3D](GUIA_3D.md)

Segue o [guia de instalação e teste](GUIA_INSTALACAO.md) para configurar o venv, testar com duas contas e publicar.

Simulador para jogar a solo ou em equipas de dois jogadores, com contas e narração em português. A campanha começa na Terra, passa pela viagem à Lua ou a Marte, chega à superfície e termina com a operação da base ou a retirada em segurança.

O catálogo tem 27 situações. Uma campanha nova usa dois incidentes em voo e sete situações na superfície, incluindo a do pouso. A selecção é guardada com a partida. O incidente de pouso continua ligado ao destino. As campanhas já iniciadas mantêm a sequência original.

A missão falha se faltar um recurso crítico, se a margem chegar a zero ou se a exposição acumulada chegar a 6 unidades didácticas. Uma decisão arriscada pode abrir uma recuperação. Cada incidente admite até dois adiamentos, com custos crescentes. O relatório final apresenta o desfecho, o motivo, as decisões, a pontuação e as estrelas.

## 1. Arrancar no Windows com Python 3.15

Cria a base PostgreSQL e configura `ASTRO_DATABASE_URL` em `backend/.env` como indicado no [guia](GUIA_INSTALACAO.md). Extrai o ZIP e abre o PowerShell na pasta que contém `backend` e `frontend`. Se já tens um ambiente virtual de Python 3.15, usa o seu executável e começa pelo comando de migração.

```powershell
cd backend
py -3.15 --version
py -3.15 -m venv .venv
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe migrate.py
.\.venv\Scripts\python.exe run.py
```

Se `py -3.15` não estiver disponível, usa o caminho absoluto do executável do Python 3.15 seguido de `-m venv .venv`. Se a pasta `.venv` já existir, verifica a versão antes de a reutilizar. No VS Code, escolhe **Python: Select Interpreter** e aponta para `backend\.venv\Scripts\python.exe`. No IntelliJ ou PyCharm, selecciona esse mesmo executável nas definições de interpretador. Os comandos chamam directamente o Python do ambiente virtual.

Abre [o jogo](http://127.0.0.1:8000). Em **Criar conta**, pede um link de confirmação. No modo local, abre o ficheiro mais recente de `backend/emails_demo/` e segue o link. Depois preenche nome, idade, nickname e palavra-passe e entra. Repete com outro email de teste numa janela privada para testar o segundo jogador. Em modo local, usa emails fictícios como `aurora@example.test`.

**Activar voz** autoriza a narração no navegador. O jogo lê os alertas, as instruções dos terminais e as propostas da IA. Usa **Ouvir desafio** e **Ouvir [nome do NPC]** para repetir. A voz depende das vozes instaladas no dispositivo. Instala ou selecciona uma voz portuguesa no sistema se o navegador usar outro idioma. O controlo de voz funciona independentemente dos sons da nave.

Depois de entrares, **As minhas partidas** mostra as missões associadas à conta. Escolhe **Nova partida** para criar uma e abrir o hangar, ou **Continuar** para regressar à fase guardada. Em **Convites**, podes aceitar ou recusar pedidos. Ao aceitar, a partida aparece na lista e podes entrar com **Continuar**.

No hangar, o anfitrião gera um código privado e partilha-o fora do jogo. O colega introduz o código em **As minhas partidas → Convites**. O código expira em 30 minutos, pode ser usado uma vez e deixa de valer no lançamento. O nickname identifica o astronauta na equipa.

A conversa usa frases predefinidas por defeito. Para equipas em que ambos tenham pelo menos 15 anos, um servidor de teste pode activar texto e voz com `ASTRO_CONVERSA_LIVRE=1`. As frases e o texto expiram em 7 dias, a voz em 24 horas. Cada membro pode denunciar e bloquear o colega. A autorização por email no modo familiar permite testar a participação abaixo dos 15 anos. Consulta o guia para saber as condições do piloto e as limitações antes de publicar.

O backend serve a pasta irmã `frontend/` e recebe os pedidos `/api/` na mesma origem. Para verificar o serviço, abre [a saúde da API](http://127.0.0.1:8000/api/saude).

### Activar a rede R1

Dentro de `backend/`, instala o NumPy no mesmo ambiente virtual:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-neural.txt
```

Reinicia o servidor e abre [a saúde da API](http://127.0.0.1:8000/api/saude). O campo `cerebro` indica `r1` ou `leve`. A opção `ASTRO_CEREBRO=auto` activa a R1 se o NumPy estiver disponível. Usa `ASTRO_CEREBRO=r1` para exigir esta rede ou `ASTRO_CEREBRO=leve` para regressar à versão anterior. Uma partida antiga cria o estado R1 no primeiro evento confirmado após a actualização. As partidas já concluídas conservam o desfecho.

### Ollama

1. Instala [Ollama para Windows](https://ollama.com/download/windows) e abre a aplicação.
2. Num segundo terminal, executa:

```powershell
ollama pull llama3.2:3b
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

3. No `backend/.env`, confirma `OLLAMA_ENABLED=1`, `OLLAMA_URL=http://127.0.0.1:11434` e `OLLAMA_MODEL=llama3.2:3b`. Reinicia o servidor após alterações. Para carregar o modelo antes da demonstração, executa `ollama run llama3.2:3b "Responde só: pronto"`. Se a máquina demorar, aumenta `OLLAMA_TIMEOUT` e o timeout do pedido em `frontend/api.js`, ou experimenta `llama3.2:1b` depois de o descarregar. Para demonstrar só o léxico, define `OLLAMA_ENABLED=0`.

Ollama recebe o sinal do desafio, as opções e a frase do jogador, sem o seu nome ou token. O endpoint de saúde indica a configuração, enquanto `/api/tags` confirma que o Ollama está a responder e lista o modelo instalado.

### FastAPI, Vite e telemóvel

- Para usar a entrada FastAPI, instala `requirements-asgi.txt` dentro do venv e corre `\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`, a partir de `backend/`. O comando `run.py` também arranca o FastAPI com Uvicorn.
- Para desenvolver o frontend com Vite, deixa o backend na porta 8000. Em outro terminal, entra em `frontend/`, executa `npm ci` e `npm run dev -- --strictPort`. Abre o endereço do Vite. O proxy passa `/api` para a porta 8000. Este modo usa GSAP, Howler e nipplejs. Para servir o resultado de `npm run build`, aponta `ASTRO_FRONTEND` para o caminho absoluto de `frontend/dist` e reinicia o backend.
- Para testar com dois dispositivos na mesma rede, define `ASTRO_PUBLIC_URL=http://IP_DO_PC:8000` e configura `ASTRO_HOST=0.0.0.0` no servidor da demo, reinicia e abre `http://IP_DO_PC:8000` nos dispositivos. Usa `ipconfig` para localizar o IPv4 do PC. Se o Windows pedir acesso, autoriza-o na tua rede privada. Os links da demo local ficam em `backend/emails_demo/` no servidor. Neste teste por IP e HTTP, usa as frases predefinidas. Para gravar voz entre dispositivos, configura HTTPS como na secção 5. O Ollama continua acessível apenas no PC em que o backend corre.

## 2. Guião para a demo

1. Cria uma conta de teste com idade de pelo menos 15 anos para usar o nível **Comandante**. Entra e cria uma partida. Usa as setas, WASD ou o joystick. Aproxima-te de um terminal e carrega em **Interagir** ou **E**.
2. Na **Navegação**, compara Lua e Marte e escolhe o destino. A Lua usa um perfil de 103 horas e Marte um de 203 dias. São referências históricas da Apollo 11 e do rover Perseverance, adaptadas ao jogo.
3. No **Armazém**, preenche a carga manualmente. Usa a coluna **Mín.** e decide onde acrescentar reservas. Confirma os limites de massa e volume e guarda.
4. No **Controlo**, confirma o lançamento. Na cabine, podes usar a Navegação para assumir o posto, treinar uma correcção e devolver o controlo ao modo automático. Depois avança ao primeiro marco. Escreve «medir e corrigir a trajectória», interpreta e vê a proposta. Para demonstrar recuperação, escolhe «Concentrar a correcção numa única manobra perto da chegada». O propulsante diminui e o relógio fica bloqueado até resolveres a recuperação.
5. Completa os desafios da viagem. Escolhe o local de pouso, conclui o incidente de chegada e descarrega a carga. Instala **energia → comunicações → habitat**. Os módulos tornam-se visíveis na cena.
6. Na operação da base, avança pelos desafios da Lua ou de Marte até aparecer o desfecho. O diário de bordo conserva as consequências.
7. Para a demo cooperativa, o anfitrião gera um código privado no hangar e o colega introduz o código em **As minhas partidas → Convites**. O colega escolhe **Continuar**, abre **Conversa** e envia uma mensagem. Ambos confirmam a prontidão no Controlo antes de lançar. Os dois podem ver os respectivos avatares, as escolhas de cada um e a mesma evolução da missão.

## 3. Como o código funciona

| Área | Caminho | Função |
|---|---|---|
| Regras da missão | `backend/app/missao.py` | Valida a fase, calcula consumos, aplica consequências, bloqueia o avanço durante recuperação e verifica a ordem de instalação. |
| Conteúdo | `backend/app/catalogo.py` | Define os dois perfis, carga, 27 desafios e etapas de instalação. Os limites, tempos intermédios e custos de acções são parâmetros didácticos. |
| Serviço | `backend/app/servico.py` | Valida a pertença à equipa, trata convites e mensagens, confirma comandos e devolve a vista adaptada ao nível. |
| Dados | `backend/app/db.py` e `backend/migrations/` | Guarda a revisão, os dados da campanha, o histórico e o estado neural. |
| IA | `backend/app/neural.py` e `backend/app/llm.py` | Calcula reacções, interpreta texto e fornece o léxico de reserva. |
| Acesso | `frontend/index.html`, `partidas.html` e `partidas.js` | Separa o login da lista de partidas e abre os convites num diálogo. |
| Conversa | `frontend/chat.js` | Recebe novas mensagens com a presença, envia frases autorizadas e carrega áudio a pedido, quando disponível. |
| Apresentação | `frontend/hangar.html` e `missao.js` | Envia comandos, confirma propostas e mostra a informação devolvida pelo backend. |
| Mundo 3D | `frontend/mundo.js`, `render.js` e `jogo.js` | Move o avatar, aplica colisões locais, abre terminais, desenha as cenas e apresenta outros jogadores e NPCs. |

### De um clique à gravação

O frontend envia um identificador de comando, a revisão que está a ver, a acção e os respectivos dados. O backend verifica a identidade e a revisão. Abre uma transacção PostgreSQL, aplica as regras, actualiza os NPCs e grava a partida e o resultado. Se o mesmo pedido chegar de novo com o mesmo identificador, devolve o resultado original. Se outro jogador tiver alterado a revisão, devolve conflito e o frontend consulta o novo estado. O navegador envia presença e recebe novas mensagens a cada 2,5 segundos. A posição remota é interpolada. Os comandos confirmados ficam disponíveis para repetição idempotente durante 7 dias. A limpeza corre no FastAPI. Os limites de pedidos são partilhados pelo PostgreSQL.

### Campanha, ensino e IA

O relógio da rota mede o trajecto até à chegada. O relógio da missão inclui também atrasos e tarefas na superfície. A viagem consome água, comida, oxigénio e propulsante. A carga extra permite certas reparações; uma contingência pode recuperar capacidade com um custo de tempo. Uma decisão arriscada aplica uma consequência, activa a recuperação e impede avançar para o próximo desafio. O anfitrião também pode concluir com retirada em segurança.

**Cadete (8–11)** recebe escolhas concretas. **Piloto (12–14)** vê também as leituras e os recursos. **Comandante (15–18)** pode escrever uma proposta em português. O Llama devolve JSON com uma opção permitida. O backend confirma que a opção pertence ao desafio e devolve-a ao navegador. Só depois de o jogador a confirmar o servidor aplica a acção. Em caso de indisponibilidade, o léxico compara a frase com as opções; se o resultado for ambíguo, a interface oferece reformulação ou escolha manual.

**Rede LIF R1.** Cada NPC tem 188 unidades: 54 sensores, 84 interneurónios e 50 motores. A implementação independente foi entregue no ZIP R1/R2 e usa a especificação da equipa. Os sinais da campanha incluem energia, água, oxigénio, risco e sucessos recentes. Os sensores geram pulsos probabilísticos e ajustam a sensibilidade pela exposição repetida. Os neurónios somam entradas, perdem tensão e disparam quando ultrapassam um limiar que também se adapta. Os motores competem e o descodificador usa limiar, margem e tempo de permanência para evitar oscilações. Cada NPC tem temperamento, semente e falas próprias.

O PostgreSQL guarda os estados R1 de forma transaccional na coluna JSONB da partida, incluindo o relógio, as tensões, a habituação, os disparos, o gerador aleatório e o descodificador. A simulação é reconstruída com esses valores no evento seguinte. O formato tem versão. As partidas anteriores inicializam o novo estado neural ao primeiro evento confirmado. Para levar partidas da antiga demo SQLite, usa o importador descrito no guia.

O motor leve continua disponível para execução sem NumPy. O código R1 em `backend/app/cerebro/` conserva a licença GPL-3.0 e o texto da licença está em `backend/app/cerebro/COPYING`.

## 4. Base de dados e alterações locais

- `001_partidas.sql` cria as partidas e os jogadores. `002_cooperacao.sql` cria comandos, presença e convites. `003_contas.sql` acrescenta contas verificadas, sessões e associação a jogadores. `004_convites_e_conversa.sql` cria os convites associados a contas e as mensagens por partida. `005_nicknames.sql` acrescenta nicknames únicos. `006_seguranca.sql` acrescenta consentimento, bloqueios, denúncias, limites partilhados e datas de retenção, e invalida convites antigos. `migrate.py` aplica as migrações em ordem, regista as versões e pode ser executado novamente. O primeiro arranque também as aplica.
- Configura a base PostgreSQL em `ASTRO_DATABASE_URL`. Para evoluir o esquema, adiciona um ficheiro SQL numerado, como `007_nome.sql`. O importador opcional lê as bases SQLite das versões anteriores.
- Para ajustar nave, mantimentos e desafios, edita `backend/app/catalogo.py`; para ajustar os seus efeitos, edita `backend/app/missao.py`. Para afinar personalidade e estímulos, edita `backend/app/neural.py`.
- O jogo inclui mapas didácticos com marcadores aproximados. Para usar os teus mapas originais, guarda-os em `frontend/assets/lua.jpg` e `frontend/assets/marte.jpg`. Em `frontend/missao.js`, troca as duas referências `mapa-lua.svg` e `mapa-marte.svg` por esses ficheiros e ajusta o texto alternativo.
- Para verificar o backend, instala `requirements-test.txt` e corre `.\.venv\Scripts\python.exe -m unittest -v` dentro de `backend/`. Define primeiro `ASTRO_TEST_DATABASE_URL` com uma base de teste. Os testes usam esquemas temporários e cobrem as campanhas, o cooperativo e as reacções. A demo usa física e cartografia simplificadas e sincronização por HTTP.

## 5. Publicar para jogar pela Internet

1. Escolhe um servidor com armazenamento persistente e aponta um domínio ou subdomínio para ele. Coloca o ZIP extraído no servidor. Usa um serviço PostgreSQL com dados persistentes e configura `ASTRO_DATABASE_URL` no backend.
2. Cria o ambiente virtual no servidor. Dentro de `backend/`, instala `requirements-asgi.txt` e, se quiseres usar a R1, `requirements-neural.txt`. Executa `migrate.py` com o Python desse ambiente.
3. No `backend/.env`, define os campos abaixo com os dados do teu fornecedor de email. Guarda a senha de aplicação apenas no servidor.

   ```dotenv
   ASTRO_PUBLIC_URL=https://jogo.exemplo.com
   ASTRO_EMAIL_MODO=smtp
   ASTRO_SMTP_HOST=smtp.exemplo.com
   ASTRO_SMTP_PORTA=587
   ASTRO_SMTP_DE=jogo@exemplo.com
   ASTRO_SMTP_UTILIZADOR=jogo@exemplo.com
   ASTRO_SMTP_SENHA=preencher-no-servidor
   ```

4. Arranca o FastAPI na interface local atrás do Caddy. Em Linux, usa `./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1`. No Windows, chama o executável equivalente em `.venv/Scripts/python.exe`. Para manter o processo activo em Linux, podes usar `deploy/astronautas.service` depois de ajustar os caminhos e o utilizador.
5. Instala o Caddy, substitui `jogo.exemplo.com` em `deploy/Caddyfile` e carrega esse ficheiro. Aponta o DNS para o servidor e disponibiliza as portas 80 e 443 ao Caddy. O servidor Python e o Ollama ficam na interface local. O Caddy trata do HTTPS.
6. Abre o domínio numa máquina, cria e confirma uma conta por email e escolhe um nickname. Repete com outra conta na segunda máquina e partilha um código privado. Confirma que os dois conseguem avançar, votar e retomar pela lista de partidas. Testa a narração e as frases da equipa. Para verificar texto livre e voz, consulta as opções do piloto no guia.

### Como os dados são usados

A tripulação e a conversa mostram o nickname, com o nome de astronauta como alternativa para contas antigas. O email, a idade e a palavra-passe ficam fora do estado da partida partilhado com o colega. A idade define Cadete (8–11), Piloto (12–14) ou Comandante (15+). A palavra-passe é armazenada como derivação scrypt com sal. O link de verificação expira em 45 minutos e só pode ser usado uma vez. A sessão autenticada expira em sete dias e a saída revoga-a. O PostgreSQL guarda as mensagens de texto e os ficheiros de voz associados à partida. As mensagens da equipa ficam fora do processamento do Ollama.

Para trazer uma partida da demo SQLite, importa primeiro a base conforme o guia. Para associar uma partida que era anónima, abre o mesmo endereço e separador em que a jogavas. Depois de entrar numa conta, usa **Associar partida antiga**. Cada membro que já estava na partida precisa da sua própria chave guardada no navegador. A migração conserva as partidas já gravadas. Leva uma cópia de segurança da base antes de a migrar.

## Referências

- [Apollo 11, cronologia da NASA](https://www.nasa.gov/wp-content/uploads/static/history/ap11ann/ap11events.html)
- [Mars 2020, cronologia da missão](https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/)
- [NASA/JPL, sensores de orientação e controlo térmico do InSight](https://www.jpl.nasa.gov/news/press_kits/insight/landing/mission/spacecraft/)
- [NASA, recuperação de água na estação espacial](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/)
- [NASA, riscos do regolito lunar](https://science.nasa.gov/biological-physical/what-hazards-are-caused-by-lunar-regolith/)
- [NASA, ambiente do polo sul lunar](https://www.nasa.gov/reference/moonbase-environment/)
- [NASA, sistemas de comunicação e navegação da base lunar](https://www.nasa.gov/moonbase-systems/)
- [NASA, produção solar do InSight e acumulação de poeira](https://science.nasa.gov/resource/insights-power-generation-after-landing-and-spring-2022/)
- [NASA, amostras do Perseverance](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/)
- [NASA, protecção contra radiação em Marte](https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/)
- [Ollama, Llama 3.2](https://ollama.com/library/llama3.2)
- [Ollama, respostas estruturadas](https://docs.ollama.com/capabilities/structured-outputs)


- [Caddy, HTTPS automático](https://caddyserver.com/docs/automatic-https)
- [OWASP, armazenamento de palavras-passe](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [MDN, acesso ao microfone no navegador](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
