"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer, Marker } from "@googlemaps/markerclusterer";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getListings } from "@/app/actions/listings";
import { createListing } from "@/app/actions/createListing";
import { AuthModal } from "./AuthModal";
import { signOutAction } from "@/app/actions/auth";
import { User } from "@supabase/supabase-js";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Component to handle clustering
const ListingMarkers = ({ 
  listings, 
  onMarkerClick 
}: { 
  listings: any[], 
  onMarkerClick: (listing: any) => void 
}) => {
  const map = useMap();
  const [markers, setMarkers] = useState<{ [key: string]: Marker }>({});
  const clusterer = useRef<MarkerClusterer | null>(null);

  // Initialize Clusterer
  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map });
    }
  }, [map]);

  // Update clusterer when markers state changes
  useEffect(() => {
    if (clusterer.current) {
      clusterer.current.clearMarkers();
      clusterer.current.addMarkers(Object.values(markers));
    }
  }, [markers]);

  // Callback to collect marker instances from AdvancedMarker
  const setMarkerRef = useCallback((marker: Marker | null, key: string) => {
    setMarkers((prev) => {
      if (marker) {
        if (prev[key] === marker) return prev;
        return { ...prev, [key]: marker };
      } else {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
    });
  }, []);

  return (
    <>
      {listings.map((listing) => (
        <MarkerWithRef
          key={listing.id}
          listing={listing}
          onMarkerClick={onMarkerClick}
          setMarkerRef={setMarkerRef}
        />
      ))}
    </>
  );
};

// Helper component to keep the ref stable for each marker
const MarkerWithRef = ({ 
  listing, 
  onMarkerClick, 
  setMarkerRef 
}: { 
  listing: any, 
  onMarkerClick: (listing: any) => void,
  setMarkerRef: (marker: Marker | null, key: string) => void
}) => {
  const ref = useCallback((marker: Marker | null) => {
    setMarkerRef(marker as unknown as Marker, listing.id);
  }, [listing.id, setMarkerRef]);

  return (
    <AdvancedMarker
      position={{ lat: listing.lat, lng: listing.lng }}
      ref={ref}
      onClick={() => onMarkerClick(listing)}
    >
      <Pin background={"#FBBC04"} glyphColor={"#000"} borderColor={"#000"} />
    </AdvancedMarker>
  );
};

// Component to handle map centering without fighting user interaction
const MapHandler = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
};

