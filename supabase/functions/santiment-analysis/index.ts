import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// AlphaRange v2 — Santiment context layer.
//
// Returns a slow-moving regime modifier (volatility multiplier + center bias) for
// the multi-horizon range grid, plus a context snapshot for display. The SANBASE
// PRO tier has a ~30-day data holdback, so we query a window ending ~31 days ago.
// The frontend weights this toward longer horizons (6w/3m) for that reason.

const SANTIMENT_API_KEY = Deno.env.get("SANTIMENT_API_KEY");
const SANTIMENT_URL = "https://api.santiment.net/graphql";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const inputSchema = z.object({
  slug: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
});

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

async function fetchSeries(metric: string, slug: string, from: string, to: string): Promise<number[]> {
  const query = `{ getMetric(metric:"${metric}"){ timeseriesData(slug:"${slug}" from:"${from}" to:"${to}" interval:"1d"){ value } } }`;
  const res = await fetch(SANTIMENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Apikey ${SANTIMENT_API_KEY}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Santiment HTTP ${res.status}`);
  const json = await res.json();
  const data = json?.data?.getMetric?.timeseriesData;
  if (!Array.isArray(data)) return [];
  return data.map((d: { value: number | null }) => d.value).filter((v): v is number => v != null);
}

function unavailable(reason: string) {
  return { available: false, volMultiplier: 1, centerBias: 0, reason };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.issues }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SANTIMENT_API_KEY) {
      return new Response(JSON.stringify(unavailable("SANTIMENT_API_KEY not configured")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug } = parsed.data;
    // PRO tier: query a 90-day window ending ~31 days ago (inside the holdback).
    const from = "utc_now-121d";
    const to = "utc_now-31d";

    const [sv, mv, fr, sent, rv] = await Promise.all([
      fetchSeries("social_volume_total", slug, from, to),
      fetchSeries("mvrv_usd", slug, from, to),
      fetchSeries("funding_rate", slug, from, to),
      fetchSeries("sentiment_balance_total", slug, from, to),
      fetchSeries("price_volatility_2w", slug, from, to),
    ]);

    if (sv.length < 10) {
      return new Response(JSON.stringify(unavailable("Insufficient Santiment history for slug")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const last = (a: number[]) => a[a.length - 1];
    const socialZ = std(sv) > 0 ? clamp((last(sv) - mean(sv)) / std(sv), -3, 3) : 0;
    const fundingZ = fr.length > 1 && std(fr) > 0 ? clamp((last(fr) - mean(fr)) / std(fr), -3, 3) : 0;
    const mvrvLast = mv.length ? last(mv) : 1;
    const sentLast = sent.length ? last(sent) : 0;
    const rvLast = rv.length ? last(rv) : 0;

    // Volatility multiplier: social-volume spikes and extreme funding widen ranges.
    const socialComponent = 0.08 * clamp(socialZ, -1.5, 2.5);
    const fundingComponent = clamp(0.04 * Math.abs(fundingZ), 0, 0.1);
    const volMultiplier = clamp(1 + socialComponent + fundingComponent, 0.85, 1.4);

    // Center bias: weighted sentiment tilt + MVRV mean-reversion (overvalued → down).
    const sentimentPart = 0.02 * Math.tanh(sentLast / 200);
    const mvrvPart = -0.04 * Math.tanh((mvrvLast - 1.2) / 1.0);
    const centerBias = clamp(sentimentPart + mvrvPart, -0.06, 0.06);

    const socialTrend = socialZ > 1 ? "elevated" : socialZ < -1 ? "quiet" : "normal";
    const valuation = mvrvLast > 2 ? "overvalued" : mvrvLast < 1 ? "undervalued" : "fair";

    const result = {
      available: true,
      volMultiplier,
      centerBias,
      asOf: to,
      context: {
        socialVolumeLast: last(sv),
        socialZ,
        socialTrend,
        mvrv: mvrvLast,
        valuation,
        sentimentBalance: sentLast,
        fundingRate: fr.length ? last(fr) : null,
        fundingZ,
        santimentRealizedVol2w: rvLast,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("santiment-analysis error:", error);
    return new Response(JSON.stringify(unavailable("Santiment request failed")), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
