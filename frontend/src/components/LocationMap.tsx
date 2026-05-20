import { useCallback, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Locate } from "lucide-react";
import type { BrandWithDetails, DBLocation } from "@/lib/database.types";

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

function makePinMarker(color: string) {
  const w = 22;
  const h = 30;
  const cx = w / 2;
  const r = cx;
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx} 0 C${cx * 0.1} 0 0 ${r * 0.9} 0 ${r} C0 ${r * 1.75} ${cx} ${h} ${cx} ${h} C${cx} ${h} ${w} ${r * 1.75} ${w} ${r} C${w} ${r * 0.9} ${cx * 1.9} 0 ${cx} 0Z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="${cx}" cy="${r}" r="${r * 0.38}" fill="white" fill-opacity="0.75"/>
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
  focusedLoc?: DBLocation | null;
  onLocSelect?: (loc: DBLocation) => void;
}

const LocationMap = ({ brand, color = "#60a5fa", focusedLoc, onLocSelect }: Props) => {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GMAP_KEY });

  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [popup, setPopup] = useState<DBLocation | null>(null);
  const [locating, setLocating] = useState(false);

  const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);

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

  useEffect(() => {
    if (!mapRef || !focusedLoc?.latitude || !focusedLoc?.longitude) return;
    mapRef.panTo({ lat: parseFloat(focusedLoc.latitude), lng: parseFloat(focusedLoc.longitude) });
    mapRef.setZoom(15);
    setPopup(focusedLoc);
  }, [focusedLoc, mapRef]);

  if (locs.length === 0 || loadError) return null;

  const avgLat = locs.reduce((s, l) => s + parseFloat(l.latitude!), 0) / locs.length;
  const avgLng = locs.reduce((s, l) => s + parseFloat(l.longitude!), 0) / locs.length;

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
    <div className="relative w-full h-full overflow-hidden">
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
              icon={makePinMarker(color)}
              onClick={() => handleMarkerClick(loc)}
            />
          ))}

          {popup?.latitude && popup?.longitude && (
            <InfoWindow
              position={{ lat: parseFloat(popup.latitude), lng: parseFloat(popup.longitude) }}
              onCloseClick={() => setPopup(null)}
              options={{ pixelOffset: new google.maps.Size(0, -30) }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: "130px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "13px", margin: "0 0 2px", color: "#111" }}>
                    {brand.brand_name}
                  </p>
                  {(popup.city || popup.state) && (
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                      {[popup.city, popup.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <button onClick={() => setPopup(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, fontSize: "14px", lineHeight: 1, marginTop: "1px" }}>✕</button>
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
