const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import controllers
const aiController = require('../controllers/aiController');
const imageController = require('../controllers/imageController');
const sessionController = require('../controllers/sessionController');
const whatsappController = require('../controllers/whatsappController');
const quotationController = require('../controllers/quotationController');
const productController = require('../controllers/productController');

// Import sub-routes
const facebookRoutes = require('./facebook');
const shopifyRoutes = require('./shopify');

// Configure multer for file uploads with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Allow audio and image files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are allowed'));
    }
  }
});

// Validation middleware
const validateBusinessAnalysis = [
  body('businessType').optional().isString().trim(),
  body('description').optional().isString().trim(),
];

const validateWhatsAppGeneration = [
  body('businessType').notEmpty().withMessage('Business type is required'),
  body('detectedFocus').notEmpty().withMessage('Detected focus is required'),
  body('topProblems').isArray().withMessage('Top problems must be an array'),
  body('recommendedSolutions').isArray().withMessage('Recommended solutions must be an array')
];

const validateQuotationRequest = [
  body('productName').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

const validateProductEnhancement = [
  body('productName').notEmpty().withMessage('Product name is required'),
  body('currentDescription').notEmpty().withMessage('Current description is required')
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Session management middleware
const ensureSession = (req, res, next) => {
  if (!req.session) {
    return res.status(500).json({
      success: false,
      error: 'Session Error',
      message: 'Session not available'
    });
  }
  
  // Initialize session data if not present
  if (!req.session.initialized) {
    req.session.initialized = true;
    req.session.createdAt = new Date();
    req.session.uploads = [];
    req.session.analyses = [];
    req.session.quotations = [];
    req.session.whatsappMessages = [];
  }
  
  req.session.lastAccess = new Date();
  next();
};

// Apply session middleware to all routes
router.use(ensureSession);

// ====== CORE AI BUSINESS ANALYSIS ROUTES ======

// Business analysis with audio upload - FIXED VERSION
router.post('/analyze-business', 
  upload.single('audio'),
  validateBusinessAnalysis,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('Business analysis request:', {
        sessionId: req.sessionID,
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body),
        timestamp: new Date().toISOString()
      });

      // Generate unique analysis ID
      const analysisId = uuidv4();
      
      let result;
      if (req.file) {
        // Process audio file
        result = await aiController.analyzeBusinessFromAudio(req.file, analysisId, req.sessionID);
      } else if (req.body.description) {
        // Process text description
        result = await aiController.analyzeBusinessFromText(req.body.description, analysisId, req.sessionID);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Either audio file or text description is required'
        });
      }

      // Store analysis in session
      req.session.analyses.push({
        id: analysisId,
        result,
        timestamp: new Date(),
        type: req.file ? 'audio' : 'text'
      });

      res.json({
        success: true,
        data: result,
        analysisId,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Business analysis error:', {
        error: error.message,
        stack: error.stack,
        sessionId: req.sessionID
      });

      res.status(500).json({
        success: false,
        error: 'Analysis Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ====== WHATSAPP MESSAGE GENERATION - FIXED VERSION ======

router.post('/generate-whatsapp-message',
  validateWhatsAppGeneration,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('WhatsApp message generation request:', {
        sessionId: req.sessionID,
        businessType: req.body.businessType,
        timestamp: new Date().toISOString()
      });

      const messageId = uuidv4();
      const result = await whatsappController.generateMessage({
        ...req.body,
        messageId,
        sessionId: req.sessionID
      });

      // Store in session
      req.session.whatsappMessages.push({
        id: messageId,
        result,
        businessContext: req.body,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: result,
        messageId,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('WhatsApp message generation error:', {
        error: error.message,
        sessionId: req.sessionID
      });

      res.status(500).json({
        success: false,
        error: 'WhatsApp Generation Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ====== SMART PRODUCT ENHANCER - NEW FEATURE ======

router.post('/enhance-product',
  upload.single('productImage'),
  validateProductEnhancement,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('Product enhancement request:', {
        sessionId: req.sessionID,
        productName: req.body.productName,
        hasImage: !!req.file,
        timestamp: new Date().toISOString()
      });

      const enhancementId = uuidv4();
      
      const result = await productController.enhanceProduct({
        productName: req.body.productName,
        currentDescription: req.body.currentDescription,
        targetAudience: req.body.targetAudience,
        priceRange: req.body.priceRange,
        image: req.file,
        enhancementId,
        sessionId: req.sessionID
      });

      res.json({
        success: true,
        data: result,
        enhancementId,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Product enhancement error:', {
        error: error.message,
        sessionId: req.sessionID
      });

      res.status(500).json({
        success: false,
        error: 'Product Enhancement Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ====== AI QUOTATION GENERATOR - NEW FEATURE ======

router.post('/generate-quotation',
  upload.array('productImages', 5),
  validateQuotationRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('Quotation generation request:', {
        sessionId: req.sessionID,
        productName: req.body.productName,
        quantity: req.body.quantity,
        hasImages: req.files ? req.files.length : 0,
        timestamp: new Date().toISOString()
      });

      const quotationId = uuidv4();
      
      const result = await quotationController.generateQuotation({
        productName: req.body.productName,
        description: req.body.description,
        quantity: parseInt(req.body.quantity),
        specifications: req.body.specifications,
        customerType: req.body.customerType,
        urgency: req.body.urgency,
        images: req.files,
        quotationId,
        sessionId: req.sessionID
      });

      // Store in session
      req.session.quotations.push({
        id: quotationId,
        result,
        requestData: req.body,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: result,
        quotationId,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Quotation generation error:', {
        error: error.message,
        sessionId: req.sessionID
      });

      res.status(500).json({
        success: false,
        error: 'Quotation Generation Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ====== IMAGE UPLOAD AND PROCESSING ======

router.post('/upload-image',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image uploaded',
          message: 'Please provide an image file'
        });
      }

      console.log('Image upload request:', {
        sessionId: req.sessionID,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        timestamp: new Date().toISOString()
      });

      const uploadId = uuidv4();
      const result = await imageController.uploadAndProcessImage(req.file, uploadId, req.sessionID);

      // Store upload info in session
      req.session.uploads.push({
        id: uploadId,
        originalName: req.file.originalname,
        result,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: result,
        uploadId,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Image upload error:', {
        error: error.message,
        sessionId: req.sessionID
      });

      res.status(500).json({
        success: false,
        error: 'Image Upload Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ====== SESSION MANAGEMENT ROUTES ======

// Get session data
router.get('/session', sessionController.getSession);

// Clear session data
router.delete('/session', sessionController.clearSession);

// Get session history
router.get('/session/history', sessionController.getSessionHistory);

// ====== INTEGRATION ROUTES ======

// Facebook API integration
router.use('/facebook', facebookRoutes);

// Shopify API integration with HTTPS image support
router.use('/shopify', shopifyRoutes);

// ====== STATUS AND HEALTH ROUTES ======

// API status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'CraftConnect API is operational',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
    features: {
      businessAnalysis: true,
      whatsappGeneration: true,
      productEnhancement: true,
      quotationGeneration: true,
      imageProcessing: true,
      facebookIntegration: true,
      shopifyIntegration: true,
      sessionManagement: true
    },
    endpoints: [
      'POST /api/analyze-business',
      'POST /api/generate-whatsapp-message',
      'POST /api/enhance-product',
      'POST /api/generate-quotation',
      'POST /api/upload-image',
      'GET /api/session',
      'DELETE /api/session',
      'GET /api/session/history',
      'POST /api/facebook/post',
      'POST /api/shopify/upload-product',
      'GET /api/status'
    ]
  });
});

// Error handling for the router
router.use((error, req, res, next) => {
  console.error('API Router Error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File Too Large',
        message: 'File size exceeds 50MB limit'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected File',
        message: 'Unexpected file field'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'API Error',
    message: error.message,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;