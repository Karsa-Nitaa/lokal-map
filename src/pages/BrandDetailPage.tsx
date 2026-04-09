import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Clock, Phone, Car, CreditCard,
  Navigation, ShieldCheck, Calendar, ArrowLeft, Store,
  MessageSquarePlus, Lock, Package, Globe, Link as LinkIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BrandWithDetails, DBLocation } from "@/lib/database.types";
import { DAYS_OF_WEEK } from "@/lib/database.types";

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
    <div className="w-8 h-8 rounded-lg bg-tag flex items-center justify-center text-tag-foreground shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

function OperationHours({ hours }: { hours: Record<string, string> | null }) {
  if (!hours || Object.keys(hours).length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
      {DAYS_OF_WEEK.map((day) =>
        hours[day] ? (
          <div key={day} className="flex justify-between gap-2">
            <span className="capitalize text-muted-foreground">{day.slice(0, 3)}</span>
            <span>{hours[day]}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────

const LocationCard = ({ loc }: { loc: DBLocation }) => {
  const address = [loc.lot_number, loc.street_address, loc.city, loc.postal_code, loc.state]
    .filter(Boolean)
    .join(", ");
  const paymentList = loc.payment_methods
    ? loc.payment_methods.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <InfoRow icon={<MapPin className="w-4 h-4" />} label="Alamat">
        <p className="text-sm">{address || "—"}</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {loc.googlemap_link && (
            <a
              href={loc.googlemap_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Navigation className="w-3 h-3" /> Google Maps
            </a>
          )}
          {loc.waze_link && (
            <a
              href={loc.waze_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Navigation className="w-3 h-3" /> Waze
            </a>
          )}
        </div>
      </InfoRow>

      {loc.operation_hours && Object.keys(loc.operation_hours).length > 0 && (
        <InfoRow icon={<Clock className="w-4 h-4" />} label="Waktu Operasi">
          <OperationHours hours={loc.operation_hours} />
        </InfoRow>
      )}

      {loc.phone_number && (
        <InfoRow icon={<Phone className="w-4 h-4" />} label="Hubungi">
          <a
            href={`https://wa.me/${loc.phone_number.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Phone className="w-3 h-3" /> WhatsApp
          </a>
        </InfoRow>
      )}

      {loc.parking_remarks && (
        <InfoRow icon={<Car className="w-4 h-4" />} label="Parking">
          <p className="text-sm">{loc.parking_remarks}</p>
        </InfoRow>
      )}

      {paymentList.length > 0 && (
        <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Payment">
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {paymentList.map((m) => (
              <span key={m} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                {m}
              </span>
            ))}
          </div>
        </InfoRow>
      )}

      {loc.is_muslim_friendly && (
        <InfoRow icon={<ShieldCheck className="w-4 h-4" />} label="Muslim-Friendly">
          <p className="text-sm text-primary font-medium">☪ Muslim-Friendly</p>
          <p className="text-xs text-muted-foreground">Pakaian menutup aurat / fitting room dsb.</p>
        </InfoRow>
      )}
    </div>
  );
};

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchBrand(id: number): Promise<BrandWithDetails | null> {
  const { data, error } = await supabase
    .from("Brand")
    .select("*, Locations(*), Products(*), Online(*)")
    .eq("brand_id", id)
    .single();
  if (error) return null;
  return data as BrandWithDetails;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BrandDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", id],
    queryFn: () => fetchBrand(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-display text-muted-foreground">Brand tidak dijumpai 😢</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" /> Balik ke Home
        </button>
      </div>
    );
  }

  const isMuslimFriendly = brand.Locations.some((l) => l.is_muslim_friendly);
  const lastUpdated = brand.Locations.reduce<string | null>((acc, l) => {
    if (!l.updated_at) return acc;
    if (!acc || l.updated_at > acc) return l.updated_at;
    return acc;
  }, null);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate">{brand.brand_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Brand header ──────────────────────────────── */}
        <section>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{brand.brand_name}</h1>

          {brand.brand_description && (
            <p className="text-muted-foreground leading-relaxed mb-4">{brand.brand_description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {brand.Products.map((p) => p.product_type).filter(Boolean).map((type) => (
              <span key={type} className="text-xs px-2.5 py-1 rounded-full bg-tag text-tag-foreground font-medium">
                {type}
              </span>
            ))}
            {isMuslimFriendly && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                ☪ Muslim-Friendly
              </span>
            )}
          </div>
        </section>

        
        {/* ── Online Platforms ─────────────────────────────── */}
        {brand.Online && brand.Online.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" /> Online (Website / Social Media)
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              {brand.Online[0]?.website_link && (
                <InfoRow icon={<Globe className="w-4 h-4" />} label="Website">
                  <a href={brand.Online[0].website_link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    {brand.Online[0].website_link}
                  </a>
                </InfoRow>
              )}
              {brand.Online[0]?.instagram_link && (
                <InfoRow icon={<LinkIcon className="w-4 h-4" />} label="Instagram">
                  <a href={brand.Online[0].instagram_link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    {brand.Online[0].instagram_link}
                  </a>
                </InfoRow>
              )}
              {brand.Online[0]?.tiktok_link && (
                <InfoRow icon={<LinkIcon className="w-4 h-4" />} label="TikTok">
                  <a href={brand.Online[0].tiktok_link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    {brand.Online[0].tiktok_link}
                  </a>
                </InfoRow>
              )}
              {brand.Online[0]?.facebook_link && (
                <InfoRow icon={<LinkIcon className="w-4 h-4" />} label="Facebook">
                  <a href={brand.Online[0].facebook_link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    {brand.Online[0].facebook_link}
                  </a>
                </InfoRow>
              )}
              {brand.Online[0]?.additional_link && (
                <InfoRow icon={<LinkIcon className="w-4 h-4" />} label="Lain-lain / Shopee">
                  <a href={brand.Online[0].additional_link} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">
                    {brand.Online[0].additional_link}
                  </a>
                </InfoRow>
              )}
              {!brand.Online[0]?.website_link && !brand.Online[0]?.instagram_link && !brand.Online[0]?.tiktok_link && !brand.Online[0]?.facebook_link && !brand.Online[0]?.additional_link && (
                <p className="text-sm text-muted-foreground">Tiada pautan disediakan.</p>
              )}
            </div>
          </section>
        )}

        {/* ── Locations ─────────────────────────────────── */}

        {brand.Locations.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" /> Lokasi Fizikal ({brand.Locations.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {brand.Locations.map((loc) => (
                <LocationCard key={loc.location_id} loc={loc} />
              ))}
            </div>
          </section>
        )}

        {/* ── Products ──────────────────────────────────── */}
        {brand.Products.length > 0 && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5" /> Produk
            </h2>
            <div className="space-y-3">
              {brand.Products.map((p) => (
                <div key={p.product_id}>
                  <p className="font-medium text-sm flex items-center gap-2">{p.product_type} {p.product_gender && <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.product_gender}</span>}</p>
                  {p.product_description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.product_description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            Maklumat dikemaskini: {new Date(lastUpdated).toLocaleDateString("ms-MY")}
          </div>
        )}

        {/* ── Reviews placeholder ──────────────────────── */}
        <section>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" /> Reviews
          </h2>
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-display font-semibold text-foreground">Reviews Coming Soon</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Nak elak spam dan review palsu — semua reviews akan diverifikasi sebelum publish.
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-foreground/70 text-sm">© 2026 Lokal-Map</p>
        </div>
      </footer>
    </div>
  );
};

export default BrandDetailPage;
