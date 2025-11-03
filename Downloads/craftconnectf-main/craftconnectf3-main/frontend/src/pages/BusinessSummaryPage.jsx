import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const BusinessSummaryPage = () => {
  const navigate = useNavigate();
  let summary = null;
  try { const s = sessionStorage.getItem('craftconnect_analysis'); if (s) summary = JSON.parse(s); } catch {}

  return (
    <div className="min-h-screen w-full bg-[#FFF8F0]">
      <PageHeader title="Business Summary" subtitle="Review AI understanding of your business" onBack={() => navigate('/business-overview')} actions={[<Button key="next" onClick={() => navigate('/product-analysis')}>Continue</Button>]} />
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <h3 className="text-lg font-bold mb-2">Detected Focus</h3>
            <p className="text-slate-700">{summary?.detectedFocus || 'Not available yet. Please complete analysis.'}</p>
          </Card>
          <Card>
            <h3 className="text-lg font-bold mb-2">Top Problems</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              {(summary?.topProblems || []).map((p, i) => (<li key={i}>{p}</li>))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-lg font-bold mb-2">Recommended Solutions</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              {(summary?.recommendedSolutions || []).map((p, i) => (<li key={i}>{p}</li>))}
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BusinessSummaryPage;
