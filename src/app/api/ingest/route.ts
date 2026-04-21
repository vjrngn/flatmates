import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Basic security: Check for a shared secret
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listings, job_id } = await req.json();

    if (!Array.isArray(listings) || job_id === undefined) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();

    // Call the atomic RPC function
    const { error } = await supabase.rpc('ingest_scraped_listings', {
      p_listings: listings,
      p_job_id: job_id
    });

    if (error) {
      console.error("Atomic ingestion error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: listings.length 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
