'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendOTPAction(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: true
    }
  })

  if (error) {
    console.error('Error sending OTP:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function verifyOTPAction(email: string, token: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: token,
    type: 'email',
  })

  if (error) {
    console.error('Error verifying OTP:', error.message)
    return { success: false, error: error.message }
  }

  if (data.user) {
    // Create/Update profile in code
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: data.user.id,
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error upserting profile:', profileError.message)
    }
  }

  revalidatePath('/')
  return { success: true, user: data.user }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
