# 📋 StockPulse - Quick Reference Cheatsheet

## 🚀 Quick Start Commands

### Installation
```bash
# Install all dependencies
npm run install-all

# Or separately:
cd backend && npm install
cd ../frontend && npm install
```

### Run Application
```bash
# Start both servers
npm run dev

# Or separately:
cd backend && npm run dev
cd ../frontend && npm run dev
```

### Build
```bash
# Build frontend
cd frontend && npm run build

# Build backend (copy to build folder)
npm run build
```

### Docker
```bash
# Start with Docker
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs -f
```

---

## 🌐 URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web UI |
| Backend | http://localhost:5000 | API Server |
| API Docs | http://localhost:5000/api | API Root |
| Health | http://localhost:5000/api/health | Health Check |

---

## 📁 Key Files

### Frontend
| File | Purpose |
|------|---------|
| src/App.jsx | Root component |
| src/pages/HomePage.jsx | Home page |
| src/pages/StockDetailsPage.jsx | Stock details |
| src/components/StockCard.jsx | Stock card |
| src/components/StockChart.jsx | Price chart |
| src/services/api.js | API calls |
| tailwind.config.js | Theme config |

### Backend
| File | Purpose |
|------|---------|
| server.js | Express server |
| models/Stock.js | Stock schema |
| models/Watchlist.js | Watchlist schema |
| routes/stocks.js | Stock routes |
| routes/watchlist.js | Watchlist routes |
| controllers/stockController.js | Stock logic |
| .env | Configuration |

---

## 🔧 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/stock-market
PORT=5000
NODE_ENV=development
INDIAN_API_KEY=your_key
INDIAN_API_BASE_URL=https://api.indianapi.com
```

### Frontend (vite.config.js)
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  }
}
```

---

## 📊 API Quick Reference

### Stocks
```bash
# Get all
curl http://localhost:5000/api/stocks

# Search
curl http://localhost:5000/api/stocks?search=TCS

# Get one
curl http://localhost:5000/api/stocks/TCS

# Create/Update
curl -X POST http://localhost:5000/api/stocks \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TEST","company_name":"Test","current_price":100}'

# Delete
curl -X DELETE http://localhost:5000/api/stocks/TEST
```

### Watchlist
```bash
# Get watchlist
curl http://localhost:5000/api/watchlist/user123

# Add stock
curl -X POST http://localhost:5000/api/watchlist/user123 \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","company_name":"TCS"}'

# Remove stock
curl -X PUT http://localhost:5000/api/watchlist/user123/TCS

# Delete watchlist
curl -X DELETE http://localhost:5000/api/watchlist/user123
```

---

## 📚 Documentation Quick Links

| Guide | Purpose | Time |
|-------|---------|------|
| QUICK_START.md | Get started | 5 min |
| SETUP_GUIDE.md | Detailed setup | 30 min |
| API_DOCUMENTATION.md | API reference | Reference |
| FEATURES_OVERVIEW.md | Features guide | 20 min |
| INSTALLATION_DEPLOYMENT.md | Deploy guide | Reference |

---

## 🎨 Color Scheme

```css
Primary Dark:    #0a0e27
Primary Light:   #1a1f3a
Accent Green:    #00d084
Accent Light:    #00f5a0
Text Primary:    #ffffff
Text Secondary:  #a0a0a0
```

---

## 🐛 Troubleshooting

### Port Conflicts
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### MongoDB Issues
```bash
# Check if running
mongosh

# Start MongoDB
mongod

# Check status (macOS)
brew services list | grep mongodb
```

### Clear Cache
```bash
# Frontend
rm -rf frontend/.vite
npm cache clean --force

# Backend
npm cache clean --force
```

### Reinstall
```bash
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install
```

---

## 📦 Dependencies

### Frontend
- react@18
- vite@4
- tailwindcss@3
- recharts@2
- lucide-react
- react-router-dom@6
- axios

### Backend
- express@4
- mongoose@7
- mongodb
- axios
- cors
- dotenv
- body-parser

---

## 🔄 Git Commands

```bash
# Initialize repo
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create remote (replace with your repo)
git remote add origin <your-repo-url>

# Push
git push -u origin main
```

---

## 🐳 Docker Commands

```bash
# Build image
docker build -t stockpulse:latest .

# Run container
docker run -p 3000:3000 stockpulse:latest

# View logs
docker logs <container-id>

# Stop container
docker stop <container-id>

# Docker Compose
docker-compose up --build
docker-compose down
docker-compose logs -f
```

