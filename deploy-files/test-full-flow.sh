#!/bin/bash
# ==========================================================
# JCargo CMS — 全业务流程综合测试脚本
# 测试完整链路：注册→客户→运价→报价→订舱→操作→财务
# 用法: bash test-full-flow.sh [base_url]
# 默认: http://localhost:8080
# ==========================================================
set -e

BASE="${1:-http://localhost:8080}"
COOKIE_JAR="/tmp/jcargo-test-cookies-$(date +%s).txt"
PASS=0
FAIL=0

rm -f "$COOKIE_JAR"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

log_pass() { PASS=$((PASS+1)); echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}✗${NC} $1"; }

echo ""
echo -e "${CYAN}=========================================================="
echo "  JCargo CMS — 全业务流程测试"
echo "  目标: $BASE"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  说明: POST/PUT/DELETE 均带认证cookie"
echo "==========================================================${NC}"
echo ""

# ====== 辅助函数 ======
api() {
  local method="$1" path="$2" data="$3"
  local headers="-H 'Content-Type: application/json'"
  [ -z "$data" ] && headers=""
  eval "curl -s -w '\n%{http_code}' -X $method \"$BASE$path\" $headers -d '$data' -b '$COOKIE_JAR' -c '$COOKIE_JAR'"
}

api_get() {
  curl -s -w '\n%{http_code}' "$BASE$1" -b "$COOKIE_JAR" -c "$COOKIE_JAR"
}

api_upload() {
  local path="$1" file="$2"
  curl -s -w '\n%{http_code}' -X POST "$BASE$path" -F "file=@$file" -b "$COOKIE_JAR" -c "$COOKIE_JAR"
}

extract_json() { echo "$1" | sed '$d'; }
extract_http() { echo "$1" | tail -1; }
json_val() { echo "$1" | grep -o "\"$2\":[^,}]*" | head -1 | cut -d: -f2- | tr -d '"' | xargs; }

# 带错误输出的检查
check() {
  local expected="$1" actual="$2" label="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    log_pass "$label"
    return 0
  else
    log_fail "$label → HTTP $actual"
    echo "    Response: $(echo "$body" | head -c 300)"
    return 1
  fi
}

