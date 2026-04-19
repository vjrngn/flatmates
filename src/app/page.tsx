import MapComponent from '@/components/Map'

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <main>
      <MapComponent apiKey={apiKey} />
    </main>
  )
}
