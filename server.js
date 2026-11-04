const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          process.env[key] = val;
        }
      }
    }
    console.log('📄 Loaded environment variables from .env');
  } catch (e) {
    console.warn('⚠️ Could not parse .env file:', e.message);
  }
}

const { CrawlXEngine } = require('./src/engine');
const createApiRoutes = require('./src/routes');
const {
  rateLimiter,
  securityHeaders,
  blockSensitiveFiles,
  apiAuthMiddleware,
  responseSanitizer
} = require('./src/security');

const app = express();
const server = http.createServer(app);

// Configure CORS safely
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST']
  }
});

// ── Security & Hardening Middleware ──────────────────────────
app.use(securityHeaders);
app.use(blockSensitiveFiles);
app.use(responseSanitizer);
app.use(rateLimiter);

// ── Standard Middleware ──────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow local development, same origin, or configured domains
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked by CrawlX security policy'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json({ limit: '5mb' }));

// Static assets with strict dotfile blocking
app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'ignore',
  etag: true,
  maxAge: '1h'
}));

// ── Initialize Engine ──────────────────────────────────────
const engine = new CrawlXEngine();

// ── Socket.IO for real-time updates ────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`💤 Client disconnected: ${socket.id}`);
  });
});

// Attach io to engine for real-time events
engine.setIO(io);

// ── API Routes (Protected by API Auth Middleware) ───────────
app.use('/api', apiAuthMiddleware, createApiRoutes(engine));

// ── Serve Frontend ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    status: 'operational', 
    engine: 'CrawlX v1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ── Error handling ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ 
    success: false, 
    error: err.message,
    code: 'INTERNAL_ERROR'
  });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║                                           ║');
  console.log('  ║     ██████╗██████╗  █████╗ ██╗    ██╗██╗  ║');
  console.log('  ║    ██╔════╝██╔══██╗██╔══██╗██║    ██║██║  ║');
  console.log('  ║    ██║     ██████╔╝███████║██║ █╗ ██║██║  ║');
  console.log('  ║    ██║     ██╔══██╗██╔══██║██║███╗██║██║  ║');
  console.log('  ║    ╚██████╗██║  ██║██║  ██║╚███╔███╔╝███╗║');
  console.log('  ║     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══╝║');
  console.log('  ║                                           ║');
  console.log('  ║    Next-Gen Stealth Web Extraction Engine ║');
  console.log('  ║                                           ║');
  console.log(`  ║    🌐 Dashboard: http://localhost:${PORT}     ║`);
  console.log(`  ║    📡 API:       http://localhost:${PORT}/api  ║`);
  console.log('  ║                                           ║');
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');

  console.log('🚀 Initializing CrawlX Browser Engine in background...');
  engine.init()
    .then(() => console.log('✅ Browser engine ready and warm'))
    .catch(err => console.warn('⚠️ Browser engine warm-up warning (will retry on demand):', err.message));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down CrawlX...');
  await engine.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await engine.destroy();
  process.exit(0);
});
