import axios from "axios";

// Enhanced API configuration with better error handling
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

console.log('API URL configured:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL.replace(/\/$/, "") + "/api",
  timeout: 60000, // Increased timeout for AI processing
  withCredentials: true, // Enable cookies for session management
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for debugging and session management
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('Request config:', {
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: config.headers,
      withCredentials: config.withCredentials
    });

    // Ensure session is established for all requests
    try {
      const sessionCheck = await fetch(`${API_URL}/api/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (sessionCheck.ok) {
        const sessionData = await sessionCheck.json();
        console.log('Session established:', sessionData.sessionId);
      }
    } catch (sessionError) {
      console.warn('Session establishment failed:', sessionError.message);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    
    // Provide user-friendly error messages
    if (!error.response) {
      error.userMessage = 'Network error - please check your connection and server status';
    } else if (error.response.status >= 500) {
      error.userMessage = 'Server error - please try again later';
    } else if (error.response.status === 404) {
      error.userMessage = 'Service not found - please contact support';
    } else if (error.response.status === 401) {
      error.userMessage = 'Authentication required - please refresh the page';
    } else if (error.response.status === 403) {
      error.userMessage = 'Access denied - insufficient permissions';
    } else {
      error.userMessage = error.response?.data?.message || error.response?.data?.error || 'Request failed';
    }
    
    return Promise.reject(error);
  }
);

// ====== HEALTH AND STATUS FUNCTIONS ======

export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/status');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message,
      status: error.response?.status || 0
    };
  }
};

export const testConnection = async () => {
  try {
    const response = await apiClient.get('/status');
    return {
      success: true,
      message: 'Backend connection successful',
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'Backend connection failed',
      error: error.userMessage || error.message,
      details: {
        baseURL: apiClient.defaults.baseURL,
        status: error.response?.status,
        statusText: error.response?.statusText
      }
    };
  }
};

// ====== BUSINESS ANALYSIS FUNCTIONS ======

export const analyzeBusinessAudio = async (audioBlob, options = {}) => {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    
    console.log('Sending audio for business analysis...');
    const response = await apiClient.post("/analyze-business", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      ...options,
    });
    
    // Store successful analysis in session storage
    if (response.data.success && response.data.data) {
      try {
        sessionStorage.setItem('craftconnect_analysis', JSON.stringify(response.data.data));
      } catch (storageError) {
        console.warn('Failed to store analysis in session storage:', storageError);
      }
    }
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('analyzeBusinessAudio error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

export const analyzeBusinessText = async (description, options = {}) => {
  try {
    console.log('Sending text for business analysis...');
    const response = await apiClient.post("/analyze-business", {
      description: description
    }, options);
    
    // Store successful analysis in session storage
    if (response.data.success && response.data.data) {
      try {
        sessionStorage.setItem('craftconnect_analysis', JSON.stringify(response.data.data));
      } catch (storageError) {
        console.warn('Failed to store analysis in session storage:', storageError);
      }
    }
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('analyzeBusinessText error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== WHATSAPP MESSAGE GENERATION ======

export const generateWhatsAppMessage = async (data) => {
  try {
    console.log('Generating WhatsApp message with data:', data);
    const response = await apiClient.post("/generate-whatsapp-message", data);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('generateWhatsAppMessage error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== SMART PRODUCT ENHANCER ======

export const enhanceProduct = async (productData, imageFile = null) => {
  try {
    const formData = new FormData();
    formData.append('productName', productData.productName);
    formData.append('currentDescription', productData.currentDescription);
    
    if (productData.targetAudience) {
      formData.append('targetAudience', productData.targetAudience);
    }
    if (productData.priceRange) {
      formData.append('priceRange', productData.priceRange);
    }
    if (imageFile) {
      formData.append('productImage', imageFile);
    }
    
    console.log('Enhancing product...');
    const response = await apiClient.post("/enhance-product", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('enhanceProduct error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== AI QUOTATION GENERATOR ======

export const generateQuotation = async (quotationData, imageFiles = []) => {
  try {
    const formData = new FormData();
    formData.append('productName', quotationData.productName);
    formData.append('description', quotationData.description);
    formData.append('quantity', quotationData.quantity.toString());
    
    if (quotationData.specifications) {
      formData.append('specifications', quotationData.specifications);
    }
    if (quotationData.customerType) {
      formData.append('customerType', quotationData.customerType);
    }
    if (quotationData.urgency) {
      formData.append('urgency', quotationData.urgency);
    }
    
    // Add image files
    imageFiles.forEach((file, index) => {
      formData.append('productImages', file);
    });
    
    console.log('Generating quotation...');
    const response = await apiClient.post("/generate-quotation", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('generateQuotation error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== IMAGE UPLOAD AND PROCESSING ======

export const uploadImage = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    console.log('Uploading image...');
    const response = await apiClient.post("/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('uploadImage error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== FACEBOOK API INTEGRATION ======

export const postToFacebook = async (postData) => {
  try {
    console.log('Posting to Facebook...');
    const response = await apiClient.post("/facebook/post", postData);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('postToFacebook error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== SHOPIFY API INTEGRATION ======

export const uploadToShopify = async (productData, images = []) => {
  try {
    console.log('Uploading to Shopify...');
    const response = await apiClient.post("/shopify/upload-product", {
      ...productData,
      images: images
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('uploadToShopify error:', error);
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

export const getShopifyInfo = async (shopUrl, accessToken) => {
  try {
    const response = await apiClient.get("/shopify/shop-info", {
      params: { shopUrl, accessToken }
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

// ====== SESSION MANAGEMENT ======

export const getSession = async () => {
  try {
    const response = await apiClient.get('/session');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message
    };
  }
};

export const clearSession = async () => {
  try {
    const response = await apiClient.delete('/session');
    
    // Also clear session storage
    try {
      sessionStorage.removeItem('craftconnect_analysis');
      sessionStorage.removeItem('craftconnect_whatsapp_message');
    } catch (storageError) {
      console.warn('Failed to clear session storage:', storageError);
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message
    };
  }
};

export const getSessionHistory = async () => {
  try {
    const response = await apiClient.get('/session/history');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message
    };
  }
};

// ====== LEGACY COMPATIBILITY FUNCTIONS ======
// These maintain compatibility with existing frontend code

export const analyzeBusinessOverview = async (audioBlob, options = {}) => {
  return await analyzeBusinessAudio(audioBlob, options);
};

export const validateBusinessSummary = async (payload) => {
  try {
    // This can be handled client-side or we can create a validation endpoint
    return {
      success: true,
      data: { validated: true, ...payload }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const analyzeComprehensive = async (sessionId, audioBlob, images = []) => {
  try {
    const formData = new FormData();
    if (sessionId) formData.append("sessionId", sessionId);
    if (audioBlob) formData.append("audio", audioBlob, "product.webm");
    images.forEach((file, index) => {
      formData.append("images", file, `image_${index}.${file.type.split('/')[1]}`);
    });
    
    const response = await apiClient.post("/analyze-business", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message,
      details: error.response?.data
    };
  }
};

export const updateSession = async (sessionId, updates) => {
  try {
    const response = await apiClient.post(`/session`, updates);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.userMessage || error.message
    };
  }
};

export const generateRecommendations = async (sessionId) => {
  try {
    // This could be enhanced to call a specific recommendations endpoint
    const sessionData = await getSession();
    if (sessionData.success) {
      return {
        success: true,
        data: {
          recommendations: [
            'Use WhatsApp Business for customer communication',
            'Create professional quotations with AI assistance',
            'Enhance product descriptions for better sales',
            'Upload products to Shopify with optimized images',
            'Promote on Facebook with engaging content'
          ]
        }
      };
    }
    throw new Error('Failed to get session data');
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default apiClient;