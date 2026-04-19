import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, X, Lock } from "lucide-react";
import { CATEGORIES } from "@/data/brands";
import type { Category } from "@/data/brands";
import { supabase } from "@/lib/supabase";
import { MALAYSIAN_STATES } from "@/lib/database.types";
import type { BrandWithDetails } from "@/lib/database.types";
import { Helmet } from "react-helmet-async";
import BrandCard from "@/components/BrandCard";
import IndexMap from "@/components/IndexMap";
import heroBanner from "@/assets/hero-banner.jpg";

async function fetchAllBrands(): Promise<BrandWithDetails[]> {
  const { data, error } = await supabase
    .from("Brand")
    .select("*, Locations(*), Products(*), Online(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandWithDetails[];
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const selectedCategory = (searchParams.get("category") as Category) || null;
  const selectedState = searchParams.get("state") || "";
  const muslimFriendlyOnly = searchParams.get("muslim") === "true";
  const showFilters = searchParams.get("filters") === "true";
  const selectedGender = searchParams.get("gender") || "";
  const storeType = searchParams.get("storeType") || "";

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => {
          if (v === null || v === "") p.delete(k);
          else p.set(k, v);
        });
        return p;
      },
      { replace: true }
    );
  };

  const { data: allBrands = [], isLoading } = useQuery({
    queryKey: ["public-brands"],
    queryFn: fetchAllBrands,
  });

  const resetFilters = () => {
    updateParams({ state: null, muslim: null, gender: null, storeType: null });
  };

  const handleCategorySelect = (cat: Category) => {
    const next = selectedCategory === cat ? null : cat;
    updateParams({ category: next, state: null, muslim: null, gender: null, storeType: null, filters: null });
  };

  const filtered = useMemo(() => {
    if (!selectedCategory) return [];
    return allBrands.filter((b) => {
      const matchCategory = b.brand_category === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (b.brand_name ?? "").toLowerCase().includes(q) ||
        (b.brand_description ?? "").toLowerCase().includes(q) ||
        b.Products.some((p) => (p.product_type ?? "").toLowerCase().includes(q));
      // Skip state filter for online-only filter — online stores have no physical state
      const matchState =
        !selectedState ||
        storeType === "online" ||
        b.Locations.some((l) => l.state === selectedState);
      const matchMuslim = !muslimFriendlyOnly || b.Locations.some((l) => l.is_muslim_friendly);
      const matchGender =
        !selectedGender ||
        b.Products.some((p) => p.product_gender === selectedGender || p.product_gender === "unisex");
      const matchStoreType =
        !storeType ||
        (storeType === "online" ? b.Online && b.Online.length > 0 : b.Locations && b.Locations.length > 0);
      return matchCategory && matchSearch && matchState && matchMuslim && matchGender && matchStoreType;
    });
  }, [selectedCategory, allBrands, search, selectedState, muslimFriendlyOnly, selectedGender, storeType]);

  const hasActiveFilters = !!selectedState || muslimFriendlyOnly || !!selectedGender || !!storeType;
  const activeFilterCount =
    (selectedState ? 1 : 0) + (muslimFriendlyOnly ? 1 : 0) + (selectedGender ? 1 : 0) + (storeType ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Lokal-Map — Direktori Brand Lokal Malaysia</title>
        <meta name="description" content="Jumpa brand lokal Malaysia — pakaian, bakeri, kafe, perkhidmatan tempatan & lebih. Terokai kedai fizikal dan online dalam satu direktori." />
        <meta name="keywords" content="brand lokal malaysia, lokal map, kedai lokal malaysia, fashion lokal, home bakery malaysia, kafe lokal, lokal-map" />
        <meta property="og:title" content="Lokal-Map — Direktori Brand Lokal Malaysia" />
        <meta property="og:description" content="Direktori brand lokal Malaysia. Cari pakaian, bakeri, kafe & lebih. Support local!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lokal-map.vercel.app" />
        <link rel="canonical" href="https://lokal-map.vercel.app" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Lokal-Map",
          "url": "https://lokal-map.vercel.app",
          "description": "Direktori brand lokal Malaysia",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://lokal-map.vercel.app?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}</script>
      </Helmet>
      {/* Hero */}
      <header className="relative h-[55vh] min-h-[380px] flex items-center justify-center overflow-hidden">
        <img
          src={heroBanner}
          alt="Malaysian local brands"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[hsl(var(--hero-overlay)/0.72)]" />
        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-3 animate-fade-in-up">
            Lokal-Map
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/75 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Directory brand lokal Malaysia — pakaian, bakeri, kafe &amp; lebih.
          </p>
          <div className="relative max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari brand atau produk..."
              value={search}
              onChange={(e) => updateParams({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-background/95 backdrop-blur-md border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-md text-sm"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <IndexMap brands={allBrands} />

        {/* Category picker */}
        <section className="mb-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ id, label, emoji, available }) =>
              available ? (
                <button
                  key={id}
                  onClick={() => handleCategorySelect(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedCategory === id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </button>
              ) : (
                <div
                  key={id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/40 bg-muted/20 text-muted-foreground/50 text-sm font-medium cursor-not-allowed select-none"
                >
                  <span className="text-base opacity-30">{emoji}</span>
                  {label}
                  <span className="ml-auto flex items-center gap-0.5 text-[11px]">
                    <Lock className="w-2.5 h-2.5" /> Soon
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        {selectedCategory ? (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {isLoading ? "Loading..." : `${filtered.length} brand`}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <button
                onClick={() => updateParams({ filters: showFilters ? null : "true" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {hasActiveFilters && (
                  <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mb-6 p-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm space-y-4">
                {/* State */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Negeri</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MALAYSIAN_STATES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateParams({ state: selectedState === s ? null : s })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedState === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Platform */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Platform</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: "fizikal", label: "Physical" },
                        { value: "online", label: "Online" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => updateParams({ storeType: storeType === value ? null : value })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            storeType === value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Jantina</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: "lelaki", label: "Lelaki" },
                        { value: "perempuan", label: "Perempuan" },
                        { value: "unisex", label: "Unisex" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => updateParams({ gender: selectedGender === value ? null : value })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            selectedGender === value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Muslim friendly */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lain-lain</p>
                    <button
                      onClick={() => updateParams({ muslim: muslimFriendlyOnly ? null : "true" })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        muslimFriendlyOnly
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Muslim-Friendly
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Brand grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((brand, i) => (
                  <BrandCard
                    key={brand.brand_id}
                    brand={brand}
                    index={i}
                    onClick={() => navigate(`/brand/${brand.brand_id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-base font-medium">Tiada brand dijumpai</p>
                <p className="text-sm mt-1">Cuba tukar filter atau keyword lain</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Pilih kategori di atas untuk lihat brand</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-5 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© 2026 Lokal-Map</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
