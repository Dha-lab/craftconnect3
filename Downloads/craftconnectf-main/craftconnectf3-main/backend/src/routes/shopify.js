const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateProductData = [
  body('title').notEmpty().withMessage('Product title is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('shopUrl').isURL().withMessage('Shop URL must be valid'),
  body('accessToken').notEmpty().withMessage('Access token is required')
];

// Enhanced image processing for HTTPS deployment
const processImageForShopify = async (imageBuffer, filename) => {
  try {
    console.log('Processing image for Shopify:', { filename, size: imageBuffer.length });
    
    // Process image with sharp - optimize for web
    const processedImage = await sharp(imageBuffer)
      .resize(2048, 2048, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true,
        mozjpeg: true 
      })
      .toBuffer();
    
    console.log('Image processed successfully:', { 
      originalSize: imageBuffer.length,
      processedSize: processedImage.length,
      compression: ((imageBuffer.length - processedImage.length) / imageBuffer.length * 100).toFixed(2) + '%'
    });
    
    return {
      buffer: processedImage,
      filename: filename.replace(/\.[^/.]+$/, ".jpg"), // Ensure .jpg extension
      mimetype: 'image/jpeg'
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// Upload image to Shopify with HTTPS support
const uploadImageToShopify = async (imageData, shopUrl, accessToken) => {
  try {
    const apiUrl = `https://${shopUrl}/admin/api/2023-10/uploads.json`;
    
    console.log('Uploading image to Shopify:', { 
      apiUrl,
      filename: imageData.filename,
      size: imageData.buffer.length
    });
    
    // Create form data for Shopify upload
    const formData = new FormData();
    formData.append('upload[attachment]', imageData.buffer, {
      filename: imageData.filename,
      contentType: imageData.mimetype
    });
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'multipart/form-data',
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000
    });
    
    if (response.data && response.data.upload) {
      console.log('Image uploaded successfully to Shopify:', response.data.upload);
      
      // Return HTTPS URL
      const httpsUrl = response.data.upload.public_url.replace('http://', 'https://');
      
      return {
        success: true,
        uploadId: response.data.upload.id,
        publicUrl: httpsUrl,
        filename: response.data.upload.key
      };
    } else {
      throw new Error('Invalid response from Shopify upload API');
    }
  } catch (error) {
    console.error('Shopify image upload error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Shopify access token');
    } else if (error.response?.status === 422) {
      throw new Error('Invalid image data or format');
    } else {
      throw new Error(`Shopify upload failed: ${error.message}`);
    }
  }
};

// Create product on Shopify with HTTPS image URLs
const createShopifyProduct = async (productData, imageUrls, shopUrl, accessToken) => {
  try {
    const apiUrl = `https://${shopUrl}/admin/api/2023-10/products.json`;
    
    console.log('Creating Shopify product:', {
      title: productData.title,
      price: productData.price,
      imageCount: imageUrls.length
    });
    
    // Ensure all image URLs are HTTPS
    const httpsImageUrls = imageUrls.map(url => url.replace('http://', 'https://'));
    
    const product = {
      product: {
        title: productData.title,
        body_html: productData.description,
        vendor: productData.vendor || 'CraftConnect',
        product_type: productData.productType || 'Handmade',
        status: productData.status || 'draft',
        variants: [
          {
            price: productData.price.toString(),
            inventory_quantity: productData.inventory || 1,
            inventory_management: 'shopify',
            inventory_policy: 'deny'
          }
        ],
        images: httpsImageUrls.map(url => ({ src: url })),
        tags: productData.tags || 'handmade,craft,artisan',
        metafields_global_title_tag: productData.title,
        metafields_global_description_tag: productData.description.substring(0, 160)
      }
    };
    
    const response = await axios.post(apiUrl, product, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.data && response.data.product) {
      console.log('Product created successfully on Shopify:', {
        id: response.data.product.id,
        handle: response.data.product.handle,
        status: response.data.product.status
      });
      
      return {
        success: true,
        product: response.data.product,
        productUrl: `https://${shopUrl}/products/${response.data.product.handle}`,
        adminUrl: `https://${shopUrl}/admin/products/${response.data.product.id}`
      };
    } else {
      throw new Error('Invalid response from Shopify product creation API');
    }
  } catch (error) {
    console.error('Shopify product creation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Shopify access token');
    } else if (error.response?.status === 422) {
      const errors = error.response.data?.errors;
      throw new Error(`Product validation failed: ${JSON.stringify(errors)}`);
    } else {
      throw new Error(`Shopify product creation failed: ${error.message}`);
    }
  }
};

