import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { analyzeBusinessAudio, analyzeBusinessText } from '../services/api';

const BusinessOverviewPage = () => {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      setTimeout(() => { mediaRecorder.stop(); setRecording(false); }, 10000);
    } catch (e) {
      setError('Microphone permission denied or not available.');
    }
  };

  const analyze = async () => {
    try {
      setLoading(true); setError('');
      if (audioBlob) {
        const res = await analyzeBusinessAudio(audioBlob);
        if (!res.success) throw new Error(res.error);
      } else if (text.trim()) {
        const res = await analyzeBusinessText(text.trim());
        if (!res.success) throw new Error(res.error);
      } else {
        setError('Provide an audio recording or a written description.');
        return;
      }
      navigate('/business-summary');
    } catch (e) { setError(e.message || 'Analysis failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F0]">
      <PageHeader title="Business Overview" subtitle="Record or describe your business to get insights" onBack={() => navigate('/')} actions={[<Button key="skip" variant="muted" onClick={() => navigate('/business-summary')}>Skip</Button>]} />
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {error && <Alert>{error}</Alert>}
          <Card>
            <h3 className="text-lg font-bold mb-3">Record Audio (10s)</h3>
            <div className="flex items-center gap-3">
              <Button onClick={startRecording} disabled={recording}>
                {recording ? (<span className="flex items-center gap-2"><Spinner/> Recording...</span>) : 'Start Recording'}
              </Button>
              {audioBlob && <span className="text-sm text-emerald-600">Audio captured ✔</span>}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-3">Or, Type Description</h3>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full rounded-lg border p-4 focus:ring-2 focus:ring-[#ec6d13]" placeholder="Describe your craft business, challenges, and goals..." />
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

export default BusinessOverviewPage;
