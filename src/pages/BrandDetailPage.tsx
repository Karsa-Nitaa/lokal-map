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
    <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

// ── Smart Operation Hours ─────────────────────────────────────────────────────
// Groups consecutive days with the same hours, e.g. "Tue – Sun  10:00 AM – 6:00 PM"

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
    // Check if consecutive in the week
    const prevIdx = DAYS_OF_WEEK.indexOf(prevDay);
    const curIdx = DAYS_OF_WEEK.indexOf(day);
    if (curIdx === prevIdx + 1 && hours[day] === groupValue) {
      groupEnd = day;
    } else {
      // Flush current group
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
  // Flush last group
  const label =
    groupStart === groupEnd
      ? DAY_SHORT[groupStart]
      : `${DAY_SHORT[groupStart]} – ${DAY_SHORT[groupEnd]}`;
  groups.push({ label, value: groupValue });

  return groups;
}

function OperationHours({ hours }: { hours: Record<string, string> | null }) {
  if (!hours) return <p className="text-xs text-muted-foreground">—</p>;

  // Build a full row for all 7 days (mark missing as "Tutup")
  const allDays = DAYS_OF_WEEK.map((d) => ({ day: d, value: hours[d] || null }));
  const hasAny = allDays.some((d) => d.value);
  if (!hasAny) return <p className="text-xs text-muted-foreground">—</p>;

  // Group open days
  const openHours: Record<string, string> = {};
  allDays.forEach(({ day, value }) => { if (value) openHours[day] = value; });
  const openGroups = groupHours(openHours);

  // Closed days (individually)
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

const LocationCard = ({ loc, index }: { loc: DBLocation; index: number }) => {
  const address = [loc.lot_number, loc.street_address, loc.city, loc.postal_code, loc.state]
    .filter(Boolean)
    .join(", ");
  const paymentList = loc.payment_methods
    ? loc.payment_methods.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Location number pill */}
      {index > 0 && (
        <div className="text-[11px] font-semibold text-muted-foreground">Lokasi {index + 1}</div>
      )}

      <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Alamat">
        <p className="text-sm leading-snug">{address || "—"}</p>
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

  return (
    <div className="min-h-screen bg-background">
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
            {brand.Products.map((p) => p.product_type).filter(Boolean).map((type) => (
              <span key={type} className="text-[11px] px-2.5 py-1 rounded-full bg-tag text-tag-foreground font-medium">
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

        {/* ── Physical Locations ───────────────────────── */}
        {brand.Locations.length > 0 && (
          <section>
            <SectionTitle
              icon={<Store className="w-4 h-4" />}
              title={`Lokasi Fizikal${brand.Locations.length > 1 ? ` (${brand.Locations.length})` : ""}`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {brand.Locations.map((loc, i) => (
                <LocationCard key={loc.location_id} loc={loc} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Products ─────────────────────────────────── */}
        {brand.Products.length > 0 && (
          <section>
            <SectionTitle icon={<Package className="w-4 h-4" />} title="Produk" />
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              {brand.Products.map((p) => (
                <div key={p.product_id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{p.product_type}</span>
                      {p.product_gender && (
                        <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {p.product_gender}
                        </span>
                      )}
                    </div>
                    {p.product_description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.product_description}</p>
                    )}
                  </div>
                </div>
              ))}
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
