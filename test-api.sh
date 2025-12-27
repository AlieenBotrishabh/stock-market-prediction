#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="${1:-http://localhost:5000/api}"

echo -e "${GREEN}=== Testing All StockPulse API Endpoints ===${NC}\n"
echo "API Base URL: $API_URL"
echo ""

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -e "${YELLOW}Testing:${NC} $method $endpoint"
    echo "Description: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s "$API_URL$endpoint")
    else
        response=$(curl -s -X "$method" "$API_URL$endpoint" -H "Content-Type: application/json")
    fi
    
    # Check if response contains "success"
    if echo "$response" | grep -q '"success"'; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    
    echo "Response: $(echo $response | head -c 100)..."
    echo ""
}

# Test all endpoints
test_endpoint "GET" "/health" "Check server health"
test_endpoint "GET" "/stocks" "Get all stocks"
test_endpoint "GET" "/stocks?search=INFY" "Search stocks"
test_endpoint "GET" "/stocks/nifty/data" "Get NIFTY data"
test_endpoint "GET" "/indian/trending" "Get trending stocks"
test_endpoint "GET" "/indian/details/INFY" "Get stock details"
test_endpoint "GET" "/indian/news" "Get market news"
test_endpoint "GET" "/indian/ipo" "Get IPO data"
test_endpoint "GET" "/indian/mutual-funds" "Get mutual funds"
test_endpoint "GET" "/indian/announcements" "Get announcements"
test_endpoint "GET" "/watchlist/user123" "Get watchlist"

echo -e "${GREEN}=== Test Summary ===${NC}"
echo "All endpoints tested!"
echo ""
echo "Endpoint Summary:"
echo "- Health Check: /api/health"
echo "- Stocks: /api/stocks"
echo "- Stock Details: /api/indian/details/:symbol"
echo "- Trending: /api/indian/trending"
echo "- News: /api/indian/news"
echo "- IPO: /api/indian/ipo"
echo "- Mutual Funds: /api/indian/mutual-funds"
echo "- Announcements: /api/indian/announcements"
echo "- Watchlist: /api/watchlist/:userId"
