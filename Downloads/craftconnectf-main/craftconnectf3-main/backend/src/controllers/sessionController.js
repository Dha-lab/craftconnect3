const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Session data structure
const sessionSchema = {
  sessionId: String,
  createdAt: Date,
  lastAccess: Date,
  initialized: Boolean,
  uploads: Array,
  analyses: Array,
  quotations: Array,
  whatsappMessages: Array,
  shopifyUploads: Array,
  facebookPosts: Array,
  productEnhancements: Array,
  businessData: Object,
  userPreferences: Object
};

/**
 * Get current session data
 */
const getSession = async (req, res) => {
  try {
    console.log('Getting session data:', {
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });

    // Ensure session is initialized
    if (!req.session.initialized) {
      req.session.initialized = true;
      req.session.createdAt = new Date();
      req.session.uploads = [];
      req.session.analyses = [];
      req.session.quotations = [];
      req.session.whatsappMessages = [];
      req.session.shopifyUploads = [];
      req.session.facebookPosts = [];
      req.session.productEnhancements = [];
      req.session.businessData = {};
      req.session.userPreferences = {};
    }

    req.session.lastAccess = new Date();

    const sessionData = {
      sessionId: req.sessionID,
      createdAt: req.session.createdAt,
      lastAccess: req.session.lastAccess,
      initialized: req.session.initialized,
      stats: {
        totalUploads: req.session.uploads?.length || 0,
        totalAnalyses: req.session.analyses?.length || 0,
        totalQuotations: req.session.quotations?.length || 0,
        totalWhatsappMessages: req.session.whatsappMessages?.length || 0,
        totalShopifyUploads: req.session.shopifyUploads?.length || 0,
        totalFacebookPosts: req.session.facebookPosts?.length || 0,
        totalProductEnhancements: req.session.productEnhancements?.length || 0
      },
      recentActivity: [
        ...req.session.analyses?.slice(-3).map(item => ({ type: 'analysis', ...item })) || [],
        ...req.session.whatsappMessages?.slice(-3).map(item => ({ type: 'whatsapp', ...item })) || [],
        ...req.session.quotations?.slice(-3).map(item => ({ type: 'quotation', ...item })) || [],
        ...req.session.productEnhancements?.slice(-3).map(item => ({ type: 'enhancement', ...item })) || []
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5)
    };

    res.json({
      success: true,
      data: sessionData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get session error:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionID
    });

    res.status(500).json({
      success: false,
      error: 'Session Retrieval Failed',
      message: error.message,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Clear session data
 */
const clearSession = async (req, res) => {
  try {
    console.log('Clearing session data:', {
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });

    // Store session ID before destroying
    const oldSessionId = req.sessionID;

    // Destroy current session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          error: 'Session Clear Failed',
          message: err.message,
          sessionId: oldSessionId,
          timestamp: new Date().toISOString()
        });
      }

      // Clear the session cookie
      res.clearCookie('craftconnect.sid');

      res.json({
        success: true,
        message: 'Session cleared successfully',
        oldSessionId,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('Clear session error:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionID
    });

    res.status(500).json({
      success: false,
      error: 'Session Clear Failed',
      message: error.message,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get session history and detailed data
 */
const getSessionHistory = async (req, res) => {
  try {
    console.log('Getting session history:', {
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });

    if (!req.session.initialized) {
      return res.json({
        success: true,
        data: {
          sessionId: req.sessionID,
          message: 'No session history available',
          history: []
        },
        timestamp: new Date().toISOString()
      });
    }

    const historyData = {
      sessionId: req.sessionID,
      createdAt: req.session.createdAt,
      lastAccess: req.session.lastAccess,
      uploads: req.session.uploads || [],
      analyses: req.session.analyses || [],
      quotations: req.session.quotations || [],
      whatsappMessages: req.session.whatsappMessages || [],
      shopifyUploads: req.session.shopifyUploads || [],
      facebookPosts: req.session.facebookPosts || [],
      productEnhancements: req.session.productEnhancements || [],
      businessData: req.session.businessData || {},
      userPreferences: req.session.userPreferences || {}
    };

    res.json({
      success: true,
      data: historyData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get session history error:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionID
    });

    res.status(500).json({
      success: false,
      error: 'Session History Failed',
      message: error.message,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update session with new data
 */
const updateSession = async (req, res) => {
  try {
    console.log('Updating session data:', {
      sessionId: req.sessionID,
      updateKeys: Object.keys(req.body),
      timestamp: new Date().toISOString()
    });

    // Ensure session is initialized
    if (!req.session.initialized) {
      req.session.initialized = true;
      req.session.createdAt = new Date();
      req.session.uploads = [];
      req.session.analyses = [];
      req.session.quotations = [];
      req.session.whatsappMessages = [];
      req.session.shopifyUploads = [];
      req.session.facebookPosts = [];
      req.session.productEnhancements = [];
      req.session.businessData = {};
      req.session.userPreferences = {};
    }

    // Update allowed fields
    const allowedUpdates = [
      'businessData',
      'userPreferences',
      'uploads',
      'analyses',
      'quotations',
      'whatsappMessages',
      'shopifyUploads',
      'facebookPosts',
      'productEnhancements'
    ];

    let updatedFields = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedUpdates.includes(key)) {
        req.session[key] = value;
        updatedFields.push(key);
      }
    }

    req.session.lastAccess = new Date();

    res.json({
      success: true,
      message: `Session updated successfully`,
      updatedFields,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update session error:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionID
    });

    res.status(500).json({
      success: false,
      error: 'Session Update Failed',
      message: error.message,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Add item to session array
 */
const addToSession = async (req, res) => {
  try {
    const { arrayName, item } = req.body;
    
    if (!arrayName || !item) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'arrayName and item are required'
      });
    }

    const allowedArrays = [
      'uploads', 'analyses', 'quotations', 'whatsappMessages',
      'shopifyUploads', 'facebookPosts', 'productEnhancements'
    ];

    if (!allowedArrays.includes(arrayName)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Array name must be one of: ${allowedArrays.join(', ')}`
      });
    }

    // Ensure session array exists
    if (!req.session[arrayName]) {
      req.session[arrayName] = [];
    }

    // Add timestamp to item
    const itemWithTimestamp = {
      ...item,
      timestamp: new Date(),
      id: uuidv4()
    };

    req.session[arrayName].push(itemWithTimestamp);
    req.session.lastAccess = new Date();

    res.json({
      success: true,
      message: `Item added to ${arrayName}`,
      itemId: itemWithTimestamp.id,
      arrayLength: req.session[arrayName].length,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add to session error:', {
      error: error.message,
      sessionId: req.sessionID
    });

    res.status(500).json({
      success: false,
      error: 'Add to Session Failed',
      message: error.message,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getSession,
  clearSession,
  getSessionHistory,
  updateSession,
  addToSession
};