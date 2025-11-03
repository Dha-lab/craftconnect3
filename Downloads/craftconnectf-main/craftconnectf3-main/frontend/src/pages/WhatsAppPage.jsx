import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateWhatsAppMessage } from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const WhatsAppPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [generatedMessage, setGeneratedMessage] = useState(
    "Hello [Customer Name]! ✨ Your handmade [Product Name] is ready. Here are the details... We hope you love it! You can complete your purchase here: [Link]."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let data = null;
    if (location.state?.businessData) {
      data = location.state.businessData;
    } else {
      try {
        const storedData = sessionStorage.getItem('craftconnect_analysis');
        if (storedData) data = JSON.parse(storedData);
      } catch {}
    }

    if (data) {
      setBusinessData(data);
      generateMessage(data);
    }
    setCharacterCount(generatedMessage.length);
  }, [location.state]);

  const generateMessage = async (data = businessData) => {
    if (!data) {
      setError('No business data available. Please complete business analysis first.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateWhatsAppMessage({
        businessType: data.businessType || 'Handmade Crafts',
        detectedFocus: data.detectedFocus || 'Quality handmade products',
        topProblems: data.topProblems || ['Customer engagement', 'Marketing'],
        recommendedSolutions: data.recommendedSolutions || ['WhatsApp Business', 'Social Media'],
        productInfo: data.productInfo || {},
        targetAudience: data.targetAudience || 'General customers',
        businessGoals: data.businessGoals || ['Increase sales', 'Build brand awareness']
      });
      if (response.success && response.data) {
        const newMessage = response.data.message || response.data.whatsappMessage || response.data;
        const msg = typeof newMessage === 'string' ? newMessage : JSON.stringify(newMessage);
        setGeneratedMessage(msg);
        setCharacterCount(msg.length);
        sessionStorage.setItem('craftconnect_whatsapp_message', msg);
      } else throw new Error(response.error || 'Failed to generate WhatsApp message');
    } catch (e) {
      setError(e.message || 'Failed to generate message. Please try again.');
    } finally { setIsGenerating(false); }
  };

  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setGeneratedMessage(newMessage);
    setCharacterCount(newMessage.length);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const openWhatsAppBusiness = () => {
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F0] text-slate-800">
      <PageHeader
        title="WhatsApp Message"
        subtitle={businessData ? 'AI-personalized message for your business' : 'Generate a professional message'}
        onBack={() => navigate(-1)}
        actions={[
          <Button key="regen" onClick={() => generateMessage()} disabled={isGenerating || !businessData}>
            {isGenerating ? (<span className="flex items-center gap-2"><Spinner size={16}/> Generating...</span>) : 'Regenerate'}
          </Button>
        ]}
      />

      <main className="px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          {error && (
            <Card className="border-rose-200 bg-rose-50">
              <div className="flex items-center gap-3 text-rose-700">
                <span className="material-symbols-outlined">error</span>
                <p>{error}</p>
              </div>
            </Card>
          )}

          <Card className="min-h-[20rem]">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Generated Message</h3>
            <textarea
              value={generatedMessage}
              onChange={handleMessageChange}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              className="h-[18rem] w-full resize-none border rounded-lg p-4 text-lg leading-relaxed text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[#ec6d13]"
              placeholder="Your AI-generated WhatsApp message will appear here..."
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <p className={characterCount > 4096 ? 'text-rose-600' : 'text-slate-500'}>
                {characterCount} / 4096 characters {characterCount > 4096 && '(exceeds limit)'}
              </p>
              {isEditing && <p className="text-blue-500">✏️ Editing</p>}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button onClick={openWhatsAppBusiness} disabled={!generatedMessage.trim() || characterCount > 4096} className="w-full">
              📱 Send via WhatsApp
            </Button>
            <Button variant="secondary" onClick={copyToClipboard} disabled={!generatedMessage.trim()} className="w-full">
              {isCopied ? '✅ Copied' : 'Copy Message'}
            </Button>
            <Button variant="muted" onClick={() => navigate('/business-overview')} className="w-full">
              Start Analysis
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppPage;
