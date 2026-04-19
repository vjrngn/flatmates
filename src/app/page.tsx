import MapComponent from '@/components/Map'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main>
      <MapComponent apiKey={apiKey} initialUser={user} />
    </main>
  )
}