export default function InteractiveMap({ 
  apiKey,
  initialUser
}: { 
  apiKey: string,
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [searchPos, setSearchPos] = useState(BANGALORE_CENTER);
  const [radius, setRadius] = useState(2000);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"post" | null>(null);

  // Map state
  const [mapCenter, setMapCenter] = useState(BANGALORE_CENTER);
  const [zoom, setZoom] = useState(13);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPos = { lat: latitude, lng: longitude };
          setSearchPos(newPos);
          setMapCenter(newPos);
        },
        (error) => {
          console.warn("Geolocation permission denied or failed:", error.message);
        }
      );
    }
  }, []);
  
  // Post Listing State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newListingPos, setNewListingPos] = useState<{lat: number, lng: number} | null>(null);
  const [formData, setFormData] = useState({
    rent: "",
    bhk_type: "2BHK",
    amenities: [] as string[]
  });

  // Fetch listings when search position or radius changes
  useEffect(() => {
    const fetchListings = async () => {
      const data = await getListings({ lat: searchPos.lat, lng: searchPos.lng, radius });
      setListings(data || []);
    };
    fetchListings();
  }, [searchPos, radius]);

  const handleMapClick = (e: any) => {
    if (e.detail.latLng) {
      setNewListingPos(e.detail.latLng);
      setIsModalOpen(true);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingPos) return;

    const res = await createListing({
      rent: parseInt(formData.rent),
      bhk_type: formData.bhk_type,
      lat: newListingPos.lat,
      lng: newListingPos.lng,
      amenities: formData.amenities,
      occupancy_rules: {} // Default for now
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormData({ rent: "", bhk_type: "2BHK", amenities: [] });
      // Refresh listings
      const data = await getListings({ lat: searchPos.lat, lng: searchPos.lng, radius });
      setListings(data || []);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={BANGALORE_CENTER}
          defaultZoom={13}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          mapId="bf51a910020fa25a" // Required for AdvancedMarker
          onClick={handleMapClick}
        >
          <MapHandler center={mapCenter} />
          {/* Search Origin Pin */}
          <AdvancedMarker
            position={searchPos}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) {
                const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setSearchPos(newPos);
              }
            }}
          >
            <Pin background={"#4285F4"} glyphColor={"#000"} borderColor={"#000"} />
          </AdvancedMarker>

          {/* Clustered Listings */}
          <ListingMarkers 
            listings={listings} 
            onMarkerClick={setSelectedListing} 
          />

          {selectedListing && (
            <InfoWindow
              position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
              onCloseClick={() => setSelectedListing(null)}
            >
              <div className="p-2 max-w-xs">
                <div className="flex gap-2 mb-2">
                  <Badge variant="secondary">₹{selectedListing.rent.toLocaleString()}</Badge>
                  <Badge variant="outline">{selectedListing.bhk_type}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedListing.amenities?.map((a: string) => (
                    <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                  ))}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onOpenChange={setIsAuthModalOpen}
        onSuccess={async (authenticatedUser) => {
          setUser(authenticatedUser);
          if (pendingAction === "post") {
            setIsModalOpen(true);
            setPendingAction(null);
          }
        }}
      />

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {user ? (
          <div className="flex gap-2">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-xl border border-gray-200 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <Button 
              variant="destructive" 
              className="rounded-full shadow-xl" 
              size="icon"
              onClick={() => signOutAction()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button 
            className="rounded-full shadow-xl bg-blue-600 hover:bg-blue-700" 
            onClick={() => setIsAuthModalOpen(true)}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Login
          </Button>
        )}
      </div>

      {/* UI Overlay for Search Control */}
      <div className="absolute top-4 left-4 z-10 w-72 bg-white/90 backdrop-blur p-4 rounded-xl shadow-2xl border border-gray-200">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📍 Search Radius: <span className="text-blue-600">{(radius / 1000).toFixed(1)} km</span>
        </h2>
        <Slider
          value={[radius]}
          onValueChange={(val: any) => {
            const nextValue = Array.isArray(val) ? val[0] : val;
            if (typeof nextValue === "number" && !isNaN(nextValue)) {
              setRadius(nextValue);
            }
          }}
          min={500}
          max={20000}
          step={500}
          className="mb-4"
        />
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
          Drag the blue pin to change location
        </p>
      </div>

      {/* Post Listing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Post New Listing</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateListing} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent (₹)</Label>
                <Input 
                  id="rent" 
                  type="number" 
                  placeholder="25000" 
                  value={formData.rent}
                  onChange={e => setFormData({...formData, rent: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bhk">BHK Type</Label>
                <Select 
                  value={formData.bhk_type}
                  onValueChange={val => setFormData({...formData, bhk_type: val})}
                >
                  <SelectTrigger id="bhk">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1RK">1RK</SelectItem>
                    <SelectItem value="1BHK">1BHK</SelectItem>
                    <SelectItem value="2BHK">2BHK</SelectItem>
                    <SelectItem value="3BHK">3BHK</SelectItem>
                    <SelectItem value="4BHK">4BHK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Gym", "Pool", "Security", "Parking", "Elevator", "Power Backup"].map(amenity => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox 
                      id={amenity} 
                      onCheckedChange={(checked) => {
                        const next = checked 
                          ? [...formData.amenities, amenity]
                          : formData.amenities.filter(a => a !== amenity);
                        setFormData({...formData, amenities: next});
                      }}
                    />
                    <label htmlFor={amenity} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Post Listing</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
