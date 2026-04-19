import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, Phone, Car, CreditCard,
  Navigation, ShieldCheck, Calendar, ArrowLeft, Store,
  MessageSquarePlus, Lock, Package, Globe, Link as LinkIcon,
  Compass, Instagram, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import type { BrandWithDetails, DBLocation } from "@/lib/database.types";
import { DAYS_OF_WEEK } from "@/lib/database.types";
import LocationMap from "@/components/LocationMap";

// ── Haversine distance (km) ───────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── helpers ──────────────────────────────────────────────────────────────────

const InfoRow = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-3">
    <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

// ── Smart Operation Hours ─────────────────────────────────────────────────────

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function groupHours(hours: Record<string, string>): { label: string; value: string }[] {
  const days = DAYS_OF_WEEK.filter((d) => hours[d]);
  if (days.length === 0) return [];

  const groups: { label: string; value: string }[] = [];
  let groupStart = days[0];
  let groupEnd = days[0];
  let groupValue = hours[days[0]];

  for (let i = 1; i < days.length; i++) {
    const day = days[i];
    const prevDay = days[i - 1];
    const prevIdx = DAYS_OF_WEEK.indexOf(prevDay);
    const curIdx = DAYS_OF_WEEK.indexOf(day);
    if (curIdx === prevIdx + 1 && hours[day] === groupValue) {
      groupEnd = day;
    } else {
      const label =
        groupStart === groupEnd
          ? DAY_SHORT[groupStart]
          : `${DAY_SHORT[groupStart]} – ${DAY_SHORT[groupEnd]}`;
      groups.push({ label, value: groupValue });
      groupStart = day;
      groupEnd = day;
      groupValue = hours[day];
    }
  }
  const label =
    groupStart === groupEnd
      ? DAY_SHORT[groupStart]
      : `${DAY_SHORT[groupStart]} – ${DAY_SHORT[groupEnd]}`;
  groups.push({ label, value: groupValue });

  return groups;
}

function OperationHours({ hours }: { hours: Record<string, string> | null }) {
  if (!hours) return <p className="text-xs text-muted-foreground">—</p>;

  const allDays = DAYS_OF_WEEK.map((d) => ({ day: d, value: hours[d] || null }));
  const hasAny = allDays.some((d) => d.value);
  if (!hasAny) return <p className="text-xs text-muted-foreground">—</p>;

  const openHours: Record<string, string> = {};
  allDays.forEach(({ day, value }) => { if (value) openHours[day] = value; });
  const openGroups = groupHours(openHours);
  const closedDays = allDays.filter((d) => !d.value).map((d) => DAY_SHORT[d.day]);

  return (
    <div className="space-y-1">
      {openGroups.map((g) => (
        <div key={g.label} className="flex gap-2 text-xs">
          <span className="w-20 shrink-0 text-muted-foreground">{g.label}</span>
          <span className="font-medium">{g.value}</span>
        </div>
      ))}
      {closedDays.length > 0 && (
        <div className="flex gap-2 text-xs">
          <span className="w-20 shrink-0 text-muted-foreground">{closedDays.join(", ")}</span>
          <span className="text-muted-foreground/70">Tutup</span>
        </div>
      )}
    </div>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────

const LocationCard = ({ loc, index, total }: { loc: DBLocation; index: number; total: number }) => {
  // Primary: city + state — short, scannable
  const shortAddress = [loc.city, loc.state].filter(Boolean).join(", ");
  // Secondary: street details — shown small below
  const streetDetail = [loc.lot_number, loc.street_address, loc.postal_code]
    .filter(Boolean)
    .join(", ");
  const paymentList = loc.payment_methods
    ? loc.payment_methods.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Always label: "Lokasi" when only 1 store, "Lokasi 1 / 2 / …" when multiple
  const locLabel = total === 1 ? "Lokasi" : `Lokasi ${index + 1}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 h-full">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {locLabel}
      </div>

      <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Alamat">
        <p className="text-sm font-medium leading-snug">{shortAddress || "—"}</p>
        {streetDetail && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{streetDetail}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {loc.googlemap_link && (
            <a
              href={loc.googlemap_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Navigation className="w-3 h-3" /> Google Maps
            </a>
          )}
          {loc.waze_link && (
            <a
              href={loc.waze_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Navigation className="w-3 h-3" /> Waze
            </a>
          )}
        </div>
      </InfoRow>

      {loc.operation_hours && Object.keys(loc.operation_hours).length > 0 && (
        <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Waktu Operasi">
          <OperationHours hours={loc.operation_hours} />
        </InfoRow>
      )}

      {loc.phone_number && (
        <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Hubungi">
          <a
            href={`https://wa.me/${loc.phone_number.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Phone className="w-3 h-3" /> WhatsApp
          </a>
        </InfoRow>
      )}

      {loc.parking_remarks && (
        <InfoRow icon={<Car className="w-3.5 h-3.5" />} label="Parking">
          <p className="text-sm">{loc.parking_remarks}</p>
        </InfoRow>
      )}

      {paymentList.length > 0 && (
        <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Bayaran">
          <div className="flex flex-wrap gap-1 mt-0.5">
            {paymentList.map((m) => (
              <span key={m} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                {m}
              </span>
            ))}
          </div>
        </InfoRow>
      )}

      {loc.is_muslim_friendly && (
        <InfoRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Muslim-Friendly">
          <p className="text-sm font-medium text-primary">Muslim-Friendly</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pakaian menutup aurat, fitting room berasingan, atau ciri bersesuaian Muslim.
          </p>
        </InfoRow>
      )}
    </div>
  );
};

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchBrand(id: number): Promise<BrandWithDetails | null> {
  const { data, error } = await supabase
    .from("Brand")
    .select("*, Locations(*), Products(*), Online(*)")
    .eq("brand_id", id)
    .single();
  if (error) return null;
  return data as BrandWithDetails;
}

