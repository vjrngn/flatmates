import { GoogleMapsEmbed } from '@next/third-parties/google'

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <main className="fixed inset-0 h-full w-full overflow-hidden">
      <GoogleMapsEmbed
        apiKey={apiKey}
        height="100%"
        width="100%"
        mode="view"
        center="12.9716,77.5946"
        zoom="12"
        loading="eager"
        style="border:0; margin:0; padding:0; height:100vh; width:100vw;"
      />
    </main>
  )
}