// ====== SHOPIFY API ROUTES ======

// Upload product with images to Shopify - FIXED VERSION
router.post('/upload-product', 
  validateProductData,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        errors: errors.array()
      });
    }
    next();
  },
  async (req, res) => {
    try {
      console.log('Shopify product upload request:', {
        sessionId: req.sessionID,
        title: req.body.title,
        shopUrl: req.body.shopUrl,
        hasImages: req.body.images ? req.body.images.length : 0,
        timestamp: new Date().toISOString()
      });
      
      const { title, description, price, shopUrl, accessToken, images = [], ...otherData } = req.body;
      
      let imageUrls = [];
      
      // Process and upload images if provided
      if (images && images.length > 0) {
        console.log(`Processing ${images.length} images for Shopify upload`);
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          
          try {
            let imageBuffer;
            
            // Handle different image input formats
            if (typeof image === 'string') {
              if (image.startsWith('data:image/')) {
                // Base64 image data
                const base64Data = image.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
              } else if (image.startsWith('http://') || image.startsWith('https://')) {
                // External image URL - download it
                console.log(`Downloading image from URL: ${image}`);
                const response = await axios.get(image, { 
                  responseType: 'arraybuffer',
                  timeout: 15000
                });
                imageBuffer = Buffer.from(response.data);
              } else {
                throw new Error('Invalid image format');
              }
            } else if (Buffer.isBuffer(image)) {
              imageBuffer = image;
            } else {
              throw new Error('Unsupported image type');
            }
            
            // Process image for optimal web delivery
            const processedImage = await processImageForShopify(
              imageBuffer, 
              `product_image_${i + 1}_${Date.now()}.jpg`
            );
            
            // Upload to Shopify
            const uploadResult = await uploadImageToShopify(
              processedImage,
              shopUrl.replace(/^https?:\/\//, ''),
              accessToken
            );
            
            if (uploadResult.success) {
              imageUrls.push(uploadResult.publicUrl);
              console.log(`Image ${i + 1} uploaded successfully: ${uploadResult.publicUrl}`);
            } else {
              console.warn(`Failed to upload image ${i + 1}`);
            }
          } catch (imageError) {
            console.error(`Error processing image ${i + 1}:`, imageError.message);
            // Continue with other images even if one fails
          }
        }
      }
      
      // Create product on Shopify
      const productResult = await createShopifyProduct(
        { title, description, price, ...otherData },
        imageUrls,
        shopUrl.replace(/^https?:\/\//, ''),
        accessToken
      );
      
      // Store in session
      if (!req.session.shopifyUploads) {
        req.session.shopifyUploads = [];
      }
      
      req.session.shopifyUploads.push({
        productId: productResult.product.id,
        title: productResult.product.title,
        imageUrls,
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        message: 'Product uploaded to Shopify successfully',
        data: {
          product: productResult.product,
          productUrl: productResult.productUrl,
          adminUrl: productResult.adminUrl,
          imageUrls,
          imageCount: imageUrls.length
        },
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Shopify upload error:', {
        error: error.message,
        stack: error.stack,
        sessionId: req.sessionID
      });
      
      res.status(500).json({
        success: false,
        error: 'Shopify Upload Failed',
        message: error.message,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get Shopify shop info
router.get('/shop-info', async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.query;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing Parameters',
        message: 'shopUrl and accessToken are required'
      });
    }
    
    const apiUrl = `https://${shopUrl.replace(/^https?:\/\//, '')}/admin/api/2023-10/shop.json`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      data: response.data.shop,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Shopify shop info error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Shop Info Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List products from Shopify
router.get('/products', async (req, res) => {
  try {
    const { shopUrl, accessToken, limit = 50 } = req.query;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing Parameters',
        message: 'shopUrl and accessToken are required'
      });
    }
    
    const apiUrl = `https://${shopUrl.replace(/^https?:\/\//, '')}/admin/api/2023-10/products.json`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      },
      params: {
        limit: Math.min(parseInt(limit), 250)
      },
      timeout: 15000
    });
    
    res.json({
      success: true,
      data: response.data.products,
      count: response.data.products.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Shopify products list error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Products List Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get session Shopify uploads
router.get('/session-uploads', (req, res) => {
  try {
    const uploads = req.session.shopifyUploads || [];
    
    res.json({
      success: true,
      data: uploads,
      count: uploads.length,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Session uploads error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Session Data Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;