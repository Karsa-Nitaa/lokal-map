import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Locate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BrandWithDetails } from "@/lib/database.types";

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
  const w = selected ? 26 : 20;
  const h = selected ? 36 : 28;
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

interface ActivePopup {
  brandId: number;
  locId: number;
  lat: number;
  lng: number;
}

interface Props {
  brands: BrandWithDetails[];
}

const IndexMap = ({ brands }: Props) => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GMAP_KEY });

  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [locating, setLocating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const physicalBrands = brands.filter(
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
        allLocs.forEach((l) => bounds.extend({ lat: parseFloat(l.latitude!), lng: parseFloat(l.longitude!) }));
        map.fitBounds(bounds, 40);
      }
    },
    [physicalBrands]
  );

  useEffect(() => {
    if (!mapRef || !selectedId) return;
    const brand = physicalBrands.find((b) => b.brand_id === selectedId);
    if (!brand) return;
    const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);
    if (!locs.length) return;
    if (locs.length === 1) {
      mapRef.panTo({ lat: parseFloat(locs[0].latitude!), lng: parseFloat(locs[0].longitude!) });
      mapRef.setZoom(13);
    } else {
      const bounds = new google.maps.LatLngBounds();
      locs.forEach((l) => bounds.extend({ lat: parseFloat(l.latitude!), lng: parseFloat(l.longitude!) }));
      mapRef.fitBounds(bounds, 60);
    }
  }, [selectedId, mapRef, physicalBrands]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-bid="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const handleLocate = () => {
    if (!mapRef || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.panTo({ lat: coords.latitude, lng: coords.longitude });
        mapRef.setZoom(13);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const toggle = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setPopup(null);
  };

  if (loadError) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Peta Lokal Brand</p>
        <span className="text-xs text-muted-foreground">{physicalBrands.length} brand fizikal</span>
      </div>

      <div className="flex h-[520px] rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Left: scrollable brand list */}
        <div ref={listRef} className="w-1/2 overflow-y-auto bg-card border-r border-border flex flex-col">
          {physicalBrands.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground p-6 text-center">
              Tiada lokasi fizikal didaftarkan lagi
            </div>
          ) : (
            physicalBrands.map((brand) => {
              const color = colorMap.get(brand.brand_id)!;
              const isSelected = selectedId === brand.brand_id;
              const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);
              const states = [...new Set(locs.map((l) => l.state).filter(Boolean))];

              return (
                <button
                  key={brand.brand_id}
                  data-bid={brand.brand_id}
                  onClick={() => toggle(brand.brand_id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/40 flex items-center gap-3 ${isSelected ? "bg-muted/60" : ""}`}
                >
                  <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-tight">{brand.brand_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {locs.length} lokasi{states.length > 0 ? ` · ${states.slice(0, 2).join(", ")}` : ""}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Google Map */}
        <div className="w-1/2 relative">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">
              Memuatkan peta...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={{ lat: 3.9, lng: 108.0 }}
              zoom={5}
              onLoad={onLoad}
              options={{ zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
            >
              {physicalBrands.map((brand) => {
                const color = colorMap.get(brand.brand_id)!;
                const isSelected = selectedId === brand.brand_id;
                const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);

                return locs.map((loc) => (
                  <Marker
                    key={`${brand.brand_id}-${loc.location_id}`}
                    position={{ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) }}
                    icon={makePinMarker(color, isSelected)}
                    zIndex={isSelected ? 10 : 1}
                    onClick={() => {
                      toggle(brand.brand_id);
                      setPopup({ brandId: brand.brand_id, locId: loc.location_id, lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) });
                    }}
                  />
                ));
              })}

              {popup && (() => {
                const brand = physicalBrands.find((b) => b.brand_id === popup.brandId);
                const loc = brand?.Locations.find((l) => l.location_id === popup.locId);
                if (!brand || !loc) return null;
                return (
                  <InfoWindow
                    position={{ lat: popup.lat, lng: popup.lng }}
                    onCloseClick={() => setPopup(null)}
                    options={{ pixelOffset: new google.maps.Size(0, -30) }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: "150px" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: "13px", margin: "0 0 2px", color: "#111" }}>
                          {brand.brand_name}
                        </p>
                        {(loc.city || loc.state) && (
                          <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 6px" }}>
                            {[loc.city, loc.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <button
                          onClick={() => navigate(`/brand/${brand.brand_id}`)}
                          style={{ fontSize: "11px", color: "#2563eb", cursor: "pointer", background: "none", border: "none", padding: 0, fontWeight: 600 }}
                        >
                          Lihat profil →
                        </button>
                      </div>
                      <button onClick={() => setPopup(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, fontSize: "14px", lineHeight: 1, marginTop: "1px" }}>✕</button>
                    </div>
                  </InfoWindow>
                );
              })()}
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
      </div>
    </section>
  );
};

export default IndexMap;
