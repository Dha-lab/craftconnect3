import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { enhanceProduct } from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EnhancerSlider from "../components/EnhancerSlider";

const SmartProductEnhancerPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [productData, setProductData] = useState({ productName: '', currentDescription: '', targetAudience: '', priceRange: '' });
  const [originalImage, setOriginalImage] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [enhancedResult, setEnhancedResult] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState(null);

  const handleImageSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return setError('Image must be less than 10MB');
      if (!file.type.startsWith('image/')) return setError('Please select a valid image file');
      setError(null);
      setOriginalImage(file);
      const reader = new FileReader(); reader.onload = (e) => setOriginalImageUrl(e.target.result); reader.readAsDataURL(file);
    }
  }, []);

  const handleInputChange = (field, value) => setProductData(prev => ({ ...prev, [field]: value }));

  const validateForm = () => {
    if (!productData.productName.trim()) return setError('Product name is required'), false;
    if (!productData.currentDescription.trim()) return setError('Current description is required'), false;
    if (!originalImage) return setError('Please select a product image'), false;
    return true;
  };

  const handleEnhanceProduct = async () => {
    if (!validateForm()) return;
    setIsEnhancing(true); setError(null);
    try {
      const response = await enhanceProduct(productData, originalImage);
      if (response.success && response.data) { setEnhancedResult(response.data); sessionStorage.setItem('craftconnect_enhancement', JSON.stringify({ original: productData, result: response.data, ts: Date.now() })); }
      else throw new Error(response.error || 'Enhancement failed');
    } catch (e) { setError(e.message || 'Failed to enhance product. Please try again.'); }
    finally { setIsEnhancing(false); }
  };

  const handleUseForQuotation = () => {
    if (!enhancedResult) return;
    sessionStorage.setItem('craftconnect_quotation_data', JSON.stringify({ productName: productData.productName, description: enhancedResult.enhancedDescription || productData.currentDescription, imageUrl: enhancedResult.enhancedImageUrl }));
    navigate('/quotation');
  };

  const handleReset = () => {
    setProductData({ productName: '', currentDescription: '', targetAudience: '', priceRange: '' });
    setOriginalImage(null); setOriginalImageUrl(null); setEnhancedResult(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f7f6]">
      <PageHeader title="Smart Product Enhancer" subtitle="Upload, enhance, and preview your product visuals" onBack={() => navigate('/hub')} actions={[<Button key="reset" variant="muted" onClick={handleReset}>Reset</Button>]} />

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Card>
            <div className="space-y-6">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Product Image *</label>
                <div className="relative">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <Button variant="secondary" className="w-full h-32 !justify-center border-dashed border-2" onClick={() => fileInputRef.current?.click()}>
                    {originalImageUrl ? 'Change Image' : 'Click to Upload Image'}
                  </Button>
                  {originalImageUrl && <img src={originalImageUrl} alt="Selected" className="mt-3 w-full rounded-lg border" />}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Product Name *</label>
                <input type="text" value={productData.productName} onChange={(e) => handleInputChange('productName', e.target.value)} placeholder="e.g., Handwoven Cotton Scarf" className="w-full h-12 px-4 rounded-lg border focus:ring-2 focus:ring-[#ec6d13]" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Current Description *</label>
                <textarea value={productData.currentDescription} onChange={(e) => handleInputChange('currentDescription', e.target.value)} placeholder="Describe materials, craftsmanship, dimensions..." rows={4} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#ec6d13] resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Target Audience</label>
                  <input type="text" value={productData.targetAudience} onChange={(e) => handleInputChange('targetAudience', e.target.value)} placeholder="e.g., Gift buyers" className="w-full h-12 px-4 rounded-lg border focus:ring-2 focus:ring-[#ec6d13]" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Price Range</label>
                  <input type="text" value={productData.priceRange} onChange={(e) => handleInputChange('priceRange', e.target.value)} placeholder="e.g., $25-50" className="w-full h-12 px-4 rounded-lg border focus:ring-2 focus:ring-[#ec6d13]" />
                </div>
              </div>

              <Button onClick={handleEnhanceProduct} disabled={isEnhancing} className="w-full">
                {isEnhancing ? (<span className="flex items-center gap-2"><Spinner/> Processing...</span>) : '🚀 Enhance Product'}
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4">Preview</h3>
            {originalImageUrl && enhancedResult?.enhancedImageUrl ? (
              <EnhancerSlider originalUrl={originalImageUrl} enhancedUrl={enhancedResult.enhancedImageUrl} />
            ) : (
              <div className="h-[360px] grid place-items-center text-slate-500">Upload an image and click Enhance to preview</div>
            )}

            {enhancedResult?.enhancedDescription && (
              <div className="mt-4">
                <h4 className="font-bold mb-2">Enhanced Description</h4>
                <p className="text-slate-700 leading-relaxed">{enhancedResult.enhancedDescription}</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={handleUseForQuotation} disabled={!enhancedResult}>💰 Use for Quotation</Button>
              <Button variant="secondary" onClick={() => navigate('/instagram')}>📱 Post to Instagram</Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SmartProductEnhancerPage;
