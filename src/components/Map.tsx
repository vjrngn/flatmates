'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps'
import { getListings } from '@/app/actions/listings'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function MapComponent({ apiKey }: { apiKey: string }) {
  const [listings, setListings] = useState<any[]>([])
  const [selectedListing, setSelectedListing] = useState<any | null>(null)
  
  // Seeker's Search State
  const [searchPos, setSearchPos] = useState({ lat: 12.9716, lng: 77.5946 })
  const [radius, setRadius] = useState(5000) // 5km default

  const loadListings = useCallback(async () => {
    const data = await getListings({ 
      lat: searchPos.lat, 
      lng: searchPos.lng, 
      radius 
    })
    setListings(data)
  }, [searchPos, radius])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSearchPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    }
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-screen w-screen">
        <Map
          defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
          defaultZoom={13}
          mapId="FLATMATES_MAP_ID"
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          {/* Seeker's Search Pin (Blue) */}
          <AdvancedMarker
            position={searchPos}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            title="Drag me to search"
          >
            <Pin background={'#4285F4'} glyphColor={'#fff'} borderColor={'#000'} />
          </AdvancedMarker>

          {/* Listings Pins (Yellow) */}
          {listings.map((listing) => (
            <AdvancedMarker
              key={listing.id}
              position={{ lat: listing.lat, lng: listing.lng }}
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
              <div className="p-2 text-black max-w-xs">
                <h2 className="font-bold text-lg">{selectedListing.bhk_type}</h2>
                <p className="text-sm font-semibold text-green-600">₹{selectedListing.rent} / month</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedListing.amenities?.map((a: string) => (
                    <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                  ))}
                </div>
                {selectedListing.occupancy_rules && (
                  <div className="mt-2 pt-2 border-t text-[10px] text-gray-500">
                    {Object.entries(selectedListing.occupancy_rules).map(([k, v]) => (
                      <span key={k} className="mr-2 uppercase">{k}: {String(v)}</span>
                    ))}
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* UI Overlay: Radius Slider */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <Card className="bg-white/90 backdrop-blur shadow-xl border-none">
            <CardContent className="pt-6">
              <div className="flex justify-between mb-4 items-center">
                <span className="text-sm font-medium text-black">Search Radius</span>
                <Badge variant="outline" className="text-black border-black/20">{(radius / 1000).toFixed(1)} km</Badge>
              </div>
              <Slider
                defaultValue={[5000]}
                max={20000}
                min={500}
                step={500}
                onValueChange={(val) => {
                  const newValue = Array.isArray(val) ? val[0] : val
                  setRadius(newValue)
                }}
              />
              <p className="text-[10px] text-gray-500 mt-4 text-center">
                Drag the <span className="text-blue-500 font-bold">blue pin</span> to move center.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </APIProvider>
  )
}
