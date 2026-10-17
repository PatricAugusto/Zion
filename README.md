# Zion

O Zion começa como uma interface de terminal para explorar conceitos de
consciência e segurança espacial em um ambiente demonstrativo.

## Executar

Requer Node.js 20 ou superior e npm. A persistência local usa SQLite por meio
do Prisma.

```powershell
npm start
```

No painel, use as opções para abrir objetos, alertas, análises locais e
princípios de segurança:

| Opção | Tela |
| --- | --- |
| `1` | Objetos do cenário |
| `2` | Alertas simulados |
| `3` | Integridade estrutural dos dados fictícios |
| `4` | Comparativo e contagens por setor |
| `5` | Resumo das prioridades visuais fictícias |
| `6` | Princípios e limites de segurança |
| `7` | Painel minimalista das séries de observabilidade |
| `8` | Leitura guiada e estatísticas descritivas |
| `9` | Registro de eventos da sessão atual |
| `a` | Administração do Creator (contas e auditoria) |
| `q` | Sair |

A tela de objetos reúne nove registros fictícios com perfil, estado,
preenchimento e ciclos demonstrativos. Esses valores permitem praticar
comparações entre itens e setores; não são telemetria nem medições físicas.

As telas `2` e `5` demonstram prioridades visuais fictícias: crítico em
vermelho, atenção em amarelo e normal em verde. Os rótulos servem para
demonstrar hierarquia e leitura rápida; a tela `2` mostra somente a prioridade
e um resumo curto, e a tela `5` apresenta contagens compactas. Não indicam
risco ou urgência reais.

Para executar os testes:

```powershell
npm test
```

O comando principal abre o console de testes do Zion, depois usa o test runner
nativo do Node.js para descobrir automaticamente todos os arquivos `*.test.js`
dentro de `test/`. O relatório detalhado e o código de falha são preservados.

As camadas também podem ser executadas separadamente:

```powershell
npm run test:unit
npm run test:integration
npm run test:security
```

Os testes unitários de autenticação verificam limites e normalização de
identificadores, hash de senha, rejeição genérica, bloqueio e desbloqueio de
contas, provisionamento exclusivo do Creator e validação dos eventos de
auditoria. Os testes de integração complementam essa cobertura exercitando o
SQLite real e as transações.

O `npm test` preserva o relatório detalhado do Node.js e acrescenta um painel
com totais, taxa de aprovação, duração e resultados por grupo. A suíte também
limita a sessão local após 10 entradas inválidas consecutivas; uma opção de
tela válida reinicia a contagem. O limite reduz floods acidentais ou locais no
menu, mas não é autenticação nem proteção contra DDoS de rede.

O painel usa uma hierarquia visual leve: resumo em destaque, setores em linhas
compactas e barras para comparar volumes do cenário. A cor destaca títulos e
estados somente em terminais interativos; defina `NO_COLOR` para desativá-la.
O layout se adapta à largura do terminal, e os rótulos continuam claros sem cor.
A moldura é apenas visual: a execução continua local e não realiza operações
de rede ou ações externas.

Em terminais interativos, a navegação usa seletores de teclado e campos
mascarados; as telas de integridade, setores, contas e registros usam tabelas
compactas. A conexão ao banco mostra um indicador de tarefa. Essas melhorias
usam Chalk, `@clack/prompts`, `cli-table3` e Ora. Em entrada redirecionada, a
CLI mantém o modo texto simples para continuar compatível com scripts e testes.
Pressionar Enter sem texto na confirmação de uma tela retorna ao painel; o
cancelamento do prompt continua sendo tratado separadamente.

A suíte de segurança verifica entradas hostis e extensas no menu, floods de
entradas, tentativas de injeção ANSI/OSC, caracteres de controle nas telas e
limites de dimensões do terminal. Ela é descoberta por `npm test` e executada
no CI para cada versão suportada do Node.js. Esses testes são verificações
automatizadas de regressão, não uma certificação ou auditoria de segurança
independente.

## Segurança

O fluxo de CI em `.github/workflows/ci.yml` executa testes unitários e de
integração no Node.js 20, 22 e 24 e verifica dependências com `npm audit`.
Para repetir a auditoria local:

```powershell
npm run security:audit
```

### Contas e acesso

