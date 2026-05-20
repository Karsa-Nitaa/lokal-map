import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, LogOut, MapPin, Package, Globe, ExternalLink, BarChart2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { BrandWithDetails } from "@/lib/database.types";

async function fetchBrands(): Promise<BrandWithDetails[]> {
  const { data, error } = await supabase
    .from("Brand")
    .select("*, Locations(location_id, city, state), Products(product_id, product_type), Online(online_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandWithDetails[];
}

async function deleteBrand(brand_id: number) {
  await supabase.from("Online").delete().eq("brand_id", brand_id);
  await supabase.from("Locations").delete().eq("brand_id", brand_id);
  await supabase.from("Products").delete().eq("brand_id", brand_id);
  const { error } = await supabase.from("Brand").delete().eq("brand_id", brand_id);
  if (error) throw error;
}

const CATEGORY_BADGE: Record<string, string> = {
  clothing: "Fashion",
  "local-service": "Local Service",
  "home-bakery": "Home Bakery",
  cafe: "Cafe",
  photography: "Photography",
  others: "Others",
};

const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: fetchBrands,
  });

  const availableCategories = useMemo(() => {
    const cats = new Set(brands.map((b) => b.brand_category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      const matchCat = selectedCategory === "all" || b.brand_category === selectedCategory;
      const matchSearch = !q || (b.brand_name ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [brands, selectedCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / PAGE_SIZE));
  const paginatedBrands = filteredBrands.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Brand dipadam.");
    },
    onError: () => toast.error("Gagal memadam brand."),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-base">Lokal-Map</h1>
            <p className="text-[11px] text-muted-foreground">Admin Panel</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/admin/analytics")}
            >
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Site
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={async () => {
                await signOut();
                navigate("/admin/login", { replace: true });
              }}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats row */}
        {!isLoading && brands.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Total Brands", value: brands.length },
              {
                label: "Dengan Lokasi",
                value: brands.filter((b) => b.Locations.length > 0).length,
              },
              {
                label: "Ada Online",
                value: brands.filter((b) => b.Online && b.Online.length > 0).length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-4 text-center"
              >
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Brands list header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">
            Brands
            {!isLoading && (
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({filteredBrands.length}{selectedCategory !== "all" ? ` / ${brands.length}` : ""})
              </span>
            )}
          </h2>
          <Button size="sm" onClick={() => navigate("/admin/brands/new")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Tambah Brand
          </Button>
        </div>

        {/* Search */}
        {!isLoading && brands.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama brand..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Category filter */}
        {!isLoading && availableCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Semua
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {CATEGORY_BADGE[cat] ?? cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && brands.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-medium">Belum ada brand.</p>
            <p className="text-sm mt-1">Klik "Tambah Brand" untuk mulakan.</p>
          </div>
        )}
        {!isLoading && brands.length > 0 && filteredBrands.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">Tiada brand dalam kategori ini.</p>
          </div>
        )}

        {/* Brand rows */}
        {!isLoading && filteredBrands.length > 0 && (
          <>
            <div className="space-y-2">
              {paginatedBrands.map((brand) => (
                <div
                  key={brand.brand_id}
                  className="group rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-4 hover:border-primary/30 transition-colors"
                >
                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{brand.brand_name || "(no name)"}</p>
                      {brand.brand_category && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                          {CATEGORY_BADGE[brand.brand_category] ?? brand.brand_category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {brand.Locations.length} lokasi
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Package className="w-3 h-3" />
                        {brand.Products.length} produk
                      </span>
                      {brand.Online && brand.Online.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          Online
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => navigate(`/admin/brands/${brand.brand_id}/edit`)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(brand.brand_id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredBrands.length)} daripada {filteredBrands.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (arr[idx - 1] as number) + 1 < p) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "…" ? (
                        <span key={`ellipsis-${idx}`} className="text-xs text-muted-foreground px-1">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setCurrentPage(item as number)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua lokasi, produk, dan data online untuk brand ini akan dipadam. Tindakan tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget !== null) deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Ya, Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
