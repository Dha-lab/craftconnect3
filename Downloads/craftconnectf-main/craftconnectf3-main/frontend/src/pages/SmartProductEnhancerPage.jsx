import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { enhanceProduct, uploadImage } from "../services/api";
import EnhancerSlider from "../components/EnhancerSlider";

const SmartProductEnhancerPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // State management
  const [productData, setProductData] = useState({
    productName: '',
    currentDescription: '',
    targetAudience: '',
    priceRange: ''
  });
  const [originalImage, setOriginalImage] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [enhancedResult, setEnhancedResult] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Input, 2: Processing, 3: Results

  // Handle image selection
  const handleImageSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image must be less than 10MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setOriginalImage(file);
      setError(null);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!productData.productName.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!productData.currentDescription.trim()) {
      setError('Current description is required');
      return false;
    }
    if (!originalImage) {
      setError('Please select a product image');
      return false;
    }
    return true;
  };

  // Start enhancement process
  const handleEnhanceProduct = async () => {
    if (!validateForm()) return;
    
    setIsEnhancing(true);
    setError(null);
    setStep(2);
    
    try {
      console.log('Starting product enhancement...', {
        productName: productData.productName,
        hasImage: !!originalImage
      });
      
      const response = await enhanceProduct(productData, originalImage);
      
      if (response.success && response.data) {
        setEnhancedResult(response.data);
        setStep(3);
        
        // Store result in session storage
        try {
          sessionStorage.setItem('craftconnect_enhancement', JSON.stringify({
            original: productData,
            result: response.data,
            timestamp: new Date().toISOString()
          }));
        } catch (storageError) {
          console.warn('Failed to store enhancement result:', storageError);
        }
      } else {
        throw new Error(response.error || 'Enhancement failed');
      }
    } catch (error) {
      console.error('Product enhancement error:', error);
      setError(error.message || 'Failed to enhance product. Please try again.');
      setStep(1);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Download enhanced image
  const handleDownload = async () => {
    if (enhancedResult?.enhancedImageUrl) {
      try {
        const response = await fetch(enhancedResult.enhancedImageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `enhanced_${productData.productName.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
        setError('Failed to download image');
      }
    }
  };

  // Use for quotation
  const handleUseForQuotation = () => {
    if (enhancedResult) {
      // Store enhancement result and navigate to quotation page
      sessionStorage.setItem('craftconnect_quotation_data', JSON.stringify({
        productName: productData.productName,
        description: enhancedResult.enhancedDescription || productData.currentDescription,
        imageUrl: enhancedResult.enhancedImageUrl,
        originalData: productData,
        enhancementResult: enhancedResult
      }));
      navigate('/quotation');
    }
  };

  // Post to social media
  const handlePostToInstagram = () => {
    if (enhancedResult) {
      // Navigate to Instagram posting page
      navigate('/instagram-post', {
        state: {
          productData,
          enhancedResult,
          imageUrl: enhancedResult.enhancedImageUrl
        }
      });
    }
  };

  // Reset form
  const handleReset = () => {
    setProductData({
      productName: '',
      currentDescription: '',
      targetAudience: '',
      priceRange: ''
    });
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setEnhancedResult(null);
    setError(null);
    setStep(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8f7f6] dark:bg-[#221810]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#f4f2f0] dark:border-[#221810]/50 px-4 sm:px-10 py-3">
        <div className="flex items-center gap-4 text-[#333333] dark:text-[#f8f7f6]">
          <div className="size-6 text-[#ec6d13]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold tracking-[-0.015em]">Craft Connect</h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/hub')} 
            className="h-10 w-10 rounded-lg bg-[#f4f2f0] dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] flex items-center justify-center hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined !text-xl">home</span>
          </button>
          <button 
            onClick={handleReset}
            className="h-10 px-4 rounded-lg bg-[#f4f2f0] dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] text-sm font-bold hover:scale-105 transition-transform"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Step 1: Input Form */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center w-full max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.033em] text-[#333333] dark:text-[#f8f7f6]">
                Smart Product Enhancer
              </h1>
              <p className="mt-2 text-[#897261] dark:text-[#a39e99]">
                Upload your product image and details for AI-powered enhancement
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full max-w-2xl rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="w-full max-w-2xl space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#333333] dark:text-[#f8f7f6]">
                  Product Image *
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 rounded-lg border-2 border-dashed border-[#ec6d13]/50 bg-[#ec6d13]/5 flex flex-col items-center justify-center gap-2 hover:border-[#ec6d13] transition-colors"
                  >
                    {originalImageUrl ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={originalImageUrl} 
                          alt="Selected product" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white text-sm font-bold">Click to change image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-3xl text-[#ec6d13]">cloud_upload</span>
                        <span className="text-[#333333] dark:text-[#f8f7f6] font-bold">Click to upload image</span>
                        <span className="text-xs text-[#897261] dark:text-[#a39e99]">PNG, JPG up to 10MB</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#333333] dark:text-[#f8f7f6]">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  placeholder="e.g., Handwoven Cotton Scarf"
                  className="w-full h-12 px-4 rounded-lg border border-[#f4f2f0] dark:border-[#221810] bg-white dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] placeholder-[#897261] dark:placeholder-[#a39e99] focus:outline-none focus:ring-2 focus:ring-[#ec6d13]"
                />
              </div>

              {/* Current Description */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#333333] dark:text-[#f8f7f6]">
                  Current Description *
                </label>
                <textarea
                  value={productData.currentDescription}
                  onChange={(e) => handleInputChange('currentDescription', e.target.value)}
                  placeholder="Describe your product's features, materials, and craftsmanship..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-[#f4f2f0] dark:border-[#221810] bg-white dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] placeholder-[#897261] dark:placeholder-[#a39e99] focus:outline-none focus:ring-2 focus:ring-[#ec6d13] resize-none"
                />
              </div>

              {/* Target Audience (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#333333] dark:text-[#f8f7f6]">
                  Target Audience (Optional)
                </label>
                <input
                  type="text"
                  value={productData.targetAudience}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  placeholder="e.g., Fashion-conscious women, Gift buyers"
                  className="w-full h-12 px-4 rounded-lg border border-[#f4f2f0] dark:border-[#221810] bg-white dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] placeholder-[#897261] dark:placeholder-[#a39e99] focus:outline-none focus:ring-2 focus:ring-[#ec6d13]"
                />
              </div>

              {/* Price Range (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#333333] dark:text-[#f8f7f6]">
                  Price Range (Optional)
                </label>
                <input
                  type="text"
                  value={productData.priceRange}
                  onChange={(e) => handleInputChange('priceRange', e.target.value)}
                  placeholder="e.g., $25-50, Premium, Budget-friendly"
                  className="w-full h-12 px-4 rounded-lg border border-[#f4f2f0] dark:border-[#221810] bg-white dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] placeholder-[#897261] dark:placeholder-[#a39e99] focus:outline-none focus:ring-2 focus:ring-[#ec6d13]"
                />
              </div>

              {/* Enhance Button */}
              <button
                onClick={handleEnhanceProduct}
                disabled={isEnhancing}
                className={`w-full h-14 rounded-lg font-bold text-lg transition-all ${
                  isEnhancing
                    ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                    : 'bg-[#ec6d13] hover:bg-[#d65a0b] text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isEnhancing ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin size-6 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  <>🚀 Enhance Product</>  
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center w-full max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.033em] text-[#333333] dark:text-[#f8f7f6]">
                AI Enhancement in Progress
              </h1>
              <p className="mt-2 text-[#897261] dark:text-[#a39e99]">
                Our AI is analyzing and enhancing your product...
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="size-16 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#333333] dark:text-[#f8f7f6]">Enhancing "{productData.productName}"</p>
                <p className="text-sm text-[#897261] dark:text-[#a39e99]">This may take a few moments...</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && enhancedResult && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center w-full max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.033em] text-[#333333] dark:text-[#f8f7f6]">
                Enhancement Complete!
              </h1>
              <p className="mt-2 text-[#897261] dark:text-[#a39e99]">
                Review your AI-enhanced product. Drag the slider to compare.
              </p>
            </div>

            {/* Before/After Comparison */}
            {originalImageUrl && enhancedResult.enhancedImageUrl && (
              <EnhancerSlider 
                originalUrl={originalImageUrl} 
                enhancedUrl={enhancedResult.enhancedImageUrl} 
              />
            )}

            {/* Enhanced Description */}
            {enhancedResult.enhancedDescription && (
              <div className="w-full max-w-2xl space-y-4">
                <h3 className="text-xl font-bold text-[#333333] dark:text-[#f8f7f6]">Enhanced Description</h3>
                <div className="p-4 rounded-lg bg-white dark:bg-[#221810]/60 border border-[#f4f2f0] dark:border-[#221810]">
                  <p className="text-[#333333] dark:text-[#f8f7f6] leading-relaxed">
                    {enhancedResult.enhancedDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full max-w-2xl pt-4 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
              <button 
                onClick={handleDownload} 
                className="h-12 w-full sm:w-auto px-5 rounded-lg bg-[#ec6d13] text-white text-base font-bold hover:scale-105 active:scale-100 transition-transform"
              >
                📥 Download Enhanced Image
              </button>
              <button 
                onClick={handleUseForQuotation} 
                className="h-12 w-full sm:w-auto px-5 rounded-lg bg-[#f4f2f0] dark:bg-[#221810]/60 text-[#333333] dark:text-[#f8f7f6] text-base font-bold hover:scale-105 active:scale-100 transition-transform"
              >
                💰 Use for Quotation
              </button>
              <button 
                onClick={handlePostToInstagram} 
                className="h-12 w-full sm:w-auto px-5 rounded-lg text-[#333333] dark:text-[#a39e99] text-base font-bold hover:bg-[#f4f2f0]/50 dark:hover:bg-[#221810]/40 transition-colors"
              >
                📱 Post to Instagram
              </button>
            </div>

            {/* Start New Enhancement */}
            <button 
              onClick={handleReset}
              className="mt-4 h-10 px-5 rounded-lg text-[#ec6d13] text-sm font-bold hover:bg-[#ec6d13]/10 transition-colors"
            >
              ✨ Enhance Another Product
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SmartProductEnhancerPage;