const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  }
});
app.use('/api/', limiter);

// Enhanced CORS configuration for deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'https://craftconnect-frontend.vercel.app',
      'https://craftconnect3.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'https://localhost:5173'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Body parsing middleware with increased limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Session configuration with MongoDB store
app.use(session({
  name: 'craftconnect.sid',
  secret: process.env.SESSION_SECRET || 'craftconnect-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
    ttl: 7 * 24 * 60 * 60, // 7 days
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Enhanced request logging with session tracking
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  console.log('Session ID:', req.sessionID);
  console.log('Origin:', req.get('Origin'));
  console.log('User-Agent:', req.get('User-Agent'));
  next();
});

// Session management endpoint
app.post('/api/session', (req, res) => {
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.createdAt = new Date();
  }
  req.session.lastAccess = new Date();
  
  res.json({
    success: true,
    sessionId: req.sessionID,
    message: 'Session established'
  });
});

// Health check routes
const healthController = require("./src/controllers/healthController");
app.get("/health", healthController.healthCheck);
app.get("/env-check", healthController.envCheck);

// Basic route with enhanced info
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CraftConnect Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "2.0.0",
    sessionId: req.sessionID,
    features: [
      'Smart Product Enhancer',
      'AI Quotation Generator',
      'WhatsApp Message Generator',
      'Facebook API Integration',
      'Shopify API Integration',
      'Image Upload & Processing'
    ]
  });
});

// API Routes
const apiRoutes = require("./src/routes/api");
app.use("/api", apiRoutes);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    message: error.message,
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID
  });
});

// 404 handler with available routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /env-check',
      'POST /api/session',
      'POST /api/analyze-business',
      'POST /api/generate-whatsapp-message',
      'POST /api/enhance-product',
      'POST /api/generate-quotation',
      'POST /api/upload-image',
      'POST /api/facebook/post',
      'POST /api/shopify/upload-product'
    ],
    timestamp: new Date().toISOString()
  });
});

// Enhanced MongoDB connection with session store support
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

const PORT = Number(process.env.PORT) || 8080;

(async () => {
  try {
    console.log("🚀 Starting CraftConnect Backend v2.0...");
    console.log(`📦 Node.js version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${PORT}`);
    console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'Not set'}`);
    
    // Check critical environment variables
    const requiredEnvVars = ['MONGODB_URI'];
    const optionalEnvVars = [
      'CLIENT_URL',
      'GOOGLE_CLOUD_PROJECT_ID',
      'SHOPIFY_API_KEY',
      'FACEBOOK_APP_ID',
      'CLOUDINARY_URL',
      'SESSION_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
      console.error('Please check your .env file or environment configuration');
      process.exit(1);
    }
    
    if (missingOptionalVars.length > 0) {
      console.warn(`⚠️  Missing optional environment variables: ${missingOptionalVars.join(', ')}`);
      console.warn('Some features may not work properly');
    }
    
    console.log('✅ All required environment variables present');

    // MongoDB connection with detailed logging
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: "majority",
      bufferMaxEntries: 0
    });
    
    console.log("✅ MongoDB connected successfully");
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🎯 Session store configured`);

    // Start server with enhanced error handling
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
      console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`⚙️  Environment check: http://0.0.0.0:${PORT}/env-check`);
      console.log(`🎯 API endpoints available at: http://0.0.0.0:${PORT}/api/`);
      console.log('✅ Backend startup completed successfully');
      console.log('🔥 All features enabled:');
      console.log('   - Smart Product Enhancer');
      console.log('   - AI Quotation Generator');
      console.log('   - WhatsApp Message Generator');
      console.log('   - Facebook API Integration');
      console.log('   - Shopify API with HTTPS Image Support');
      console.log('   - Session Management with MongoDB');
      console.log('   - CORS Configuration for Deployment');
    });

    // Enhanced graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('✅ MongoDB connection closed');
          console.log('✅ Server shutdown completed');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during shutdown:', err);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('⚠️  Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error("❌ Backend startup failed:", err.message);
    console.error('Full error:', err);
    
    // Enhanced error diagnosis
    if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      console.error('🔍 Network/DNS issue detected:');
      console.error('   - Check MongoDB URI is correct');
      console.error('   - Verify network connectivity to MongoDB Atlas');
      console.error('   - Check firewall settings allow outbound connections');
      console.error('   - Ensure deployment environment has internet access');
    }
    
    if (err.message.includes('authentication')) {
      console.error('🔍 Authentication issue detected:');
      console.error('   - Check MongoDB username/password are correct');
      console.error('   - Verify database user has proper permissions');
      console.error('   - Ensure IP whitelist includes deployment IP (0.0.0.0/0 for testing)');
    }
    
    if (err.message.includes('CORS')) {
      console.error('🔍 CORS issue detected:');
      console.error('   - Check CLIENT_URL environment variable');
      console.error('   - Verify frontend domain is in allowed origins');
      console.error('   - Ensure proper headers are being sent');
    }
    
    process.exit(1);
  }
})();