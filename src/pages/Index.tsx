import { UniswapCalculator } from "@/components/UniswapCalculator";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    // SEO optimization
    document.title = "Uniswap Range Optimizer - AI-Powered Liquidity Analytics";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'AI-powered Uniswap v3 liquidity range optimization with social sentiment analysis and on-chain metrics for maximum yield on Polygon.');
    }
    
    // Add structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Uniswap Range Optimizer",
      "description": "AI-powered DeFi analytics tool with social sentiment analysis for optimal Uniswap v3 liquidity ranges",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <UniswapCalculator />
      </div>
    </main>
  );
};

export default Index;