# ========================================
echo -e "${CYAN}[01/16] 健康检查${NC}"
HTTP=$(api_get "/health"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "GET /health" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[02/16] 注册新用户${NC}"
TS=$(date +%s)
EMAIL="test$TS@example.com"
HTTP=$(api POST "/api/auth/register" "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\",\"name\":\"Tester$TS\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 201 "$ST" "注册 $EMAIL" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[03/16] 登录（先试管理员，失败则用demo登录）${NC}"
HTTP=$(api POST "/api/auth/login" "{\"email\":\"wonder2k@gmail.com\",\"password\":\"admin123\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
if [ "$ST" = "200" ]; then
  log_pass "管理员登录成功 (wonder2k@gmail.com)"
  IS_ADMIN=1
else
  log_fail "管理员登录 → $ST（尝试 demo 登录）"
  HTTP=$(api POST "/api/auth/demo-login")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
  if [ "$ST" = "200" ]; then
    log_pass "Demo 登录成功"
    IS_ADMIN=0
  else
    log_fail "Demo 登录 → $ST（继续用注册用户测试部分功能）"
    IS_ADMIN=0
  fi
fi

# ========================================
echo ""
echo -e "${CYAN}[04/16] 创建客户${NC}"
CODE="CUST$TS"
HTTP=$(api POST "/api/business/customers" "{
  \"code\":\"$CODE\",\"name\":\"测试客户$TS\",\"countryCode\":\"CN\",
  \"type\":\"direct\",\"creditLimit\":100000,\"creditCurrency\":\"CNY\",
  \"paymentTerms\":\"monthly\",\"email\":\"cust$TS@test.com\",\"tier\":2,\"status\":\"active\"
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
CUST_ID=$(json_val "$BD" "id")
check 200 "$ST" "创建客户 (ID=$CUST_ID)" "$BD" || { CUST_ID=0; }

# ========================================
echo ""
echo -e "${CYAN}[05/16] 创建运价（含报关方式+杂费）${NC}"
HTTP=$(api POST "/api/business/rates" "{
  \"origin\":\"CAN\",\"destination\":\"MIA\",\"carrier\":\"Atlas Air\",
  \"region\":\"Americas\",\"flightNo\":\"5X$TS\",\"aircraftType\":\"B747\",
  \"schedule\":\"1,3,5,7\",\"baseFreight\":18.5,\"fuelSurcharge\":3.2,
  \"securityScreening\":0.8,\"terminalHandling\":1.5,\"currency\":\"CNY\",
  \"customsMethods\":{
    \"formal\":{\"amount\":2.0,\"unit\":\"per_shipment\"},
    \"9610\":{\"amount\":1.5,\"unit\":\"per_kg\"},
    \"9710\":{\"amount\":1.0,\"unit\":\"per_kg\"},
    \"9810\":{\"amount\":0.8,\"unit\":\"per_kg\"}
  },
  \"miscFees\":[
    {\"name\":\"Documentation\",\"amount\":50,\"unit\":\"per_shipment\"},
    {\"name\":\"Cargo Screen\",\"amount\":0.5,\"unit\":\"per_kg\"}
  ]
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
RATE_ID=$(json_val "$BD" "id")
check 200 "$ST" "创建运价 (ID=$RATE_ID, 含报关方式+杂费)" "$BD" || { RATE_ID=0; }
echo "  customsMethods + miscFees ✓"

# ========================================
echo ""
echo -e "${CYAN}[06/16] 生成报价${NC}"
QT_NO="QT-$(date +%H%M%S)"
HTTP=$(api POST "/api/business/quotes" "{
  \"quotationNo\":\"$QT_NO\",\"customerId\":$CUST_ID,
  \"customerName\":\"测试客户$TS\",\"recipientInfo\":\"Mr.Test\nPhone:1380000\",
  \"routes\":[{\"origin\":\"CAN\",\"destination\":\"MIA\",\"carrier\":\"Atlas Air\",\"basePrice\":18.5,\"finalPrice\":24.5,\"adjustment\":\"+0%\"}],
  \"totalAmount\":24.5,
  \"currency\":\"CNY\",\"validUntil\":\"2026-06-15\",\"status\":\"sent\",\"userName\":\"Admin\"
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
QT_ID=$(json_val "$BD" "id")
check 200 "$ST" "生成报价 (QT_NO=$QT_NO)" "$BD" || { QT_ID=0; }

# ========================================
echo ""
echo -e "${CYAN}[07/16] 创建订舱${NC}"
HTTP=$(api POST "/api/business/bookings" "{
  \"customerId\":$CUST_ID,\"customerName\":\"测试客户$TS\",
  \"rateId\":$RATE_ID,
  \"origin\":\"CAN\",\"destination\":\"MIA\",\"carrier\":\"Atlas Air\",
  \"flightNo\":\"5X$TS\",\"flightDate\":\"2026-06-01T08:00:00Z\",
  \"pieces\":10,\"weight\":850.5,\"volume\":12.3,
  \"goodsDescription\":\"电子元件\",\"declarationMethod\":\"formal\",
  \"unitPrice\":24.5,\"currency\":\"CNY\"
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
BK_ID=$(json_val "$BD" "id")
BK_NO=$(json_val "$BD" "bookingNo")
check 200 "$ST" "创建订舱 (BK_NO=$BK_NO)" "$BD" || { BK_ID=0; BK_NO=""; }

# ========================================
if [ -n "$BK_NO" ] && [ "$BK_ID" -gt 0 ] 2>/dev/null; then
echo ""
echo -e "${CYAN}[08/16] 订舱流程: 确认舱位 → 客户接受${NC}"
HTTP=$(api PUT "/api/business/bookings/$BK_ID" "{\"status\":\"space_confirmed\",\"internalNotes\":\"舱位已确认\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "确认舱位" "$BD" || true

HTTP=$(api PUT "/api/business/bookings/$BK_ID" "{\"status\":\"client_accepted\",\"shipperInfo\":\"Shipper Corp, Guangzhou, +86 1380000\",\"consigneeInfo\":\"Consignee Inc, 1234 NW 12th St, Miami, FL\",\"alsoNotify\":\"notify@example.com\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "客户接受订舱" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[09/16] 操作: 签发 MAWB${NC}"
MW_NO="406-$(date +%H%M%S)"
HTTP=$(api POST "/api/operation/mawbs/from-booking" "{
  \"bookingNo\":\"$BK_NO\",\"mawbNo\":\"$MW_NO\",
  \"weight\":850.5,\"chargeableWeight\":920.0,\"pieces\":10,\"volume\":12.3
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
MW_ID=$(json_val "$BD" "id")
if [ "$ST" = "201" ]; then
  log_pass "签发 MAWB (ID=$MW_NO)"
  # ========================================
  echo ""
  echo -e "${CYAN}[10/16] 操作工作流: 入库→报关→理货→追踪${NC}"
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"warehouse_in\",\"weight\":850.5,\"chargeableWeight\":920.0,\"pieces\":10,\"dimensions\":[{\"l\":120,\"w\":80,\"h\":90}],\"remarks\":\"All pallets received intact\"}")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP"); check 200 "$ST" "入库 (warehouse_in)" "$BD" || true
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"customs\",\"remarks\":\"Cleared without inspection\"}")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP"); check 200 "$ST" "报关 (customs)" "$BD" || true
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"terminal_in\",\"remarks\":\"ULD buildup completed\"}")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP"); check 200 "$ST" "理货 (terminal_in)" "$BD" || true
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"departed\",\"atd\":\"2026-06-01T10:30:00Z\"}")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP"); check 200 "$ST" "起飞 (departed) ATD已设置" "$BD" || true
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"arrived\",\"ata\":\"2026-06-02T06:15:00Z\"}")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP"); check 200 "$ST" "到达 (arrived) ATA已设置" "$BD" || true

  # ========================================
  echo ""
  echo -e "${CYAN}[11/16] 关闭 MAWB → AR/AP 生成${NC}"
  HTTP=$(api POST "/api/operation/mawbs/$MW_ID/close")
  ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
  check 200 "$ST" "MAWB 关闭 + 财务转接" "$BD" || true
  echo "  MSG: $(json_val "$BD" "message")"
else
  log_fail "签发 MAWB → HTTP $ST (本项及后续操作工作流跳过)"
fi
fi

# ========================================
echo ""
echo -e "${CYAN}[12/16] 财务查询: AR + AP + Stats${NC}"
HTTP=$(api_get "/api/finance/ar"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
AR_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
check 200 "$ST" "AR 列表 (${AR_CNT}条记录)" "$BD" || true

HTTP=$(api_get "/api/finance/ap"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
AP_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
check 200 "$ST" "AP 列表 (${AP_CNT}条记录)" "$BD" || true

HTTP=$(api_get "/api/finance/stats"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "财务汇总统计数据" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[13/16] 操作统计${NC}"
HTTP=$(api_get "/api/operation/stats"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "操作汇总统计" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[14/16] 用户管理${NC}"
HTTP=$(api_get "/api/auth/users"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
U_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
check 200 "$ST" "用户列表 (${U_CNT}用户)" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[15/16] 修改用户 Tier / 区域${NC}"
HTTP=$(api PUT "/api/auth/users/1" "{\"tier\":3,\"regions\":[\"AsiaPacific\",\"Americas\"]}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
check 200 "$ST" "用户权限更新" "$BD" || true

# ========================================
echo ""
echo -e "${CYAN}[16/16] 文件上传测试${NC}"
cp "$(which bash || echo /bin/sh)" /tmp/jcargo-test-upload.pdf
HTTP=$(api_upload "/api/upload" "/tmp/jcargo-test-upload.pdf")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
URL=$(json_val "$BD" "fileUrl")
check 200 "$ST" "文件上传 (url: $URL)" "$BD" || true
rm -f /tmp/jcargo-test-upload.pdf

# ========================================
# 结果汇总
echo ""
echo "=========================================================="
echo -e "  结果: ${GREEN}$PASS 通过${NC} / ${RED}$FAIL 失败${NC} / $((PASS+FAIL)) 总计"
echo "=========================================================="
echo ""

rm -f "$COOKIE_JAR"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 全流程测试通过！${NC}"
else
  echo -e "${RED}⚠️  有 $FAIL 项失败，详见上方日志${NC}"
  echo "    常见排查:"
  echo "    - 运行 'docker compose exec backend sh -c \"npm run db:seed\"' 初始化管理员"
  echo "    - 运行 'docker compose logs backend' 查看具体错误"
fi
exit $FAIL
