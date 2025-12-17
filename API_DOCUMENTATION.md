# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API does not require authentication. Future versions will include JWT-based authentication.

## Response Format
All responses follow this format:

```json
{
  "success": true/false,
  "data": {},
  "message": "Optional message"
}
```

## Stocks Endpoints

### 1. Get All Stocks / Search Stocks
**Endpoint:** `GET /stocks`

**Query Parameters:**
- `search` (optional): Search by symbol or company name
- `category` (optional): Filter by category

**Example:**
```bash
curl http://localhost:5000/api/stocks?search=TCS
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "symbol": "TCS",
      "company_name": "Tata Consultancy Services",
      "current_price": 3850.50,
      "change_percent": 2.45,
      "change_amount": 92.50,
      "day_high": 3900,
      "day_low": 3800,
      "opening_price": 3825,
      "previous_close": 3758,
      "volume": "1234567",
      "market_cap": "1000000000000",
      "pe_ratio": 25.5,
      "fifty_two_week_high": 4200,
      "fifty_two_week_low": 3200,
      "price_history": [],
      "last_updated": "2024-01-20T10:30:00Z"
    }
  ]
}
```

---

### 2. Get NIFTY Data
**Endpoint:** `GET /stocks/nifty/data`

**Example:**
```bash
curl http://localhost:5000/api/stocks/nifty/data
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "NIFTY50",
      "company_name": "NIFTY 50",
      "current_price": 21234.50,
      "change_percent": 1.25
    },
    {
      "symbol": "NIFTYIT",
      "company_name": "NIFTY IT",
      "current_price": 42156.00,
      "change_percent": 2.15
    }
  ]
}
```

---

### 3. Get Single Stock Details
**Endpoint:** `GET /stocks/:symbol`

**Parameters:**
- `symbol` (required): Stock symbol (e.g., TCS, INFY)

**Example:**
```bash
curl http://localhost:5000/api/stocks/TCS
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "symbol": "TCS",
    "company_name": "Tata Consultancy Services",
    "current_price": 3850.50,
    // ... other fields
  }
}
```

---

### 4. Get Live Stock Data from External API
**Endpoint:** `GET /stocks/:symbol/live`

**Parameters:**
- `symbol` (required): Stock symbol

**Example:**
```bash
curl http://localhost:5000/api/stocks/TCS/live
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "TCS",
    "company_name": "TCS",
    "current_price": 3850.50,
    "change_percent": 2.45,
    "last_updated": "2024-01-20T10:30:00Z"
  }
}
```

---

### 5. Create/Update Stock
**Endpoint:** `POST /stocks`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "symbol": "TCS",
  "company_name": "Tata Consultancy Services",
  "current_price": 3850.50,
  "previous_close": 3758,
  "opening_price": 3825,
  "day_high": 3900,
  "day_low": 3800,
  "volume": "1234567",
  "market_cap": "1000000000000",
  "pe_ratio": 25.5,
  "change_percent": 2.45,
  "change_amount": 92.50
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/stocks \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TCS",
    "company_name": "Tata Consultancy Services",
    "current_price": 3850.50
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "symbol": "TCS",
    // ... other fields
  }
}
```

---

### 6. Update Stock
**Endpoint:** `PUT /stocks/:symbol`

**Parameters:**
- `symbol` (required): Stock symbol

**Body:** Same as POST

**Example:**
```bash
curl -X PUT http://localhost:5000/api/stocks/TCS \
  -H "Content-Type: application/json" \
  -d '{
    "current_price": 3900.00,
    "change_percent": 3.45
  }'
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated stock */ }
}
```

---

### 7. Delete Stock
**Endpoint:** `DELETE /stocks/:symbol`

**Parameters:**
- `symbol` (required): Stock symbol

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/stocks/TCS
```

**Response:**
```json
{
  "success": true,
  "message": "Stock deleted"
}
```

---

## Watchlist Endpoints

### 1. Get User Watchlist
**Endpoint:** `GET /watchlist/:userId`

**Parameters:**
- `userId` (required): User ID (string)

**Example:**
```bash
curl http://localhost:5000/api/watchlist/user123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "TCS",
      "company_name": "Tata Consultancy Services",
      "added_at": "2024-01-20T10:30:00Z"
    }
  ]
}
```

