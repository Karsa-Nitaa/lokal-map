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

  const onLoad = useCallback((map: google.maps.Map) => setMapRef(map), []);

  // Fly to selected brand
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

  // Scroll list to selected brand
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Peta Lokal Brand
        </p>
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
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/40 flex items-center gap-3 ${
                    isSelected ? "bg-muted/60" : ""
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
                    style={{ background: color }}
                  />
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
              center={{ lat: 4.5, lng: 109.0 }}
              zoom={6}
              onLoad={onLoad}
              options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
            >
              {physicalBrands.map((brand) => {
                const color = colorMap.get(brand.brand_id)!;
                const isSelected = selectedId === brand.brand_id;
                const locs = (brand.Locations ?? []).filter((l) => l.latitude && l.longitude);

                return locs.map((loc) => (
                  <Marker
                    key={`${brand.brand_id}-${loc.location_id}`}
                    position={{ lat: parseFloat(loc.latitude!), lng: parseFloat(loc.longitude!) }}
                    icon={makeSvgMarker(color, isSelected ? 22 : 16)}
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
                  >
                    <div style={{ minWidth: "130px" }}>
                      <p style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{brand.brand_name}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>
                        {[loc.city, loc.state].filter(Boolean).join(", ")}
                      </p>
                      <button
                        onClick={() => navigate(`/brand/${brand.brand_id}`)}
                        style={{ marginTop: "6px", fontSize: "11px", color: "#2563eb", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                      >
                        Lihat profil →
                      </button>
                    </div>
                  </InfoWindow>
                );
              })()}
            </GoogleMap>
          )}

          {/* Locate me button */}
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
