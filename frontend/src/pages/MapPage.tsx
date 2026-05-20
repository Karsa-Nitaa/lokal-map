import { useCallback, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { ArrowLeft, Locate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BrandWithDetails } from "@/lib/database.types";
import { DAYS_OF_WEEK } from "@/lib/database.types";

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

const PALETTE = [
  "#FF9AA2", "#FFDAC1", "#B5EAD7", "#C7CEEA", "#F8B4D9",
  "#A8DADC", "#FFD166", "#BDE0FE", "#CFBAF0", "#90DBF4",
  "#FFB347", "#B4F8C8", "#FFC8A2", "#D4F0F0", "#CCE2CB",
];

function buildColorMap(brands: BrandWithDetails[]): Map<number, string> {
  const map = new Map<number, string>();
  brands.forEach((b, i) => map.set(b.brand_id, PALETTE[i % PALETTE.length]));
  return map;
}

function makePinMarker(color: string, selected = false) {
  const w = selected ? 30 : 24;
  const h = selected ? 42 : 34;
  const cx = w / 2;
  const r = cx;
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${cx} 0 C${cx * 0.1} 0 0 ${r * 0.9} 0 ${r} C0 ${r * 1.75} ${cx} ${h} ${cx} ${h} C${cx} ${h} ${w} ${r * 1.75} ${w} ${r} C${w} ${r * 0.9} ${cx * 1.9} 0 ${cx} 0Z"
        fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="${cx}" cy="${r}" r="${r * 0.38}" fill="white" fill-opacity="0.9"/>
    </svg>`
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(cx, h),
  };
}

interface ActivePopup {
  brandId: number;
  locId: number;
  lat: number;
  lng: number;
}

async function fetchAllBrands(): Promise<BrandWithDetails[]> {
  const { data, error } = await supabase
    .from("Brand")
    .select("*, Locations(*), Products(*), Online(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandWithDetails[];
}

const CATEGORY_LABEL: Record<string, string> = {
  clothing: "Fashion",
  "local-service": "Local Service",
  "home-bakery": "Home Bakery",
  cafe: "Cafe",
  photography: "Photography",
  others: "Others",
};

export default function MapPage() {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GMAP_KEY });
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: allBrands = [] } = useQuery({
    queryKey: ["public-brands"],
    queryFn: fetchAllBrands,
  });

  const physicalBrands = allBrands.filter(
    (b) => (b.Locations ?? []).some((l) => l.latitude && l.longitude)
  );
  const colorMap = buildColorMap(physicalBrands);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map);
      const allLocs = physicalBrands.flatMap((b) =>
        (b.Locations ?? []).filter((l) => l.latitude && l.longitude)
      );
      if (allLocs.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        allLocs.forEach((l) =>
          bounds.extend({ lat: parseFloat(l.latitude!), lng: parseFloat(l.longitude!) })
        );
        map.fitBounds(bounds, 80);
      } else if (allLocs.length === 1) {
        map.setCenter({ lat: parseFloat(allLocs[0].latitude!), lng: parseFloat(allLocs[0].longitude!) });
        map.setZoom(14);
      } else {
        map.setCenter({ lat: 3.9, lng: 108.0 });
        map.setZoom(6);
      }
    },
    [physicalBrands]
  );

  const handleLocate = () => {
    if (!mapRef || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.panTo({ lat: coords.latitude, lng: coords.longitude });
        mapRef.setZoom(15);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Gagal memuatkan peta.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card z-20 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <p className="font-display font-semibold text-sm">Peta Lokal Brand</p>
          <span className="text-xs text-muted-foreground ml-auto">
            {physicalBrands.length} lokasi
          </span>
        </div>
      </header>

      {/* Map fills remaining height */}
      <div className="flex-1 relative min-h-0">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">
            Memuatkan peta...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={{ lat: 3.9, lng: 108.0 }}
            zoom={6}
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
            {physicalBrands.map((brand) => {
              const color = colorMap.get(brand.brand_id)!;
              const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);

              return locs.map((loc) => (
                <Marker
                  key={`${brand.brand_id}-${loc.location_id}`}
                  position={{ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) }}
                  icon={makePinMarker(
                    color,
                    selectedId === brand.brand_id && popup?.locId === loc.location_id
                  )}
                  zIndex={selectedId === brand.brand_id ? 10 : 1}
                  onClick={() => {
                    setSelectedId(brand.brand_id);
                    setPopup({
                      brandId: brand.brand_id,
                      locId: loc.location_id,
                      lat: parseFloat(loc.latitude!),
                      lng: parseFloat(loc.longitude!),
                    });
                  }}
                />
              ));
            })}

            {popup &&
              (() => {
                const brand = physicalBrands.find((b) => b.brand_id === popup.brandId);
                const loc = brand?.Locations.find((l) => l.location_id === popup.locId);
                if (!brand || !loc) return null;

                const addressParts = [
                  loc.lot_number,
                  loc.street_address,
                  loc.city,
                  loc.state,
                ].filter(Boolean);

                const googleMapsUrl =
                  loc.googlemap_link ||
                  `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;

                const today = new Date()
                  .toLocaleDateString("en-US", { weekday: "long" })
                  .toLowerCase() as (typeof DAYS_OF_WEEK)[number];
                const todayHours = loc.operation_hours?.[today];

                return (
                  <InfoWindow
                    position={{ lat: popup.lat, lng: popup.lng }}
                    onCloseClick={() => {
                      setPopup(null);
                      setSelectedId(null);
                    }}
                    options={{ pixelOffset: new google.maps.Size(0, -38) }}
                  >
                    <div
                      style={{
                        maxWidth: "230px",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        padding: "2px 0",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          margin: "0 0 2px",
                          color: "#111827",
                          lineHeight: 1.3,
                        }}
                      >
                        {brand.brand_name}
                      </p>

                      {brand.brand_category && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            margin: "0 0 8px",
                            textTransform: "capitalize",
                          }}
                        >
                          {CATEGORY_LABEL[brand.brand_category] ?? brand.brand_category}
                        </p>
                      )}

                      {addressParts.length > 0 && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#374151",
                            margin: "0 0 5px",
                            lineHeight: 1.5,
                          }}
                        >
                          📍 {addressParts.join(", ")}
                        </p>
                      )}

                      {loc.phone_number && (
                        <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 5px" }}>
                          📞 {loc.phone_number}
                        </p>
                      )}

                      {todayHours && (
                        <p style={{ fontSize: "11px", color: "#059669", margin: "0 0 5px" }}>
                          🕐 Hari ini: {todayHours}
                        </p>
                      )}

                      {loc.payment_methods && (
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 5px" }}>
                          💳 {loc.payment_methods}
                        </p>
                      )}

                      {loc.is_muslim_friendly && (
                        <p style={{ fontSize: "11px", color: "#7c3aed", margin: "0 0 8px" }}>
                          ✓ Muslim-Friendly
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "11px",
                            color: "white",
                            background: "#4285f4",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Google Maps ↗
                        </a>
                        <button
                          onClick={() => navigate(`/brand/${brand.brand_id}`)}
                          style={{
                            fontSize: "11px",
                            color: "#111827",
                            background: "#f3f4f6",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Lihat profil →
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()}
          </GoogleMap>
        )}

        {/* Locate me */}
        <button
          onClick={handleLocate}
          disabled={locating}
          title="Lokasi saya"
          className="absolute bottom-6 right-4 z-10 w-11 h-11 rounded-xl bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Locate
            className={`w-5 h-5 ${locating ? "animate-pulse text-gray-400" : "text-gray-600"}`}
          />
        </button>
      </div>
    </div>
  );
}
