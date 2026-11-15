# Ligação backend + frontend (15 Nov 2026)

## Como correr
1. Pastas lado a lado: `backend/` e `frontend/` (o backend serve `../frontend`; noutra disposição usar `ASTRO_FRONTEND=caminho`).
2. `cd backend` → `pip install -r requirements.txt` → `python migrate.py` → `python run.py`
3. Abrir o endereço de `ASTRO_PUBLIC_URL` (tem de ser igual ao que está na barra do navegador).

## O que foi mexido
| Ficheiro | Alteração |
|---|---|
| `frontend/js/ciencia.js` | NOVO. Parte visual da ciência real da NASA (`app/nasa.py`): APOD, DONKI, RadLab, OSDR. |
| `frontend/js/main.js` | 5 acrescentos, nada removido: import; botão "Science/Ciência" no lobby; o mesmo botão no jogo (só quando a missão tem `estado.ciencia`); modal `ciencia`; bloco no relatório final. |
| `frontend/js/cenas.js` | Removida a 2.ª cópia do bloco `const rd = rng(99), PO = …` (estava duplicado e o jogo não carregava: "Identifier 'rd' has already been declared"). |

## Entrada livre (sem email nem autenticação)
O jogador indica só **nome e idade** e entra. A equipa continua a formar-se com **código de sala + convite**.

| Ficheiro | Alteração |
|---|---|
| `backend/app/contas.py` | Saiu email, palavra-passe, link de confirmação, SMTP e autorização do responsável. `POST /api/conta/entrar {nome, idade}` cria o jogador e abre a sessão. |
| `backend/app/http.py` | Saíram as rotas `pedir-confirmacao`, `confirmar`, `consentimento`, `autorizar`. |
| `backend/app/privacidade.py`, `servico.py` | Qualquer idade (8+) pode jogar em equipa com convite. |
| `backend/migrations/008_entrada_livre.sql` | Remove as colunas de email/palavra-passe e as tabelas de confirmação. **Correr `python migrate.py`.** |
| `backend/.env`, `.env.example` | Saíram `ASTRO_EMAIL_MODO` e `ASTRO_PILOTO_FAMILIAR`. Pasta `emails_demo/` apagada. |
| `backend/test_online.py`, `test_sandbox.py` | Testes adaptados à entrada livre. |
| `frontend/js/main.js` | Ecrã de entrada com dois campos (nome, idade) e botão JOGAR; saiu o pedido ao responsável no painel Missões. |

O servidor continua a usar um cookie de sessão (7 dias) só para saber quem é quem dentro da sala. Não é um login: se o cookie se perder, o jogador entra de novo com o nome e fica como jogador novo.

## De onde vêm os dados
- Lobby (sem missão lançada): `GET /api/nasa`
- Em jogo e no relatório: `estado.ciencia` / `relatorio.ciencia`, fixados pelo servidor na descolagem

## Por resolver (não mexi)
- `test_traducao.test_todas_as_mensagens_do_servidor_tem_ingles` falha: `app/nasa.py` tem duas mensagens sem inglês ("resposta vazia", "sem leituras"). São mensagens internas de log; não afectam o jogo.
- `GET /api/sandbox/cenarios` existe no backend e o `sandbox.html` ainda não o usa (o sandbox corre sem servidor, por desenho).
