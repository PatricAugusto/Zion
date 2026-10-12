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
| `q` | Sair |

Para executar os testes:

```powershell
npm test
```

O comando principal usa o test runner nativo do Node.js, descobre
automaticamente todos os arquivos `*.test.js` dentro de `test/` e apresenta
um resumo único das suítes executadas:

```powershell
npm test
```

As camadas também podem ser executadas separadamente:

```powershell
npm run test:unit
npm run test:integration
npm run test:security
```

A suíte de segurança verifica entradas hostis e extensas no menu, tentativas de
injeção ANSI/OSC, caracteres de controle nas telas e limites de dimensões do
terminal. Ela é descoberta por `npm test` e executada no CI para cada versão
suportada do Node.js. Esses testes são verificações automatizadas de regressão,
não uma certificação ou auditoria de segurança independente.

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

As análises verificam a integridade estrutural e exibem contagens do conjunto
fictício local. Não estimam órbitas, colisões, trajetórias, riscos ou estados
reais, e não constituem recomendações operacionais. A cor é apenas decoração;
as etiquetas de texto permanecem presentes sem ANSI. A interface usa um painel
espacial em terminal com mapa conceitual e indicadores locais; o modo colorido
é ativado apenas em terminais interativos e pode ser desativado definindo
`NO_COLOR`.

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

O painel centraliza títulos, indicadores e avisos para facilitar a leitura;
linhas tabulares permanecem alinhadas para preservar a comparação de dados.
