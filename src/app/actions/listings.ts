'use server'

import { createClient } from '@/lib/supabase/server'

export async function getListings() {
  const supabase = await createClient()
  
  // Call our custom RPC function that returns lat/lng as floats
  const { data, error } = await supabase.rpc('get_listings_with_coords')

  if (error) {
    console.error('Error fetching listings:', error)
    return []
  }

  return data
}
