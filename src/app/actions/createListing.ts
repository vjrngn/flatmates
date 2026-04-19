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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // For the hackathon, we allow anonymous or test user if not logged in
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

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
