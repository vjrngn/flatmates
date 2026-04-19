'use client'

import { useState, useEffect } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps'
import { getListings } from '@/app/actions/listings'

export default function MapComponent({ apiKey }: { apiKey: string }) {
  const [listings, setListings] = useState<any[]>([])
  const [selectedListing, setSelectedListing] = useState<any | null>(null)

  useEffect(() => {
    async function load() {
      const data = await getListings()
      setListings(data)
    }
    load()
  }, [])

  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-screen w-screen">
        <Map
          defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
          defaultZoom={13}
          mapId="FLATMATES_MAP_ID" // You can create a Map ID in Google Cloud Console for advanced styling
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          {listings.map((listing) => (
            <AdvancedMarker
              key={listing.id}
              position={{
                // Fallback for parsing coordinate data if it's not already transformed
                lat: listing.lat || 12.9716,
                lng: listing.lng || 77.5946
              }}
              onClick={() => setSelectedListing(listing)}
            >
              <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
            </AdvancedMarker>
          ))}

          {selectedListing && (
            <InfoWindow
              position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
              onCloseClick={() => setSelectedListing(null)}
            >
              <div className="p-2 text-black">
                <h2 className="font-bold text-lg">{selectedListing.bhk_type}</h2>
                <p className="text-sm">Rent: ₹{selectedListing.rent}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedListing.amenities?.map((a: string) => (
                    <span key={a} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{a}</span>
                  ))}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  )
}