Na primeira execução, o Zion solicita uma senha e confirmação para provisionar
a conta reservada `Creator`, com papel `MASTER`. A senha deve ter de 12 a 128
caracteres; é armazenado apenas um hash scrypt com salt aleatório. Não há senha
padrão, cadastro público ou credencial incluída no repositório. Em terminal
interativo, a senha não é exibida enquanto é digitada.

Nas execuções seguintes, todos os usuários precisam autenticar. Somente
`Creator` pode criar contas comuns, listar contas e consultar a auditoria pelo
menu de administração. Identificadores são normalizados e validados; a senha
não é registrada em logs. A autenticação rejeita credenciais com mensagem
genérica e bloqueia a conta por 15 minutos após cinco falhas.

### Banco de dados e auditoria

O SQLite local fica em `data/zion.db`, ignorado pelo Git. As migrações versionadas
em `prisma/migrations/` são aplicadas automaticamente pelo `npm start`; também
podem ser aplicadas com `npm run db:migrate`. Para criar uma nova migração de
desenvolvimento, use `npm run db:migrate:dev -- --name nome-da-migracao`.
O cliente Prisma é gerado no `npm install`.

Criação de conta e evento de auditoria são gravados na mesma transação, assim
uma falha ao registrar o evento também desfaz a criação. A auditoria persistente
mantém no máximo 10.000 eventos e o Admin Master pode consultar os 30 mais
recentes. Os eventos usam ações predefinidas, sem senha ou texto livre.

SQLite oferece transações ACID para os dados locais deste CLI; isso não substitui
backup, criptografia do disco, controles do sistema operacional ou alta
disponibilidade. O banco não é compartilhado em rede e não transforma o Zion
em um serviço multiusuário remoto.

As gravações disparadas por várias conexões Prisma no mesmo processo são
serializadas, e testes de integração cobrem bootstrap, criação de contas e
falhas de login concorrentes em duas conexões. Isso não coordena processos
independentes: execute uma única instância do Zion por arquivo SQLite; o arquivo
não foi projetado para autenticação concorrente entre processos ou máquinas.

O menu aceita somente as opções documentadas; escolhas inválidas, inclusive
nomes de propriedades herdadas do JavaScript, não selecionam telas. Cores ANSI
são desativadas fora de um terminal interativo. O `.gitignore` exclui o banco,
arquivos de ambiente e artefatos locais comuns.

Dez escolhas inválidas consecutivas encerram o processo com aviso explícito;
abrir uma tela válida zera o contador. O limite protege o loop do terminal
contra repetição excessiva, mas não é um mecanismo anti-DDoS distribuído.

O registro da opção `9` mantém até 50 eventos em memória durante a sessão atual.
O menu Admin Master oferece também uma auditoria persistente de autenticações,
abertura de telas, criação de contas e encerramento. Nenhum dos registros
armazena o texto digitado ou senhas.

As análises verificam a integridade estrutural e exibem contagens do conjunto
fictício local. Não estimam órbitas, colisões, trajetórias, riscos ou estados
reais, e não constituem recomendações operacionais. A cor é apenas decoração;
as etiquetas de texto permanecem presentes sem ANSI. A interface usa um painel
de terminal com indicadores locais; o modo colorido é ativado apenas em
terminais interativos e pode ser desativado definindo `NO_COLOR`.

## Observabilidade para aprendizado

As opções `7` e `8` apresentam seis ciclos relativos e três séries didáticas:
registros processados no cenário, eventos fictícios e preenchimento dos campos
da amostra. A opção `7` organiza os ciclos em linhas e as séries em colunas,
seguida por uma tabela de mínimo, média, máximo e variação entre o primeiro e o
último ciclo. São estatísticas descritivas; não há previsão, correlação ou inferência causal.
Os ciclos não têm horário de calendário, e as séries não são telemetria nem
métricas físicas.

## Limites desta versão

Todos os setores, objetos e alertas são fictícios. O Zion não recebe telemetria,
não consulta dados orbitais e não envia comandos a sistemas externos.

O painel prioriza indicadores, comparação por setor e uma leitura em destaque.
As barras são representações de contagens fictícias, não métricas orbitais;
títulos, dados demonstrativos e limites de segurança continuam identificados.
