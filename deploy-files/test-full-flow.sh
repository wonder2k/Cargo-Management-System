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

# ========================================
echo -e "${CYAN}[01/15] 健康检查${NC}"
HTTP=$(api_get "/health"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
[ "$ST" = "200" ] && log_pass "GET /health" || log_fail "GET /health → $ST"
echo "  $BD"

# ========================================
echo ""
echo -e "${CYAN}[02/15] 注册新用户${NC}"
TS=$(date +%s)
EMAIL="test$TS@example.com"
HTTP=$(api POST "/api/auth/register" "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\",\"name\":\"User$TS\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
if [ "$ST" = "201" ]; then log_pass "注册 $EMAIL"; else log_fail "注册 → $ST"; fi

# ========================================
echo ""
echo -e "${CYAN}[03/15] 管理员登录${NC}"
HTTP=$(api POST "/api/auth/login" "{\"email\":\"wonder2k@gmail.com\",\"password\":\"admin123\"}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
NAME=$(json_val "$BD" "name")
if [ "$ST" = "200" ]; then log_pass "登录 (${NAME:-admin})"; else log_fail "登录 → $ST"; fi

# ========================================
echo ""
echo -e "${CYAN}[04/15] 创建客户${NC}"
CODE="CUST$TS"
HTTP=$(api POST "/api/business/customers" "{
  \"code\":\"$CODE\",\"name\":\"测试客户$TS\",\"countryCode\":\"CN\",
  \"type\":\"direct\",\"creditLimit\":100000,\"creditCurrency\":\"CNY\",
  \"paymentTerms\":\"monthly\",\"email\":\"cust$TS@test.com\",\"tier\":2,\"status\":\"active\"
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
CUST_ID=$(json_val "$BD" "id")
[ "$ST" = "200" ] && log_pass "创建客户 ID=$CUST_ID" || log_fail "创建客户 → $ST"

# ========================================
echo ""
echo -e "${CYAN}[05/15] 创建运价（含报关方式+杂费）${NC}"
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
[ "$ST" = "200" ] && log_pass "创建运价 ID=$RATE_ID" || log_fail "创建运价 → $ST"
echo "  customsMethods: $(echo "$BD" | grep -o '"customsMethods":{[^}]*}' | head -1 | cut -c1-80)..."
echo "  miscFees: $(echo "$BD" | grep -o '"miscFees":\[[^]]*\]' | head -1 | cut -c1-80)..."

# ========================================
echo ""
echo -e "${CYAN}[06/15] 生成报价${NC}"
QT_NO="QT-$(date +%H%M%S)"
HTTP=$(api POST "/api/business/quotes" "{
  \"quotationNo\":\"$QT_NO\",\"customerId\":$CUST_ID,
  \"customerName\":\"测试客户$TS\",\"recipientInfo\":\"Contact: Mr.Test\nPhone: 1380000\",
  \"routes\":[{\"origin\":\"CAN\",\"destination\":\"MIA\",\"carrier\":\"Atlas Air\",\"basePrice\":18.5,\"finalPrice\":24.5,\"adjustment\":\"+0%\"}],
  \"currency\":\"CNY\",\"validUntil\":\"2026-06-15\",\"status\":\"sent\",\"userName\":\"Admin\"
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
QT_ID=$(json_val "$BD" "id")
[ "$ST" = "200" ] && log_pass "生成报价 ID=$QT_NO" || log_fail "生成报价 → $ST"

# ========================================
echo ""
echo -e "${CYAN}[07/15] 创建订舱${NC}"
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
[ "$ST" = "200" ] && log_pass "创建订舱 ID=$BK_ID BK_NO=$BK_NO" || log_fail "创建订舱 → $ST"

# ========================================
echo ""
echo -e "${CYAN}[08/15] 订舱流程: 确认舱位 → 客户接受${NC}"
HTTP=$(api PUT "/api/business/bookings/$BK_ID" "{\"status\":\"space_confirmed\",\"internalNotes\":\"舱位已确认\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "确认舱位" || log_fail "确认舱位 $ST"

HTTP=$(api PUT "/api/business/bookings/$BK_ID" "{\"status\":\"client_accepted\",\"shipperInfo\":\"Shipper Corp, Guangzhou, Contact: +86 1380000\",\"consigneeInfo\":\"Consignee Inc, 1234 NW 12th St, Miami, FL\",\"alsoNotify\":\"Notify Party LLC, notify@example.com\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "客户接受订舱" || log_fail "客户接受 $ST"

# ========================================
echo ""
echo -e "${CYAN}[09/15] 操作: 签发 MAWB${NC}"
MW_NO="406-$(date +%H%M%S)"
HTTP=$(api POST "/api/operation/mawbs/from-booking" "{
  \"bookingNo\":\"$BK_NO\",\"mawbNo\":\"$MW_NO\",
  \"weight\":850.5,\"chargeableWeight\":920.0,\"pieces\":10,\"volume\":12.3
}")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
MW_ID=$(json_val "$BD" "id")
[ "$ST" = "201" ] && log_pass "签发 MAWB ID=$MW_NO" || log_fail "签发 MAWB → $ST"

# 验证订舱已变成 finalized
HTTP=$(api_get "/api/business/bookings")
BD=$(extract_json "$HTTP")
MATCH=$(echo "$BD" | grep "$BK_NO" | grep "finalized" || true)
[ -n "$MATCH" ] && log_pass "订舱状态→finalized 验证通过" || log_fail "订舱状态验证失败 (未找到 finalized)"

# ========================================
echo ""
echo -e "${CYAN}[10/15] 操作工作流: 入库→报关→理货→追踪${NC}"
HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"warehouse_in\",\"weight\":850.5,\"chargeableWeight\":920.0,\"pieces\":10,\"dimensions\":[{\"l\":120,\"w\":80,\"h\":90}],\"remarks\":\"All pallets received intact\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "入库确认 (warehouse_in)" || log_fail "入库 $ST"

HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"customs\",\"remarks\":\"Customs cleared without inspection\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "报关完成 (customs)" || log_fail "报关 $ST"

HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"terminal_in\",\"remarks\":\"ULD buildup completed\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "分拨理货 (terminal_in)" || log_fail "理货 $ST"

HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"departed\",\"atd\":\"2026-06-01T10:30:00Z\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "起飞 (departed) ATD已设置" || log_fail "起飞 $ST"

HTTP=$(api POST "/api/operation/mawbs/$MW_ID/status" "{\"status\":\"arrived\",\"ata\":\"2026-06-02T06:15:00Z\"}")
ST=$(extract_http "$HTTP"); [ "$ST" = "200" ] && log_pass "到达 (arrived) ATA已设置" || log_fail "到达 $ST"

# ========================================
echo ""
echo -e "${CYAN}[11/15] 关闭 MAWB → 自动生成 AR/AP${NC}"
HTTP=$(api POST "/api/operation/mawbs/$MW_ID/close")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
MSG=$(json_val "$BD" "message")
[ "$ST" = "200" ] && log_pass "关闭 MAWB (MSG: ${MSG:--})" || log_fail "关闭 MAWB → $ST"

# ========================================
echo ""
echo -e "${CYAN}[12/15] 财务验证: AR + AP + Stats${NC}"
HTTP=$(api_get "/api/finance/ar"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
AR_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
[ "$ST" = "200" ] && log_pass "AR 列表 OK (共${AR_CNT}条)" || log_fail "AR 列表 $ST"

HTTP=$(api_get "/api/finance/ap"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
AP_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
[ "$ST" = "200" ] && log_pass "AP 列表 OK (共${AP_CNT}条)" || log_fail "AP 列表 $ST"

HTTP=$(api_get "/api/finance/stats"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
TAR=$(json_val "$BD" "totalAR"); TAP=$(json_val "$BD" "totalAP")
[ "$ST" = "200" ] && log_pass "财务统计 OK (AR: $TAR, AP: $TAP)" || log_fail "财务统计 $ST"

# ========================================
echo ""
echo -e "${CYAN}[13/15] 操作统计${NC}"
HTTP=$(api_get "/api/operation/stats"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
[ "$ST" = "200" ] && log_pass "操作统计 OK ($BD)" || log_fail "操作统计 $ST"

# ========================================
echo ""
echo -e "${CYAN}[14/15] 用户管理${NC}"
HTTP=$(api_get "/api/auth/users"); ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
U_CNT=$(echo "$BD" | grep -o '"id"' | wc -l)
[ "$ST" = "200" ] && log_pass "用户列表 OK (共${U_CNT}个用户)" || log_fail "用户列表 $ST"

# ========================================
echo ""
echo -e "${CYAN}[15/16] 修改用户 Tier + 区域权限${NC}"
HTTP=$(api PUT "/api/auth/users/1" "{\"tier\":3,\"regions\":[\"AsiaPacific\",\"Americas\"]}")
ST=$(extract_http "$HTTP")
[ "$ST" = "200" ] && log_pass "用户权限更新 OK" || log_fail "用户权限更新 $ST"

# ========================================
echo ""
echo -e "${CYAN}[16/16] 文件上传测试${NC}"
# 创建测试 PDF（实际内容无所谓，扩展名必须允许）
cp "$(which bash)" /tmp/jcargo-test-upload.pdf
HTTP=$(api_upload "/api/upload" "/tmp/jcargo-test-upload.pdf")
ST=$(extract_http "$HTTP"); BD=$(extract_json "$HTTP")
URL=$(json_val "$BD" "fileUrl")
[ "$ST" = "200" ] && log_pass "文件上传 OK (url: $URL)" || log_fail "文件上传 $ST"
rm -f /tmp/jcargo-test-upload.pdf

# ========================================
# 结果汇总
echo ""
echo "=========================================================="
echo -e "  结果: ${GREEN}$PASS 通过${NC} / ${RED}$FAIL 失败${NC} / $((PASS+FAIL)) 总计"
echo "=========================================================="
echo ""

rm -f "$COOKIE_JAR"

[ "$FAIL" -eq 0 ] && echo -e "${GREEN}🎉 全流程测试通过！${NC}" || echo -e "${RED}⚠️  有 $FAIL 项测试失败${NC}"
exit $FAIL
