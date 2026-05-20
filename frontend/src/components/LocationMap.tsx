import { useCallback, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Locate } from "lucide-react";
import type { BrandWithDetails, DBLocation } from "@/lib/database.types";

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

function makePin(color: string, label: string, selected = false) {
  const w = selected ? 30 : 24;
  const h = selected ? 42 : 34;
  const cx = w / 2;
  const r = cx;
  const fontSize = selected ? 11 : 9;
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx} 0 C${cx * 0.1} 0 0 ${r * 0.9} 0 ${r} C0 ${r * 1.75} ${cx} ${h} ${cx} ${h} C${cx} ${h} ${w} ${r * 1.75} ${w} ${r} C${w} ${r * 0.9} ${cx * 1.9} 0 ${cx} 0Z"
        fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="${cx}" y="${r + fontSize * 0.38}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="system-ui,sans-serif">${label}</text>
    </svg>`
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(cx, h),
  };
}

interface Props {
  brand: BrandWithDetails;
  color?: string;
  selectedLocId?: number | null;
  onLocSelect: (loc: DBLocation) => void;
}

const LocationMap = ({ brand, color = "#60a5fa", selectedLocId, onLocSelect }: Props) => {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GMAP_KEY });
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [locating, setLocating] = useState(false);

  const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);
  const multi = locs.length > 1;

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map);
      if (locs.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        locs.forEach((l) =>
          bounds.extend({ lat: parseFloat(l.latitude!), lng: parseFloat(l.longitude!) })
        );
        map.fitBounds(bounds, 60);
      } else if (locs.length === 1) {
        map.setCenter({ lat: parseFloat(locs[0].latitude!), lng: parseFloat(locs[0].longitude!) });
        map.setZoom(15);
      }
    },
    [locs]
  );

  useEffect(() => {
    if (!mapRef || !selectedLocId) return;
    const loc = locs.find((l) => l.location_id === selectedLocId);
    if (!loc?.latitude || !loc?.longitude) return;
    mapRef.panTo({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) });
    mapRef.setZoom(15);
  }, [selectedLocId, mapRef, locs]);

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

  if (locs.length === 0 || loadError) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!isLoaded ? (
        <div className="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">
          Memuatkan peta...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: parseFloat(locs[0].latitude!), lng: parseFloat(locs[0].longitude!) }}
          zoom={15}
          onLoad={onLoad}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
            clickableIcons: false,
          }}
        >
          {locs.map((loc, idx) => (
            <Marker
              key={loc.location_id}
              position={{ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) }}
              icon={makePin(
                color,
                multi ? String(idx + 1) : "●",
                selectedLocId === loc.location_id
              )}
              zIndex={selectedLocId === loc.location_id ? 10 : 1}
              onClick={() => onLocSelect(loc)}
            />
          ))}
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
