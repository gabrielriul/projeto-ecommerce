#!/usr/bin/env bash
# Smoke test contra MongoDB REAL: sobe o servidor e percorre o fluxo
# principal da loja com curl, validando as respostas.
set -e

node server.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT
sleep 2

BASE="http://localhost:${PORT:-3000}"
JAR=$(mktemp)

falha() { echo "FALHOU: $1"; exit 1; }

echo "1. Documentação da API"
curl -sf "$BASE/" | grep -q '"rotas"' || falha "GET /"

echo "2. Cadastro de usuário"
curl -sf -X POST "$BASE/auth/cadastro" -H 'Content-Type: application/json' \
  -d '{"nome":"Usuário Smoke","email":"smoke@email.com","senha":"teste123"}' \
  | grep -q 'cadastrado com sucesso' || falha "cadastro"

echo "3. Cadastro sem campos obrigatórios -> mensagem de erro"
curl -s -X POST "$BASE/auth/cadastro" -H 'Content-Type: application/json' -d '{}' \
  | grep -qi 'senha' || falha "validação de campos"

echo "4. Login (cria a sessão)"
curl -sf -c "$JAR" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"smoke@email.com","senha":"teste123"}' \
  | grep -qi 'bem-vindo' || falha "login"

echo "5. Acesso sem login é bloqueado (401)"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/pedidos")
[ "$CODIGO" = "401" ] || falha "esperado 401, veio $CODIGO"

echo "6. Cadastro de produto (com sessão)"
PRODUTO_ID=$(curl -sf -b "$JAR" -X POST "$BASE/produtos" -H 'Content-Type: application/json' \
  -d '{"nome":"Produto Smoke","preco":99.9,"categoria":"testes","estoque":10}' \
  | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$PRODUTO_ID" ] || falha "criação de produto"

echo "7. Busca por nome (parâmetro GET)"
curl -sf "$BASE/produtos?nome=smoke" | grep -q 'Produto Smoke' || falha "busca por nome"

echo "8. Criação de pedido (usuário da sessão; baixa estoque)"
curl -sf -b "$JAR" -X POST "$BASE/pedidos" -H 'Content-Type: application/json' \
  -d "{\"itens\":[{\"produtoId\":\"$PRODUTO_ID\",\"quantidade\":2}]}" \
  | grep -q '"status":"pendente"' || falha "pedido"

echo "9. Estoque baixado de 10 para 8"
curl -sf "$BASE/produtos/$PRODUTO_ID" | grep -q '"estoque":8' || falha "baixa de estoque"

echo "10. Logout encerra a sessão"
curl -sf -b "$JAR" -X POST "$BASE/auth/logout" | grep -qi 'logout realizado' || falha "logout"
CODIGO=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/auth/perfil")
[ "$CODIGO" = "401" ] || falha "sessão deveria ter sido encerrada (veio $CODIGO)"

echo "11. Erro tratado pela biblioteca (id inválido) -> 400 com mensagem"
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/produtos/id-invalido")
[ "$CODIGO" = "400" ] || falha "esperado 400, veio $CODIGO"

echo "12. Arquivo de log de exceções foi gravado"
[ -s logs/erros.log ] || falha "logs/erros.log vazio"

echo
echo "SMOKE TEST OK - todos os passos passaram"