---

### 2. Add Stock to Watchlist
**Endpoint:** `POST /watchlist/:userId`

**Parameters:**
- `userId` (required): User ID

**Body:**
```json
{
  "symbol": "TCS",
  "company_name": "Tata Consultancy Services"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/watchlist/user123 \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TCS",
    "company_name": "Tata Consultancy Services"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "TCS",
      "company_name": "Tata Consultancy Services",
      "added_at": "2024-01-20T10:30:00Z"
    }
  ]
}
```

---

### 3. Remove Stock from Watchlist
**Endpoint:** `PUT /watchlist/:userId/:symbol`

**Parameters:**
- `userId` (required): User ID
- `symbol` (required): Stock symbol

**Example:**
```bash
curl -X PUT http://localhost:5000/api/watchlist/user123/TCS
```

**Response:**
```json
{
  "success": true,
  "data": [
    // remaining stocks in watchlist
  ]
}
```

---

### 4. Delete Entire Watchlist
**Endpoint:** `DELETE /watchlist/:userId`

**Parameters:**
- `userId` (required): User ID

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/watchlist/user123
```

**Response:**
```json
{
  "success": true,
  "message": "Watchlist deleted"
}
```

---

## Health Check
**Endpoint:** `GET /health`

**Example:**
```bash
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

---

## Error Handling

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Common Error Codes:**
- `200`: Success
- `404`: Not Found
- `400`: Bad Request
- `500`: Internal Server Error

**Example Error Response:**
```json
{
  "success": false,
  "message": "Stock not found"
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. Future versions will include:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## Pagination (Future Implementation)

```
GET /stocks?page=1&limit=20
```

---

## Filtering (Future Implementation)

```
GET /stocks?minPrice=100&maxPrice=5000&sector=IT
```

---

## Real-time Updates (Future Implementation)

WebSocket endpoint for real-time stock updates:
```
ws://localhost:5000/stocks/live
```

---

## Testing the API

### Using cURL
```bash
# Get all stocks
curl http://localhost:5000/api/stocks

# Search stocks
curl http://localhost:5000/api/stocks?search=TCS

# Get single stock
curl http://localhost:5000/api/stocks/TCS

# Create stock
curl -X POST http://localhost:5000/api/stocks \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","company_name":"Tata Consultancy Services","current_price":3850.50}'
```

### Using Postman
1. Import the API endpoints listed above
2. Set request type (GET, POST, PUT, DELETE)
3. Add request body for POST/PUT requests
4. Click Send

### Using JavaScript/Fetch
```javascript
// Get all stocks
fetch('http://localhost:5000/api/stocks')
  .then(res => res.json())
  .then(data => console.log(data));

// Create stock
fetch('http://localhost:5000/api/stocks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'TCS',
    company_name: 'Tata Consultancy Services',
    current_price: 3850.50
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## Integration with Indian API

To integrate with actual Indian API:

1. Update the `fetchLiveData` function in `backend/controllers/stockController.js`
2. Use the actual API endpoint format
3. Handle authentication with API key
4. Process and format the response

```javascript
const response = await axios.get(
  `${INDIAN_API_BASE_URL}stock/${symbol}`,
  {
    headers: {
      'X-API-Key': process.env.INDIAN_API_KEY
    }
  }
);
```

---

## Database Schemas

### Stock Schema
```javascript
{
  symbol: String (unique),
  company_name: String,
  current_price: Number,
  previous_close: Number,
  opening_price: Number,
  day_high: Number,
  day_low: Number,
  volume: String,
  market_cap: String,
  pe_ratio: Number,
  change_percent: Number,
  change_amount: Number,
  fifty_two_week_high: Number,
  fifty_two_week_low: Number,
  description: String,
  price_history: Array,
  last_updated: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Watchlist Schema
```javascript
{
  user_id: String,
  stocks: [
    {
      symbol: String,
      company_name: String,
      added_at: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Future Enhancements

- JWT Authentication
- Rate Limiting
- Pagination
- Advanced Filtering
- WebSocket for Real-time Updates
- Stock Predictions
- Portfolio Management
- User Profiles
- Advanced Analytics
