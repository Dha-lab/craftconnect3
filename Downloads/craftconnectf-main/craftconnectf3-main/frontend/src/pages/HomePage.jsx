import React from 'react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const HomePage = () => {
  return (
    <div className="min-h-screen w-full bg-[#FFF8F0]">
      <PageHeader title="CraftConnect" subtitle="AI tools for artisans to grow sales and presence" />
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Build your craft business with AI</h1>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">Analyze your business, enhance product images, generate quotations, and publish to social and Shopify — in minutes.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button as="a" href="/business-overview">Get Started</Button>
              <Button as="a" href="/hub" variant="secondary">Open Hub</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Business Analysis', desc: 'Record or type and get actionable insights.' , href:'/business-overview'},
              { title: 'Smart Enhancer', desc: 'Enhance product photos and descriptions.', href:'/enhancer'},
              { title: 'AI Quotation', desc: 'Create professional quotations quickly.', href:'/quotation'}
            ].map((f) => (
              <Card key={f.title}>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-slate-600 mt-1">{f.desc}</p>
                <Button as="a" href={f.href} className="mt-4">Open</Button>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
