import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

interface ScrapePayload {
  job_id: number;
  payload: {
    city: string;
    site_name: string;
    query: string;
  };
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 })
    }

    const body = await req.json();
    const { job_id, payload }: ScrapePayload = body;
    console.log(`Processing job ${job_id} for ${payload.site_name} in ${payload.city}`)

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    const GOOGLE_MAPS_API_KEY = Deno.env.get('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const NEXTJS_APP_URL = Deno.env.get('NEXTJS_APP_URL')

    if (!FIRECRAWL_API_KEY || !OPENAI_API_KEY || !GOOGLE_MAPS_API_KEY || !SUPABASE_SERVICE_ROLE_KEY || !NEXTJS_APP_URL) {
      throw new Error("Missing required environment variables")
    }

    // 1. Firecrawl Search
    console.log(`Searching web for: ${payload.query}`)
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        query: payload.query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true }
      })
    })
    const searchData = await searchRes.json()
    const webResults = searchData.data || []

    const validListings = [];

    if (webResults.length > 0) {
      // 2. OpenAI Parsing
      const systemPrompt = `You are a rental listing parser. 
      Extract structured data from the provided web search results.
      Return a JSON object with a 'listings' key containing an array of:
      {
        "title": "string",
        "description": "string",
        "rent": number,
        "bhk_type": "string",
        "amenities": ["string"],
        "source_url": "string",
        "address": "string"
      }`

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context: Listings in ${payload.city}. Data: ${JSON.stringify(webResults)}` }
          ],
          response_format: { type: "json_object" }
        })
      })
      const aiData = await aiRes.json()
      const parsedListings = JSON.parse(aiData.choices[0].message.content).listings

      // 3. Geocode
      for (const listing of parsedListings) {
        try {
          console.log(`Geocoding address: ${listing.address}`)
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(listing.address + ", " + payload.city)}&key=${GOOGLE_MAPS_API_KEY}`
          )
          const geoData = await geoRes.json()

          if (geoData.status === "OK" && geoData.results.length > 0) {
            const { lat, lng } = geoData.results[0].geometry.location;
            validListings.push({ ...listing, lat, lng });
          }
        } catch (e) {
          console.error(`Failed to geocode listing: ${listing.source_url}`, e)
        }
      }
    }

    // 4. Ingest via Next.js Internal Endpoint (This handles DB save AND PGMQ deletion atomically)
    console.log(`Sending data to Next.js ingestion endpoint for job ${job_id}`)
    const ingestRes = await fetch(`${NEXTJS_APP_URL}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        job_id: job_id,
        listings: validListings 
      })
    })
    
    if (!ingestRes.ok) {
      const errText = await ingestRes.text()
      throw new Error(`Ingestion failed: ${errText}`)
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })

  } catch (err) {
    console.error("Worker error:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