---

## 📊 Database

### Useful MongoDB Queries

```javascript
// Connect
mongosh

// List databases
show databases

// Use database
use stock-market

// Collections
show collections

// Find all stocks
db.stocks.find()

// Find by symbol
db.stocks.findOne({ symbol: "TCS" })

// Update
db.stocks.updateOne(
  { symbol: "TCS" },
  { $set: { current_price: 3900 } }
)

// Delete
db.stocks.deleteOne({ symbol: "TEST" })

// Count
db.stocks.countDocuments()

// Create index
db.stocks.createIndex({ symbol: 1 })
```

---

## 🚀 Deployment Checklist

- [ ] Build frontend: `npm run build`
- [ ] Set environment variables
- [ ] Configure database (Atlas)
- [ ] Setup API key
- [ ] Test API endpoints
- [ ] Test UI in production build
- [ ] Setup domain
- [ ] Setup SSL/HTTPS
- [ ] Monitor logs
- [ ] Setup backups

---

## 📈 Performance

### Frontend Optimization
```javascript
// Lazy loading
const Component = React.lazy(() => import('./Component'));

// Memoization
const StockCard = React.memo(({ stock }) => {...});

// useCallback
const handleSearch = useCallback((term) => {...}, []);

// useMemo
const sorted = useMemo(() => stocks.sort(), [stocks]);
```

### Backend Optimization
```javascript
// Database indexes
stockSchema.index({ symbol: 1 });

// Query limit
Stock.find().limit(50);

// Pagination
.skip((page-1)*limit).limit(limit);
```

---

## 🔒 Security Tips

✅ Use environment variables for secrets  
✅ Validate all inputs  
✅ Use HTTPS in production  
✅ Implement rate limiting  
✅ Add logging & monitoring  
✅ Keep dependencies updated  
✅ Use strong passwords  
✅ Backup database regularly  

---

## 📱 Responsive Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 🎯 Common Tasks

### Add New Stock
```javascript
POST /api/stocks
{
  "symbol": "NEW",
  "company_name": "New Company",
  "current_price": 1000,
  "change_percent": 5
}
```

### Add to Watchlist
```javascript
POST /api/watchlist/user123
{
  "symbol": "TCS",
  "company_name": "TCS"
}
```

### Update Stock
```javascript
PUT /api/stocks/TCS
{
  "current_price": 3900,
  "change_percent": 2.5
}
```

### Search Stocks
```
GET /api/stocks?search=TCS
```

---

## ✨ Code Snippets

### Fetch Stocks (Frontend)
```javascript
import { getStocks } from '../services/api';

const [stocks, setStocks] = useState([]);

useEffect(() => {
  getStocks().then(res => setStocks(res.data.data));
}, []);
```

### API Endpoint (Backend)
```javascript
router.get('/stocks', async (req, res) => {
  const { search } = req.query;
  const query = search ? { symbol: { $regex: search } } : {};
  const stocks = await Stock.find(query).limit(50);
  res.json({ success: true, data: stocks });
});
```

### Style Component (Tailwind)
```jsx
<div className="glass-effect p-6 rounded-xl border border-border-color hover:border-accent-green transition">
  <p className="text-accent-green">Green text</p>
  <p className="text-white">White text</p>
</div>
```

---

## 🎓 Learning Resources

- React: https://react.dev
- Express: https://expressjs.com
- MongoDB: https://docs.mongodb.com
- Tailwind: https://tailwindcss.com
- Vite: https://vitejs.dev
- Recharts: https://recharts.org

---

## 💡 Tips & Tricks

1. **Hot Reload**: Changes auto-refresh in dev mode
2. **MongoDB Compass**: Visual MongoDB manager
3. **Postman**: Test API endpoints easily
4. **VS Code Extensions**: Use recommended extensions
5. **Git Hooks**: Setup pre-commit hooks
6. **Monitoring**: Use Sentry or New Relic
7. **Analytics**: Track user behavior
8. **Caching**: Use Redis for performance

---

## 📞 Quick Support

### Error: Port Already in Use
→ Kill process or change port

### Error: MongoDB Connection Failed
→ Check MongoDB is running

### Error: Module Not Found
→ Reinstall dependencies

### Error: CORS Error
→ Check backend is running on 5000

### Error: Build Failed
→ Clear cache and reinstall

---

**Bookmark this page for quick reference! 📌**

---

**Last Updated**: January 2024  
**Status**: Complete ✅  
**Version**: 1.0  
