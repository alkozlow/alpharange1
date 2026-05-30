import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  baseAsset: z.string().trim().min(1).max(10).regex(/^[A-Z0-9]+$/, "Asset must be alphanumeric"),
  quoteAsset: z.string().trim().min(1).max(10).regex(/^[A-Z0-9]+$/, "Asset must be alphanumeric")
});

interface SentimentResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -1 to 1, where -1 is very bearish, 1 is very bullish
  confidence: number; // 0 to 1
  newsCount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input parameters',
        details: validation.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { baseAsset, quoteAsset } = validation.data;

    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    console.log(`Analyzing sentiment for ${baseAsset}/${quoteAsset}`);

    // Fetch news articles for the cryptocurrency
    const searchQuery = `${baseAsset} cryptocurrency OR ${baseAsset} crypto OR ${baseAsset} price`;
    const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&pageSize=50&language=en&apiKey=${newsApiKey}`;
    
    const newsResponse = await fetch(newsUrl);
    const newsData = await newsResponse.json();

    if (newsData.status !== 'ok') {
      console.error('News API error:', newsData);
      throw new Error(`News API error: ${newsData.message || 'Unknown error'}`);
    }

    const articles = newsData.articles || [];
    console.log(`Found ${articles.length} articles for sentiment analysis`);

    if (articles.length === 0) {
      return new Response(JSON.stringify({
        sentiment: 'neutral' as const,
        score: 0,
        confidence: 0,
        newsCount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sentiment analysis keywords
    const bullishKeywords = [
      'surge', 'rally', 'pump', 'moon', 'bull', 'rise', 'gain', 'up', 'high', 'peak',
      'breakthrough', 'adoption', 'partnership', 'upgrade', 'positive', 'optimistic',
      'bullish', 'growth', 'increase', 'strong', 'outperform', 'milestone', 'success'
    ];

    const bearishKeywords = [
      'crash', 'dump', 'bear', 'fall', 'drop', 'decline', 'down', 'low', 'dip',
      'correction', 'sell-off', 'negative', 'pessimistic', 'bearish', 'concern',
      'risk', 'regulation', 'ban', 'hack', 'scam', 'volatility', 'uncertainty'
    ];

    let totalScore = 0;
    let scoredArticles = 0;

    // Analyze each article
    for (const article of articles) {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      
      let articleScore = 0;
      let wordCount = 0;

      // Count bullish keywords
      for (const keyword of bullishKeywords) {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        articleScore += matches;
        wordCount += matches;
      }

      // Count bearish keywords (negative score)
      for (const keyword of bearishKeywords) {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        articleScore -= matches;
        wordCount += matches;
      }

      // Only count articles with relevant keywords
      if (wordCount > 0) {
        totalScore += articleScore;
        scoredArticles++;
      }
    }

    // Calculate final sentiment
    const averageScore = scoredArticles > 0 ? totalScore / scoredArticles : 0;
    const normalizedScore = Math.max(-1, Math.min(1, averageScore / 3)); // Normalize to -1 to 1
    
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    if (normalizedScore > 0.2) {
      sentiment = 'bullish';
    } else if (normalizedScore < -0.2) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }

    // Calculate confidence based on number of relevant articles
    const confidence = Math.min(1, scoredArticles / 10); // More articles = higher confidence

    const result: SentimentResult = {
      sentiment,
      score: normalizedScore,
      confidence,
      newsCount: scoredArticles
    };

    console.log('Sentiment analysis result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sentiment-analysis function:', error);
    
    // Map to safe client error message
    let clientMessage = 'An error occurred while processing sentiment analysis';
    if (error.message?.includes('API')) {
      clientMessage = 'External service temporarily unavailable';
    }
    
    return new Response(JSON.stringify({ 
      error: clientMessage,
      sentiment: 'neutral' as const,
      score: 0,
      confidence: 0,
      newsCount: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});