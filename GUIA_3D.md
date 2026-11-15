# Pequenos Astronautas em 3D

## Actualizar no Windows

1. Pára o backend no PyCharm. Extrai o ZIP para uma pasta separada.
2. Abre o PowerShell na pasta extraída. Indica o caminho da instalação existente.

   ```powershell
   .\actualizar.ps1 -Projecto "C:\caminho\para\Pequenos_Astronautas_Demo_Completa"
   ```

3. Arranca o `backend/run.py` com o ambiente virtual. Abre [o jogo local](http://127.0.0.1:8000/) e recarrega a página. Se `ASTRO_FRONTEND` aponta para `frontend/dist`, executa `npm run build` na pasta `frontend` antes de arrancar.

O jogo usa o estado JSON das partidas para guardar diagnósticos e resultados. A actualização usa o mesmo banco de dados e o mesmo ambiente virtual.

## Usar os equipamentos

| Etapa | Acção |
|---|---|
| Aviso | O triângulo, o marcador laranja e a seta indicam qual aparelho precisa de atenção. A seta também indica a distância. |
| Interacção | Anda com **WASD**, setas ou joystick. Entra na sala indicada, aproxima-te do equipamento e prime **E** ou usa o ícone do scanner. Executa o diagnóstico no visor. |
| Resolução | Executa uma das opções no visor. No nível Comandante, também podes escrever a tua manobra e confirmar a interpretação. A decisão altera o visor e aparece no diário. Uma consequência que exige recuperação volta a assinalar o aparelho. |

A cabine tem consola de navegação, rádio, sensor de estrelas, circuito de arrefecimento, quadro de energia, válvulas, filtro, reciclador e abrigo. A base montada inclui um rádio de longo alcance, um retransmissor, um quadro de energia, um painel solar, uma bancada de ferramentas, um abrigo, uma estação de limpeza e um analisador de amostras. O rover e o prospector ficam no exterior. Podes testar aparelhos mesmo quando estão operacionais.

### Exemplo de telecomunicações

Quando o sinal fica bloqueado pelo relevo ou pela posição do Sol, segue a seta até à sala de comunicações. Entra na sala, abre o rádio de longo alcance, executa o diagnóstico e aplica o procedimento. No cooperativo, os dois jogadores ligados podem diagnosticar e validar a mesma acção no equipamento.

## Explorar a Lua

Escolhe o pouso no globo. Na superfície lunar, podes atravessar o meridiano, passar pelos polos e dar a volta à esfera. O raio da Lua no jogo é **130 m**, com aproximadamente **817 m de circunferência**. O terreno é gerado para o jogo, com crateras, declives e rochas. O globo do HUD mostra o pouso a ciano e a tua posição a laranja. A seta de regresso aparece quando te afastas da zona da base. Usa **Espaço** para saltar.

Em Marte, a área jogável continua com **48 × 36 m** e inclui tempestades de poeira. Para tirar o traje, monta as três salas, entra na base com energia e oxigénio e usa o escudo. Veste-o novamente antes de sair.

