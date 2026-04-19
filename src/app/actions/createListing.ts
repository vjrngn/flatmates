'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createListing(formData: {
  lat: number
  lng: number
  bhk_type: string
  rent: number
  amenities: string[]
  occupancy_rules: Record<string, any>
}) {
  const supabase = await createClient()

  // We try to get the user, but don't fail if they aren't there
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, we insert with null user_id (anonymous post)
  // This avoids FK constraint errors if the fallback user doesn't exist in the DB
  const userId = user?.id || null

  const { data, error } = await supabase.from('listings').insert({
    user_id: userId,
    location: `POINT(${formData.lng} ${formData.lat})`,
    bhk_type: formData.bhk_type,
    rent: formData.rent,
    amenities: formData.amenities,
    occupancy_rules: formData.occupancy_rules,
  })

  if (error) {
    console.error('Error creating listing:', error)
    throw new Error(error.message)
  }

  revalidatePath('/')
  return { success: true }
}
