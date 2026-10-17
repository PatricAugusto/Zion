# Zion

O Zion começa como uma interface de terminal para explorar conceitos de
consciência e segurança espacial em um ambiente demonstrativo.

## Executar

Requer Node.js 20 ou superior. O projeto não tem dependências externas.

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
| `5` | Resumo dos rótulos dos alertas fictícios |
| `6` | Princípios e limites de segurança |
| `7` | Séries de observabilidade sintéticas |
| `8` | Leitura guiada e estatísticas descritivas |
| `9` | Registro de eventos da sessão atual |
| `q` | Sair |

Para executar os testes:

```powershell
npm test
```

O comando principal abre o console de testes do Zion, depois usa o test runner
nativo do Node.js para descobrir automaticamente todos os arquivos `*.test.js`
dentro de `test/`. O relatório detalhado original e o código de falha são
preservados:

```powershell
npm test
```

As camadas também podem ser executadas separadamente:

```powershell
npm run test:unit
npm run test:integration
npm run test:security
```

O `npm test` preserva o relatório detalhado do Node.js e acrescenta um painel
com totais, taxa de aprovação, duração e resultados por grupo. A suíte também
limita a sessão local após 10 entradas inválidas consecutivas; uma opção de
tela válida reinicia a contagem. O limite reduz floods acidentais ou locais no
menu, mas não é autenticação nem proteção contra DDoS de rede.

O painel resume os indicadores e compara os setores em uma tabela; o menu
agrupa as telas por assunto. O console usa cor apenas em terminais interativos;
defina `NO_COLOR` para desativá-la. A moldura é apenas visual: a execução
continua local e não realiza operações de rede ou ações externas.

A suíte de segurança verifica entradas hostis e extensas no menu, floods de
entradas, tentativas de injeção ANSI/OSC, caracteres de controle nas telas e
limites de dimensões do terminal. Ela é descoberta por `npm test` e executada
no CI para cada versão suportada do Node.js. Esses testes são verificações
automatizadas de regressão, não uma certificação ou auditoria de segurança
independente.

## Segurança

O fluxo de CI em `.github/workflows/ci.yml` executa testes unitários e de
integração no Node.js 20, 22 e 24 e verifica dependências com `npm audit`.
O projeto não possui dependências de terceiros. Para repetir a auditoria local:

```powershell
npm run security:audit
```

O menu aceita somente as opções documentadas; escolhas inválidas, inclusive
nomes de propriedades herdadas do JavaScript, não selecionam telas. Cores ANSI
são desativadas fora de um terminal interativo. O `.gitignore` exclui arquivos
de ambiente e artefatos locais comuns.

Dez escolhas inválidas consecutivas encerram o processo com aviso explícito;
abrir uma tela válida zera o contador. Como o Zion não oferece autenticação nem
serviço de rede, esse controle protege o loop do terminal contra repetição
excessiva, mas não é um mecanismo anti-DDoS distribuído.

O registro da opção `9` mantém até 50 eventos em memória durante a sessão atual.
Ele usa rótulos fixos para início, telas abertas, opções inválidas e encerramento;
o texto digitado pelo usuário não é armazenado. Os eventos são descartados ao
fechar o processo e não constituem auditoria persistente.

As análises verificam a integridade estrutural e exibem contagens do conjunto
fictício local. Não estimam órbitas, colisões, trajetórias, riscos ou estados
reais, e não constituem recomendações operacionais. A cor é apenas decoração;
as etiquetas de texto permanecem presentes sem ANSI. A interface usa um painel
de terminal com indicadores locais; o modo colorido é ativado apenas em
terminais interativos e pode ser desativado definindo `NO_COLOR`.

## Observabilidade para aprendizado

As opções `7` e `8` apresentam seis ciclos relativos e três séries didáticas:
registros processados no cenário, eventos fictícios e preenchimento dos campos
da amostra. Mínimo, média, máximo e variação entre o primeiro e o último ciclo
são estatísticas descritivas; não há previsão, correlação ou inferência causal.
Os ciclos não têm horário de calendário, e as séries não são telemetria nem
métricas físicas.

## Limites desta versão

Todos os setores, objetos e alertas são fictícios. O Zion não recebe telemetria,
não consulta dados orbitais e não envia comandos a sistemas externos. O mapa é
esquemático e não está em escala.

O painel prioriza os indicadores e as contagens por setor. Os gráficos
decorativos foram removidos para reduzir ruído visual e deixar os dados
comparáveis; títulos, dados fictícios e limites de segurança continuam
identificados.
