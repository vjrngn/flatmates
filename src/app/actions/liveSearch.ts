"use server";

import FirecrawlApp from '@mendable/firecrawl-js';
import { generateText, tool, isLoopFinished, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function liveSearch(query: string, userLocation?: { lat: number, lng: number }) {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  const oaKey = process.env.OPENAI_API_KEY;

  if (!fcKey || !oaKey) {
    return { error: "API keys are missing." };
  }

  const openai = createOpenAI({
    baseURL: "https://opencode.ai/zen/v1",
    apiKey: oaKey
  });
  const firecrawl = new FirecrawlApp({ apiKey: fcKey });

  try {
    const { text } = await generateText({
      model: openai('gpt-5.4-mini'),
      system: `You are a helpful rental assistant. Your goal is to find rental listings for the user.
      You can search the local database using 'search_listings' and the web using 'search_web'.
      Always try to find listings that match the user's criteria (rent, BHK type, location).
      
      CRITICAL: For web search results, you MUST use the 'get_coordinates' tool for each listing to get accurate latitude and longitude before returning the final JSON.
      
      CRITICAL: You MUST return the final answer as a valid JSON object with a 'listings' key. 
      The 'listings' key must contain an array of objects with the following schema:
      {
        "id": "string",
        "lat": number,
        "lng": number,
        "rent": number,
        "bhk_type": "string",
        "amenities": ["string"],
        "source_url": "string",
        "title": "string",
        "description": "string",
        "is_live": boolean (true if from web, false if from database)
      }
      Do not include any other text in your final response besides the JSON.`,
      prompt: `User query: "${query}" near location: ${userLocation?.lat}, ${userLocation?.lng}`,
      tools: {
        get_coordinates: tool({
          description: 'Get latitude and longitude for a given address using Google Maps.',
          inputSchema: z.object({
            address: z.string(),
          }),
          execute: async ({ address }: { address: string }) => {
            const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!googleKey) throw new Error("Google Maps API key is missing.");
            
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
            );
            const data = await response.json();
            
            if (data.status === "OK" && data.results.length > 0) {
              const { lat, lng } = data.results[0].geometry.location;
              return { lat, lng };
            }
            throw new Error(`Could not find coordinates for: ${address}`);
          },
        }),
        search_listings: tool({
          description: 'Search the local database for rental listings using SQL-like filters.',
          inputSchema: z.object({
            max_rent: z.number().optional(),
            min_rent: z.number().optional(),
            bhk_type: z.string().optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            radius_km: z.number().optional(),
          }),
          execute: async (params: any) => {
            const { max_rent, min_rent, bhk_type, lat, lng, radius_km } = params;
            const supabase = await createClient();
            
            // Start with the RPC for proximity if location is provided, otherwise simple query
            let queryBuilder;
            if (lat && lng) {
              queryBuilder = supabase.rpc('get_listings_with_coords', {
                search_lat: lat,
                search_lng: lng,
                radius_meters: (radius_km || 5) * 1000
              });
            } else {
              queryBuilder = supabase.from('listings').select('*');
            }

            if (max_rent) queryBuilder = (queryBuilder as any).lte('rent', max_rent);
            if (min_rent) queryBuilder = (queryBuilder as any).gte('rent', min_rent);
            if (bhk_type) queryBuilder = (queryBuilder as any).ilike('bhk_type', `%${bhk_type}%`);

            const { data, error } = await (queryBuilder as any);
            if (error) throw error;
            return data;
          },
        }),
        search_web: tool({
          description: 'Search the web for current rental listings using Firecrawl.',
          inputSchema: z.object({
            query: z.string(),
          }),
          execute: async ({ query: webQuery }: any) => {
            const results = await firecrawl.search(webQuery, {
              limit: 5,
              scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
            });
            // results.web is the correct property for v2 client SearchData
            return (results as any).web || [];
          },
        }),
      },
      stopWhen: [isLoopFinished(), stepCountIs(5)],
    });

    // Extract JSON from the response text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const listings = parsed.listings;

      // Save web results back to database
      const webListings = listings.filter((l: any) => l.is_live);
      if (webListings.length > 0) {
        const supabase = await createClient();
        const { error: saveError } = await supabase.from('listings').upsert(
          webListings.map((l: any) => ({
            title: l.title,
            description: l.description,
            rent: l.rent,
            bhk_type: l.bhk_type,
            amenities: l.amenities,
            source_url: l.source_url,
            location: `POINT(${l.lng} ${l.lat})`
          })),
          { onConflict: 'source_url' }
        );
        if (saveError) console.error("Error saving web listings:", saveError);
      }

      return { listings: parsed.listings };
    }

    return { listings: [] };
  } catch (error: any) {
    console.error("Agentic search error:", error);
    return { error: 'Something went wrong' };
  }
}
