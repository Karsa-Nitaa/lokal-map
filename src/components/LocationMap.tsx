import { useCallback, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Locate } from "lucide-react";
import type { BrandWithDetails, DBLocation } from "@/lib/database.types";

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

function makeSvgMarker(color: string, size = 18) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2.5"/></svg>`
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

interface Props {
  brand: BrandWithDetails;
  color?: string;
  onLocSelect?: (loc: DBLocation) => void;
}

const LocationMap = ({ brand, color = "#60a5fa", onLocSelect }: Props) => {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GMAP_KEY });

  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [popup, setPopup] = useState<DBLocation | null>(null);
  const [locating, setLocating] = useState(false);

  const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);
  if (locs.length === 0 || loadError) return null;

  const avgLat = locs.reduce((s, l) => s + parseFloat(l.latitude!), 0) / locs.length;
  const avgLng = locs.reduce((s, l) => s + parseFloat(l.longitude!), 0) / locs.length;

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map);
      if (locs.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        locs.forEach((l) => bounds.extend({ lat: parseFloat(l.latitude!), lng: parseFloat(l.longitude!) }));
        map.fitBounds(bounds, 40);
      }
    },
    [locs]
  );

  const handleLocate = () => {
    if (!mapRef || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.panTo({ lat: coords.latitude, lng: coords.longitude });
        mapRef.setZoom(14);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleMarkerClick = (loc: DBLocation) => {
    setPopup(loc);
    if (mapRef) {
      mapRef.panTo({ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) });
      mapRef.setZoom(14);
    }
    onLocSelect?.(loc);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: "288px" }}>
      {!isLoaded ? (
        <div className="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">
          Memuatkan peta...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: avgLat, lng: avgLng }}
          zoom={locs.length === 1 ? 14 : 11}
          onLoad={onLoad}
          options={{ zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
        >
          {locs.map((loc) => (
            <Marker
              key={loc.location_id}
              position={{ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) }}
              icon={makeSvgMarker(color, 20)}
              onClick={() => handleMarkerClick(loc)}
            />
          ))}

          {popup && (
            <InfoWindow
              position={{ lat: parseFloat(popup.latitude!), lng: parseFloat(popup.longitude!) }}
              onCloseClick={() => setPopup(null)}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{brand.brand_name}</p>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>
                  {[popup.city, popup.state].filter(Boolean).join(", ")}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      <button
        onClick={handleLocate}
        disabled={locating}
        title="Lokasi saya"
        className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <Locate className={`w-4 h-4 ${locating ? "animate-pulse text-gray-400" : "text-gray-600"}`} />
      </button>
    </div>
  );
};

export default LocationMap;
