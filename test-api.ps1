param(
    [string]$ApiUrl = "http://localhost:5000/api"
)

Write-Host "=== Testing All StockPulse API Endpoints ===" -ForegroundColor Green
Write-Host ""
Write-Host "API Base URL: $ApiUrl" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description
    )
    
    Write-Host "Testing: $Method $Endpoint" -ForegroundColor Yellow
    Write-Host "Description: $Description"
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$ApiUrl$Endpoint" -Method Get
        } else {
            $response = Invoke-RestMethod -Uri "$ApiUrl$Endpoint" -Method $Method -ContentType "application/json"
        }
        
        if ($response.success -eq $true -or $response.status) {
            Write-Host "✓ PASS" -ForegroundColor Green
        } else {
            Write-Host "✓ OK (No success field)" -ForegroundColor Green
        }
        
        Write-Host "Response: $($response | ConvertTo-Json | Select-Object -First 100)"
    }
    catch {
        Write-Host "✗ FAIL" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
    
    Write-Host ""
}

# Test all endpoints
Test-Endpoint "GET" "/health" "Check server health"
Test-Endpoint "GET" "/stocks" "Get all stocks"
Test-Endpoint "GET" "/stocks?search=INFY" "Search stocks"
Test-Endpoint "GET" "/stocks/nifty/data" "Get NIFTY data"
Test-Endpoint "GET" "/indian/trending" "Get trending stocks"
Test-Endpoint "GET" "/indian/details/INFY" "Get stock details"
Test-Endpoint "GET" "/indian/news" "Get market news"
Test-Endpoint "GET" "/indian/ipo" "Get IPO data"
Test-Endpoint "GET" "/indian/mutual-funds" "Get mutual funds"
Test-Endpoint "GET" "/indian/announcements" "Get announcements"
Test-Endpoint "GET" "/watchlist/user123" "Get watchlist"

Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host "All endpoints tested!"
Write-Host ""
Write-Host "Endpoint Summary:" -ForegroundColor Cyan
Write-Host "- Health Check: /api/health"
Write-Host "- Stocks: /api/stocks"
Write-Host "- Stock Details: /api/indian/details/:symbol"
Write-Host "- Trending: /api/indian/trending"
Write-Host "- News: /api/indian/news"
Write-Host "- IPO: /api/indian/ipo"
Write-Host "- Mutual Funds: /api/indian/mutual-funds"
Write-Host "- Announcements: /api/indian/announcements"
Write-Host "- Watchlist: /api/watchlist/:userId"
