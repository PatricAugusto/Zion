# Zion

O Zion começa como uma interface de terminal para explorar conceitos de
consciência e segurança espacial em um ambiente demonstrativo.

## Executar

Requer Node.js 20 ou superior. O projeto não tem dependências externas.

```powershell
npm start
```

No painel, use `1` para objetos, `2` para alertas, `3` para princípios de
segurança e `q` para sair. Para executar os testes:

```powershell
npm test
```

Os testes unitários e de integração também podem ser executados separadamente:

```powershell
npm run test:unit
npm run test:integration
```

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

## Limites desta versão

Todos os setores, objetos e alertas são fictícios. O Zion não recebe telemetria,
não consulta dados orbitais e não envia comandos a sistemas externos. O mapa é
esquemático e não está em escala.
