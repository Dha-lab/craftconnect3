import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const ProductAnalysisPage = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    try { setLoading(true); setError(''); /* call analyzeComprehensive if wired */ navigate('/enhancer'); } catch (e) { setError('Failed to analyze'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F0]">
      <PageHeader title="Product Analysis" subtitle="Upload product images and optional audio for insights" onBack={() => navigate('/business-summary')} />
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</div>}

          <Card>
            <h3 className="text-lg font-bold mb-3">Product Images</h3>
            <input type="file" accept="image/*" multiple onChange={(e) => setImage(e.target.files[0])} />
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-3">Optional Audio</h3>
            <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files[0])} />
          </Card>

          <div className="flex justify-end">
            <Button onClick={analyze} disabled={loading}>
              {loading ? (<span className="flex items-center gap-2"><Spinner/> Analyzing...</span>) : 'Continue'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductAnalysisPage;