async function fetchAllBrandsForNearby(): Promise<BrandWithDetails[]> {
  const { data } = await supabase
    .from("Brand")
    .select("*, Locations(*), Products(*), Online(*)");
  return (data ?? []) as BrandWithDetails[];
}

// ── Social link row ───────────────────────────────────────────────────────────

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/40 transition-colors group"
    >
      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className="text-xs text-primary truncate">{href}</p>
      </div>
    </a>
  );
}

// ── Gender config ─────────────────────────────────────────────────────────────

const GENDER_GROUPS = ["lelaki", "perempuan", "unisex", "umum"] as const;
const GENDER_LABEL: Record<string, string> = {
  lelaki: "Lelaki",
  perempuan: "Perempuan",
  unisex: "Unisex",
  umum: "Umum",
};
const GENDER_BADGE: Record<string, string> = {
  lelaki: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  perempuan: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  unisex: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  umum: "bg-muted text-muted-foreground",
};

// ── Main page ─────────────────────────────────────────────────────────────────

const LOCS_PER_PAGE = 9;

const BrandDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [locPage, setLocPage] = useState(0);
  const [focusedLoc, setFocusedLoc] = useState<DBLocation | null>(null);

  useEffect(() => {
    if (!id || window.location.hostname === "localhost") return;
    supabase.from("BrandView").insert({ brand_id: Number(id) }).then(() => {});
  }, [id]);

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", id],
    queryFn: () => fetchBrand(Number(id)),
    enabled: !!id,
  });

  const { data: allBrands = [] } = useQuery({
    queryKey: ["all-brands-nearby"],
    queryFn: fetchAllBrandsForNearby,
    enabled: !!brand,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="font-semibold text-muted-foreground">Brand tidak dijumpai</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" /> Balik ke Home
        </button>
      </div>
    );
  }

  const isMuslimFriendly = brand.Locations.some((l) => l.is_muslim_friendly);
  const onlineData = brand.Online?.[0] ?? null;
  const hasOnline = !!(
    onlineData?.website_link ||
    onlineData?.instagram_link ||
    onlineData?.tiktok_link ||
    onlineData?.facebook_link ||
    onlineData?.additional_link
  );

  const lastUpdated = brand.Locations.reduce<string | null>((acc, l) => {
    if (!l.updated_at) return acc;
    if (!acc || l.updated_at > acc) return l.updated_at;
    return acc;
  }, null);

  // ── Locations: pagination + responsive grid ───────────────────────────────
  const totalLocs = brand.Locations.length;
  const totalLocPages = Math.ceil(totalLocs / LOCS_PER_PAGE);
  const paginatedLocs = brand.Locations.slice(
    locPage * LOCS_PER_PAGE,
    (locPage + 1) * LOCS_PER_PAGE
  );
  const locGridClass =
    totalLocs === 1
      ? "grid-cols-1"
      : totalLocs === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  // ── Products: group by gender ─────────────────────────────────────────────
  const knownGenders = new Set(["lelaki", "perempuan", "unisex"]);
  const productsByGender: Record<string, typeof brand.Products> = {
    lelaki: brand.Products.filter((p) => p.product_gender === "lelaki"),
    perempuan: brand.Products.filter((p) => p.product_gender === "perempuan"),
    unisex: brand.Products.filter((p) => p.product_gender === "unisex"),
    umum: brand.Products.filter(
      (p) => !p.product_gender || !knownGenders.has(p.product_gender)
    ),
  };

  // ── Visit Nearby: haversine ───────────────────────────────────────────────
  const NEARBY_RADIUS_KM = 5;
  const currentCoords = brand.Locations.map((l) => ({
    lat: parseFloat(l.latitude ?? ""),
    lon: parseFloat(l.longitude ?? ""),
  })).filter((c) => !isNaN(c.lat) && !isNaN(c.lon));

  type NearbyBrand = {
    brand: BrandWithDetails;
    distanceKm: number;
    nearLat: number;
    nearLon: number;
    nearCity: string | null;
    nearState: string | null;
  };
  const nearbyBrands: NearbyBrand[] = [];
  if (currentCoords.length > 0) {
    for (const other of allBrands) {
      if (other.brand_id === brand.brand_id) continue;
      let minDist = Infinity;
      let nearLat = 0, nearLon = 0;
      let nearCity: string | null = null, nearState: string | null = null;
      for (const ol of other.Locations) {
        const olat = parseFloat(ol.latitude ?? "");
        const olon = parseFloat(ol.longitude ?? "");
        if (isNaN(olat) || isNaN(olon)) continue;
        for (const cc of currentCoords) {
          const d = haversineKm(cc.lat, cc.lon, olat, olon);
          if (d < minDist) {
            minDist = d;
            nearLat = olat;
            nearLon = olon;
            nearCity = ol.city ?? null;
            nearState = ol.state ?? null;
          }
        }
      }
      if (minDist <= NEARBY_RADIUS_KM) {
        nearbyBrands.push({ brand: other, distanceKm: minDist, nearLat, nearLon, nearCity, nearState });
      }
    }
    nearbyBrands.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const brandUrl = `https://lokal-map.vercel.app/brand/${brand.brand_id}`;
  const pageTitle = `${brand.brand_name} | Lokal-Map`;
  const pageDesc = brand.brand_description
    ? `${brand.brand_description.slice(0, 140)} — Temui ${brand.brand_name} di Lokal-Map.`
    : `Terokai ${brand.brand_name} — brand lokal Malaysia di Lokal-Map.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": brand.Locations.length > 0 ? "LocalBusiness" : "Organization",
    "name": brand.brand_name,
    "description": brand.brand_description ?? undefined,
    "url": brandUrl,
    ...(brand.Locations[0] && {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": brand.Locations[0].city ?? undefined,
        "addressRegion": brand.Locations[0].state ?? undefined,
        "addressCountry": "MY",
      },
    }),
    ...(brand.Online?.[0]?.instagram_link && { "sameAs": [brand.Online[0].instagram_link] }),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content={`${brand.brand_name}, brand lokal malaysia, lokal map, ${brand.brand_category ?? ""}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={brandUrl} />
        <link rel="canonical" href={brandUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="font-semibold text-sm truncate flex-1">{brand.brand_name}</p>
          {brand.brand_category && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
              {brand.brand_category}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Brand header ─────────────────────────────── */}
        <section>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">{brand.brand_name}</h1>

          {brand.brand_description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{brand.brand_description}</p>
          )}

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5">
            {brand.price_range && (
              <span
                title={
                  brand.price_range === "$"
                    ? "RM0 – 99.99"
                    : brand.price_range === "$$"
                    ? "RM100 – 199.99"
                    : "RM200+"
                }
                className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold cursor-help"
              >
                {brand.price_range}
              </span>
            )}
            {brand.Products.map((p) => p.product_type)
              .filter(Boolean)
              .map((type) => (
                <span
                  key={type}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-tag text-tag-foreground font-medium"
                >
                  {type}
                </span>
              ))}
            {hasOnline && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground font-medium">
                Online
              </span>
            )}
            {brand.Locations.length > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground font-medium">
                Physical
              </span>
            )}
            {isMuslimFriendly && (
              <span
                title="Pakaian menutup aurat, fitting room berasingan, atau ciri-ciri bersesuaian Muslim."
                className="text-[11px] px-2.5 py-1 rounded-full border border-primary/40 text-primary font-medium cursor-help"
              >
                Muslim-Friendly
              </span>
            )}
          </div>
        </section>

        {/* ── Online Platforms ──────────────────────────── */}
        {hasOnline && onlineData && (
          <section>
            <SectionTitle icon={<Globe className="w-4 h-4" />} title="Online" />
            <div className="grid sm:grid-cols-2 gap-2">
              {onlineData.website_link && (
                <SocialLink href={onlineData.website_link} label="Website" />
              )}
              {onlineData.instagram_link && (
                <SocialLink href={onlineData.instagram_link} label="Instagram" />
              )}
              {onlineData.tiktok_link && (
                <SocialLink href={onlineData.tiktok_link} label="TikTok" />
              )}
              {onlineData.facebook_link && (
                <SocialLink href={onlineData.facebook_link} label="Facebook" />
              )}
              {onlineData.additional_link && (
                <SocialLink href={onlineData.additional_link} label="Shopee / Lain-lain" />
              )}
            </div>
          </section>
        )}

        {/* ── Instagram Feed Preview ───────────────────── */}
        {onlineData?.instagram_link && (
          <section>
            <SectionTitle icon={<Instagram className="w-4 h-4" />} title="Instagram Preview" />
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 flex flex-col items-center gap-3 text-center">
              <Instagram className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Coming Soon</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Preview feed Instagram akan diaktifkan tidak lama lagi.
                </p>
              </div>
              <a
                href={onlineData.instagram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-3.5 h-3.5" /> Lihat di Instagram
              </a>
            </div>
          </section>
        )}

        {/* ── Physical Locations ───────────────────────── */}
        {totalLocs > 0 && (
          <section>
            <SectionTitle
              icon={<Store className="w-4 h-4" />}
              title={`Lokasi Fizikal${totalLocs > 1 ? ` (${totalLocs})` : ""}`}
            />

            <div className="flex gap-0 rounded-2xl overflow-hidden border border-border h-[460px]">
              {/* Left: scrollable location list */}
              <div className="w-[45%] overflow-y-auto bg-card border-r border-border flex flex-col gap-2 p-3">
                {brand.Locations.map((loc, i) => (
                  <button
                    key={loc.location_id}
                    onClick={() => setFocusedLoc(loc)}
                    className={`w-full text-left rounded-xl ring-2 transition-all duration-200 ${
                      focusedLoc?.location_id === loc.location_id
                        ? "ring-primary"
                        : "ring-transparent hover:ring-border"
                    }`}
                  >
                    <LocationCard loc={loc} index={i} total={totalLocs} />
                  </button>
                ))}
              </div>

              {/* Right: map */}
              <div className="flex-1 h-full">
                <LocationMap brand={brand} color="#60a5fa" focusedLoc={focusedLoc} />
              </div>
            </div>
          </section>
        )}

        {/* ── Products ─────────────────────────────────── */}
        {brand.Products.length > 0 && (
          <section>
            <SectionTitle icon={<Package className="w-4 h-4" />} title="Produk" />
            <div className="space-y-5">
              {GENDER_GROUPS.map((gender) => {
                const prods = productsByGender[gender];
                if (!prods || prods.length === 0) return null;
                return (
                  <div key={gender}>
                    {/* Gender section header */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${GENDER_BADGE[gender]}`}
                      >
                        {GENDER_LABEL[gender]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {prods.length} produk
                      </span>
                    </div>

                    {/* Product cards grid */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {prods.map((p) => (
                        <div
                          key={p.product_id}
                          className="rounded-lg border border-border bg-card px-3 py-2.5"
                        >
                          <p className="text-sm font-medium leading-tight">{p.product_type}</p>
                          {p.product_description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {p.product_description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
            <Calendar className="w-3.5 h-3.5" />
            Dikemaskini: {new Date(lastUpdated).toLocaleDateString("ms-MY")}
          </div>
        )}

        {/* ── Visit Nearby ─────────────────────────────── */}
        <section>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground"><Compass className="w-4 h-4" /></div>
              <h2 className="font-display font-semibold text-base">Kedai Berdekatan</h2>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Brand lokal lain dalam radius 5 km dari lokasi <span className="font-medium text-foreground">{brand.brand_name}</span>.
          </p>

          {currentCoords.length === 0 ? (
            /* Brand has no coordinates — prompt admin to fill them in */
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center">
              <Compass className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Koordinat belum dikemaskini</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Admin perlu isi latitude &amp; longitude pada lokasi untuk aktifkan ciri ini.
              </p>
            </div>
          ) : nearbyBrands.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">Tiada brand lain dalam radius 5 km.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nearbyBrands.map(({ brand: nb, distanceKm, nearLat, nearLon, nearCity, nearState }) => {
                const locLabel = [nearCity, nearState].filter(Boolean).join(", ");
                return (
                <button
                  key={nb.brand_id}
                  onClick={() => navigate(`/brand/${nb.brand_id}`)}
                  className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{nb.brand_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {locLabel ? `${locLabel} · ` : ""}
                      {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)} m`
                        : `${distanceKm.toFixed(1)} km`}
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${nearLat},${nearLon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <Navigation className="w-3 h-3" /> Maps
                  </a>
                </button>
              );
              })}
            </div>
          )}
        </section>

        {/* ── Reviews placeholder ───────────────────────── */}
        <section>
          <SectionTitle icon={<MessageSquarePlus className="w-4 h-4" />} title="Reviews" />
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center">
            <Lock className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Reviews akan diverifikasi sebelum dipublish bagi elak spam.
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t border-border py-5 mt-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© 2026 Lokal-Map</p>
        </div>
      </footer>
    </div>
  );
};

// ── Section title helper ──────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="font-display font-semibold text-base">{title}</h2>
    </div>
  );
}

export default BrandDetailPage;
