import { useEffect } from 'react';
import { MultiHorizonForecast } from '@/components/MultiHorizonForecast';

const Forecast = () => {
  useEffect(() => {
    document.title = 'Multi-Horizon Range Forecast — AlphaRange';
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <MultiHorizonForecast />
      </div>
    </main>
  );
};

export default Forecast;
