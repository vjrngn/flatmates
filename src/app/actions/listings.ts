'use server'

import { createClient } from '@/lib/supabase/server'

export async function getListings(params?: { lat?: number; lng?: number; radius?: number }) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('get_listings_with_coords', {
    search_lat: params?.lat,
    search_lng: params?.lng,
    radius_meters: params?.radius || 5000
  })

  if (error) {
    console.error('Error fetching listings:', error)
    return []
  }

  return data
}
