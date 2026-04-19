'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapMouseEvent
} from '@vis.gl/react-google-maps'
import { getListings } from '@/app/actions/listings'
import { createListing } from '@/app/actions/createListing'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const AMENITIES_OPTIONS = [
  { id: 'security', label: '24/7 Security' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'gym', label: 'Gym' },
  { id: 'parking', label: 'Parking' },
  { id: 'gated', label: 'Gated Community' },
]

export default function MapComponent({ apiKey }: { apiKey: string }) {
  const [listings, setListings] = useState<any[]>([])
  const [selectedListing, setSelectedListing] = useState<any | null>(null)
  
  // Seeker's Search State
  const [searchPos, setSearchPos] = useState({ lat: 12.9716, lng: 77.5946 })
  const [radius, setRadius] = useState(5000)

  // Poster's State
  const [newListingPos, setNewListingPos] = useState<{ lat: number; lng: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const onMapClick = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      setNewListingPos({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
    }
  }

  const handleCreateListing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newListingPos) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const selectedAmenities = AMENITIES_OPTIONS
      .filter(opt => formData.get(opt.id) === 'on')
      .map(opt => opt.id)

    try {
      await createListing({
        lat: newListingPos.lat,
        lng: newListingPos.lng,
        bhk_type: formData.get('bhk_type') as string,
        rent: parseInt(formData.get('rent') as string),
        amenities: selectedAmenities,
        occupancy_rules: {
          diet: formData.get('diet'),
          pets: formData.get('pets') === 'on',
          gender: formData.get('gender'),
        }
      })
      setNewListingPos(null)
      loadListings()
    } catch (err) {
      alert('Failed to create listing')
    } finally {
      setIsSubmitting(false)
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
          onClick={onMapClick}
        >
          <AdvancedMarker
            position={searchPos}
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) setSearchPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
            }}
          >
            <Pin background={'#4285F4'} glyphColor={'#fff'} borderColor={'#000'} />
          </AdvancedMarker>

          {listings.map((listing) => (
            <AdvancedMarker
              key={listing.id}
              position={{ lat: listing.lat, lng: listing.lng }}
              onClick={(e) => {
                // Prevent map click when clicking a marker
                e.stopPropagations?.()
                setSelectedListing(listing)
              }}
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
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* Create Listing Dialog */}
        <Dialog open={!!newListingPos} onOpenChange={(open) => !open && setNewListingPos(null)}>
          <DialogContent className="sm:max-w-[425px] bg-white text-black">
            <DialogHeader>
              <DialogTitle>Post a Listing</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateListing} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bhk_type" className="text-right text-xs">Type</Label>
                <Select name="bhk_type" defaultValue="1BHK">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1RK">1 RK</SelectItem>
                    <SelectItem value="1BHK">1 BHK</SelectItem>
                    <SelectItem value="2BHK">2 BHK</SelectItem>
                    <SelectItem value="3BHK">3 BHK</SelectItem>
                    <SelectItem value="Shared">Shared Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rent" className="text-right text-xs">Rent (₹)</Label>
                <Input id="rent" name="rent" type="number" defaultValue="15000" className="col-span-3" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Amenities</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITIES_OPTIONS.map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <Checkbox id={opt.id} name={opt.id} />
                      <label htmlFor={opt.id} className="text-[10px] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{opt.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs">Occupancy Rules (India Context)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Diet</Label>
                    <Select name="diet" defaultValue="any">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="veg">Veg Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Gender</Label>
                    <Select name="gender" defaultValue="any">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox id="pets" name="pets" />
                  <Label htmlFor="pets" className="text-[10px]">Pets Allowed?</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Posting...' : 'Post Listing'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Search Slider */}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </APIProvider>
  )
}
