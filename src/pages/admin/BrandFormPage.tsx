import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Pencil, Trash2, MapPin, Package, Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DBLocation, DBProduct, DBOnline } from "@/lib/database.types";
import { DAYS_OF_WEEK, MALAYSIAN_STATES } from "@/lib/database.types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const BRAND_CATEGORIES = [
  { value: "clothing", label: "👗 Clothing" },
  { value: "local-service", label: "🎨 Local Service" },
  { value: "home-bakery", label: "🧁 Home Bakery" },
  { value: "cafe", label: "☕ Cafe" },
  { value: "photography", label: "📷 Photography" },
  { value: "others", label: "✨ Others" },
] as const;

const brandSchema = z.object({
  brand_name: z.string().min(1, "Nama brand wajib diisi"),
  brand_description: z.string().optional(),
  brand_category: z.string().min(1, "Kategori wajib dipilih"),
});
type BrandForm = z.infer<typeof brandSchema>;

const safeUrl = z.string().refine(
  (v) => v === "" || /^https?:\/\/.+/.test(v),
  "Mesti bermula dengan http:// atau https://"
);

const locationSchema = z.object({
  lot_number: z.string().optional(),
  street_address: z.string().min(1, "Alamat wajib diisi"),
  city: z.string().min(1, "Bandar wajib diisi"),
  postal_code: z.string().optional(),
  state: z.string().min(1, "Negeri wajib dipilih"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  waze_link: safeUrl.optional(),
  googlemap_link: safeUrl.optional(),
  phone_number: z.string().optional(),
  payment_methods: z.string().optional(),
  parking_remarks: z.string().optional(),
  is_muslim_friendly: z.boolean().optional(),
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional(),
});
type LocationForm = z.infer<typeof locationSchema>;


const onlineSchema = z.object({
  facebook_link: safeUrl.optional(),
  instagram_link: safeUrl.optional(),
  tiktok_link: safeUrl.optional(),
  website_link: safeUrl.optional(),
  additional_link: safeUrl.optional(),
});
type OnlineForm = z.infer<typeof onlineSchema>;

const productSchema = z.object({
  product_type: z.string().min(1, "Jenis produk wajib diisi"),
  product_description: z.string().optional(),
  product_gender: z.string().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function locationToForm(loc: DBLocation): LocationForm {
  const oh = loc.operation_hours ?? {};
  return {
    lot_number: loc.lot_number ?? "",
    street_address: loc.street_address ?? "",
    city: loc.city ?? "",
    postal_code: loc.postal_code ?? "",
    state: loc.state ?? "",
    latitude: loc.latitude ?? "",
    longitude: loc.longitude ?? "",
    waze_link: loc.waze_link ?? "",
    googlemap_link: loc.googlemap_link ?? "",
    phone_number: loc.phone_number ?? "",
    payment_methods: loc.payment_methods ?? "",
    parking_remarks: loc.parking_remarks ?? "",
    is_muslim_friendly: loc.is_muslim_friendly ?? false,
    monday: oh.monday ?? "",
    tuesday: oh.tuesday ?? "",
    wednesday: oh.wednesday ?? "",
    thursday: oh.thursday ?? "",
    friday: oh.friday ?? "",
    saturday: oh.saturday ?? "",
    sunday: oh.sunday ?? "",
  };
}

function formToOperationHours(data: LocationForm): Record<string, string> {
  const hours: Record<string, string> = {};
  for (const day of DAYS_OF_WEEK) {
    const val = data[day];
    if (val && val.trim()) hours[day] = val.trim();
  }
  return hours;
}

// ─── Location Dialog ──────────────────────────────────────────────────────────

function LocationDialog({
  open,
  onClose,
  onSave,
  initial,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: LocationForm) => void;
  initial?: LocationForm;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: initial ?? { is_muslim_friendly: false },
  });

  // Reset whenever dialog reopens with new initial values
  useEffect(() => {
    reset(initial ?? { is_muslim_friendly: false });
  }, [open, initial, reset]);

  const isMuslimFriendly = watch("is_muslim_friendly");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit Lokasi" : "Tambah Lokasi"}
          </DialogTitle>
        </DialogHeader>

        <form id="location-form" onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
          {/* Address */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>No. Lot (optional)</Label>
              <Input {...register("lot_number")} placeholder="Lot 1-03" />
            </div>
            <div className="space-y-1.5">
              <Label>Poskod (optional)</Label>
              <Input {...register("postal_code")} placeholder="50350" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Alamat Jalan *</Label>
            <Input
              {...register("street_address")}
              placeholder="Jalan Telawi 1, Bangsar"
            />
            {errors.street_address && (
              <p className="text-xs text-destructive">{errors.street_address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bandar *</Label>
              <Input {...register("city")} placeholder="Kuala Lumpur" />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Negeri *</Label>
              <Select
                value={watch("state")}
                onValueChange={(v) => setValue("state", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih negeri…" />
                </SelectTrigger>
                <SelectContent>
                  {MALAYSIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state.message}</p>
              )}
            </div>
          </div>

          {/* Navigation links */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Google Maps Link (optional)</Label>
              <Input {...register("googlemap_link")} placeholder="https://maps.google.com/…" />
              {errors.googlemap_link && (
                <p className="text-xs text-destructive">{errors.googlemap_link.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Waze Link (optional)</Label>
              <Input {...register("waze_link")} placeholder="https://waze.com/…" />
              {errors.waze_link && (
                <p className="text-xs text-destructive">{errors.waze_link.message}</p>
              )}
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Latitude (optional)</Label>
              <Input {...register("latitude")} placeholder="3.1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude (optional)</Label>
              <Input {...register("longitude")} placeholder="101.6789" />
            </div>
          </div>

          {/* Contact & payment */}
          <div className="space-y-1.5">
            <Label>No. Telefon / WhatsApp (optional)</Label>
            <Input {...register("phone_number")} placeholder="601x-xxxxxxxx" />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Methods (optional)</Label>
            <Input
              {...register("payment_methods")}
              placeholder="Cash, Card, QR Pay — pisah dengan koma"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Parking Info (optional)</Label>
            <Textarea {...register("parking_remarks")} rows={2} placeholder="Free parking belakang bangunan…" />
          </div>

          {/* Muslim friendly */}
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Switch
              checked={isMuslimFriendly ?? false}
              onCheckedChange={(v) => setValue("is_muslim_friendly", v)}
              id="muslim-friendly"
            />
            <Label htmlFor="muslim-friendly" className="cursor-pointer">
              Muslim-Friendly (fitting room/surau available)
            </Label>
          </div>

          {/* Operation hours */}
          <div className="space-y-2">
            <Label>Waktu Operasi (optional) — contoh: 10:00 AM - 9:00 PM atau "Tutup"</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground capitalize w-20 shrink-0">{day}</span>
                  <Input
                    {...register(day)}
                    placeholder="9:00 AM - 9:00 PM"
                    className="text-xs h-8"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button>
          <Button type="submit" form="location-form" disabled={pending}>
            {pending ? "Saving…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Dialog ───────────────────────────────────────────────────────────

function ProductDialog({
  open,
  onClose,
  onSave,
  initial,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProductForm) => void;
  initial?: ProductForm;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: initial,
  });

  useEffect(() => {
    reset(initial ?? {});
  }, [open, initial, reset]);

  const genderValue = watch("product_gender") ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit Produk" : "Tambah Produk"}
          </DialogTitle>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Jenis Produk *</Label>
            <Input
              {...register("product_type")}
              placeholder="e.g. Clothing, Accessories, Homewear…"
            />
            {errors.product_type && (
              <p className="text-xs text-destructive">{errors.product_type.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Jantina (optional)</Label>
            <Select
              value={genderValue}
              onValueChange={(v) => setValue("product_gender", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jantina…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unisex">🤝 Unisex</SelectItem>
                <SelectItem value="lelaki">👔 Lelaki sahaja</SelectItem>
                <SelectItem value="perempuan">👗 Perempuan sahaja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Deskripsi (optional)</Label>
            <Textarea
              {...register("product_description")}
              rows={3}
              placeholder="Cerita sikit tentang produk ni…"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button>
          <Button type="submit" form="product-form" disabled={pending}>
            {pending ? "Saving…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const brandId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Brand form ──────────────────────────────────────────────────────────────
  const {
    register: registerBrand,
    handleSubmit: handleBrandSubmit,
    reset: resetBrand,
    watch: watchBrand,
    setValue: setValueBrand,
    formState: { errors: brandErrors },
  } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
  });

  // ── Fetch brand + children when in edit mode ────────────────────────────────
  const { data: brandData, isLoading } = useQuery({
    queryKey: ["admin-brand", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Brand")
        .select("*, Locations(*), Products(*), Online(*)")
        .eq("brand_id", brandId!)
        .single();
      if (error) throw error;
      return data as {
        brand_id: number;
        brand_name: string | null;
        brand_description: string | null;
        brand_category: string | null;
        Locations: DBLocation[];
        Products: DBProduct[];
        Online: DBOnline[];
      };
    },
    enabled: isEdit,
  });

  // Populate brand form when data loads
  useEffect(() => {
    if (brandData) {
      resetBrand({
        brand_name: brandData.brand_name ?? "",
        brand_description: brandData.brand_description ?? "",
        brand_category: brandData.brand_category ?? "",
      });
    }
  }, [brandData, resetBrand]);

  
  const locations: DBLocation[] = brandData?.Locations ?? [];
  const products: DBProduct[] = brandData?.Products ?? [];
  const onlineRecord: DBOnline | null = brandData?.Online?.[0] ?? null;

  // ── Online CRUD ─────────────────────────────────────────────────────────────
  const [onlinePending, setOnlinePending] = useState(false);
  const {
    register: registerOnline,
    handleSubmit: handleOnlineSubmit,
    reset: resetOnline,
    formState: { errors: onlineErrors },
  } = useForm<OnlineForm>({
    resolver: zodResolver(onlineSchema),
  });

  useEffect(() => {
    if (onlineRecord) {
      resetOnline({
        facebook_link: onlineRecord.facebook_link ?? "",
        instagram_link: onlineRecord.instagram_link ?? "",
        tiktok_link: onlineRecord.tiktok_link ?? "",
        website_link: onlineRecord.website_link ?? "",
        additional_link: onlineRecord.additional_link ?? "",
      });
    } else {
      resetOnline({});
    }
  }, [onlineRecord, resetOnline]);

  const saveOnline = async (form: OnlineForm) => {
    if (!brandId) return;
    setOnlinePending(true);
    try {
      const payload = {
        facebook_link: form.facebook_link || null,
        instagram_link: form.instagram_link || null,
        tiktok_link: form.tiktok_link || null,
        website_link: form.website_link || null,
        additional_link: form.additional_link || null,
        brand_id: brandId,
        updated_at: new Date().toISOString(),
      };

      if (onlineRecord) {
        const { error } = await supabase.from("Online").update(payload).eq("online_id", onlineRecord.online_id);
        if (error) throw error;
        toast.success("Platform online dikemaskini.");
      } else {
        const { error } = await supabase.from("Online").insert(payload);
        if (error) throw error;
        toast.success("Platform online berjaya disimpan.");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
    } catch {
      toast.error("Gagal menyimpan platform online.");
    } finally {
      setOnlinePending(false);
    }
  };


  // ── Save brand ──────────────────────────────────────────────────────────────
  const [brandPending, setBrandPending] = useState(false);
  const saveBrand = async (data: BrandForm) => {
    setBrandPending(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("Brand")
          .update({
            brand_name: data.brand_name,
            brand_description: data.brand_description ?? null,
            brand_category: data.brand_category,
          })
          .eq("brand_id", brandId!);
        if (error) throw error;
        toast.success("Brand dikemaskini.");
      } else {
        const { data: inserted, error } = await supabase
          .from("Brand")
          .insert({
            brand_name: data.brand_name,
            brand_description: data.brand_description ?? null,
            brand_category: data.brand_category,
          })
          .select("brand_id")
          .single();
        if (error) throw error;
        toast.success("Brand berjaya dibuat!");
        navigate(`/admin/brands/${inserted.brand_id}/edit`, { replace: true });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
    } catch {
      toast.error("Gagal menyimpan brand. Cuba lagi.");
    } finally {
      setBrandPending(false);
    }
  };

  // ── Location CRUD ───────────────────────────────────────────────────────────
  const [locDialog, setLocDialog] = useState<{
    open: boolean;
    editing: DBLocation | null;
  }>({ open: false, editing: null });
  const [locPending, setLocPending] = useState(false);
  const [deleteLocTarget, setDeleteLocTarget] = useState<number | null>(null);

  const saveLocation = async (form: LocationForm) => {
    if (!brandId) return;
    setLocPending(true);
    try {
      const payload = {
        lot_number: form.lot_number || null,
        street_address: form.street_address,
        city: form.city,
        postal_code: form.postal_code || null,
        state: form.state,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        waze_link: form.waze_link || null,
        googlemap_link: form.googlemap_link || null,
        operation_hours: formToOperationHours(form),
        phone_number: form.phone_number || null,
        payment_methods: form.payment_methods || null,
        parking_remarks: form.parking_remarks || null,
        is_muslim_friendly: form.is_muslim_friendly ?? false,
        brand_id: brandId,
        updated_at: new Date().toISOString(),
      };

      if (locDialog.editing) {
        const { error } = await supabase
          .from("Locations")
          .update(payload)
          .eq("location_id", locDialog.editing.location_id);
        if (error) throw error;
        toast.success("Lokasi dikemaskini.");
      } else {
        const { error } = await supabase.from("Locations").insert(payload);
        if (error) throw error;
        toast.success("Lokasi ditambah.");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
      setLocDialog({ open: false, editing: null });
    } catch {
      toast.error("Gagal menyimpan lokasi.");
    } finally {
      setLocPending(false);
    }
  };

  const deleteLocation = useMutation({
    mutationFn: async (location_id: number) => {
      const { error } = await supabase.from("Locations").delete().eq("location_id", location_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
      toast.success("Lokasi dipadam.");
    },
    onError: () => toast.error("Gagal memadam lokasi."),
  });

  // ── Product CRUD ─────────────────────────────────────────────────────────────
  const [prodDialog, setProdDialog] = useState<{
    open: boolean;
    editing: DBProduct | null;
  }>({ open: false, editing: null });
  const [prodPending, setProdPending] = useState(false);
  const [deleteProdTarget, setDeleteProdTarget] = useState<number | null>(null);

  const saveProduct = async (form: ProductForm) => {
    if (!brandId) return;
    setProdPending(true);
    try {
      const payload = {
        product_type: form.product_type,
        product_description: form.product_description || null,
        product_gender: form.product_gender || null,
        brand_id: brandId,
      };

      if (prodDialog.editing) {
        const { error } = await supabase
          .from("Products")
          .update(payload)
          .eq("product_id", prodDialog.editing.product_id);
        if (error) throw error;
        toast.success("Produk dikemaskini.");
      } else {
        const { error } = await supabase.from("Products").insert(payload);
        if (error) throw error;
        toast.success("Produk ditambah.");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
      setProdDialog({ open: false, editing: null });
    } catch {
      toast.error("Gagal menyimpan produk.");
    } finally {
      setProdPending(false);
    }
  };

  const deleteProduct = useMutation({
    mutationFn: async (product_id: number) => {
      const { error } = await supabase.from("Products").delete().eq("product_id", product_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand", brandId] });
      toast.success("Produk dipadam.");
    },
    onError: () => toast.error("Gagal memadam produk."),
  });

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-display font-bold text-base">
            {isEdit ? "Edit Brand" : "Tambah Brand Baru"}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Tabs defaultValue="brand">
          <TabsList className="mb-6">
            
            <TabsTrigger value="brand">Brand Info</TabsTrigger>
            <TabsTrigger value="online" disabled={!isEdit}>
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Online
            </TabsTrigger>
            <TabsTrigger value="locations" disabled={!isEdit}>

              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Lokasi {isEdit && <span className="ml-1 opacity-60">({locations.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="products" disabled={!isEdit}>
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Produk {isEdit && <span className="ml-1 opacity-60">({products.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Brand Info Tab ────────────────────────────────────────────── */}
          <TabsContent value="brand">
            <form onSubmit={handleBrandSubmit(saveBrand)} className="space-y-5 rounded-2xl border border-border bg-card p-6">
              <div className="space-y-1.5">
                <Label htmlFor="brand_name">Nama Brand *</Label>
                <Input
                  id="brand_name"
                  {...registerBrand("brand_name")}
                  placeholder="Pestle & Mortar Clothing"
                />
                {brandErrors.brand_name && (
                  <p className="text-xs text-destructive">{brandErrors.brand_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Kategori *</Label>
                <Select
                  value={watchBrand("brand_category")}
                  onValueChange={(v) => setValueBrand("brand_category", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {brandErrors.brand_category && (
                  <p className="text-xs text-destructive">{brandErrors.brand_category.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand_description">Deskripsi (optional)</Label>
                <Textarea
                  id="brand_description"
                  {...registerBrand("brand_description")}
                  rows={4}
                  placeholder="Cerita sikit tentang brand ni…"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={brandPending}>
                  {brandPending ? "Saving…" : isEdit ? "Kemaskini Brand" : "Buat Brand"}
                </Button>
              </div>

              {!isEdit && (
                <p className="text-xs text-muted-foreground text-center">
                  Selepas brand dibuat, anda boleh tambah lokasi dan produk.
                </p>
              )}
            </form>
          </TabsContent>

          
          {/* ── Online Tab ──────────────────────────────────────────────── */}
          <TabsContent value="online">
            <form onSubmit={handleOnlineSubmit(saveOnline)} className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="space-y-1.5">
                <Label>Website Link</Label>
                <Input {...registerOnline("website_link")} placeholder="https://www.brand.com" />
                {onlineErrors.website_link && <p className="text-xs text-destructive">{onlineErrors.website_link.message}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Instagram Link</Label>
                  <Input {...registerOnline("instagram_link")} placeholder="https://instagram.com/..." />
                  {onlineErrors.instagram_link && <p className="text-xs text-destructive">{onlineErrors.instagram_link.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>TikTok Link</Label>
                  <Input {...registerOnline("tiktok_link")} placeholder="https://tiktok.com/..." />
                  {onlineErrors.tiktok_link && <p className="text-xs text-destructive">{onlineErrors.tiktok_link.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Facebook Link</Label>
                <Input {...registerOnline("facebook_link")} placeholder="https://facebook.com/..." />
                {onlineErrors.facebook_link && <p className="text-xs text-destructive">{onlineErrors.facebook_link.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Extra / Additional Link (e.g. Shopee)</Label>
                <Input {...registerOnline("additional_link")} placeholder="https://shopee.com.my/..." />
                {onlineErrors.additional_link && <p className="text-xs text-destructive">{onlineErrors.additional_link.message}</p>}
              </div>

              <div className="flex justify-end mt-4">
                 <Button type="submit" disabled={onlinePending}>
                  {onlinePending ? "Saving..." : "Simpan Online Info"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Locations Tab ─────────────────────────────────────────────── */}

          <TabsContent value="locations">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lokasi ({locations.length})</h3>
                <Button size="sm" onClick={() => setLocDialog({ open: true, editing: null })}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Lokasi
                </Button>
              </div>

              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Belum ada lokasi. Tambah sekurang-kurangnya satu lokasi.
                </p>
              )}

              {locations.map((loc) => (
                <div
                  key={loc.location_id}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {[loc.street_address, loc.city, loc.state].filter(Boolean).join(", ")}
                    </p>
                    {loc.is_muslim_friendly && (
                      <span className="text-xs text-primary font-medium">☪ Muslim-Friendly</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocDialog({ open: true, editing: loc })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteLocTarget(loc.location_id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Products Tab ──────────────────────────────────────────────── */}
          <TabsContent value="products">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Produk ({products.length})</h3>
                <Button size="sm" onClick={() => setProdDialog({ open: true, editing: null })}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Produk
                </Button>
              </div>

              {products.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Belum ada produk.
                </p>
              )}

              {products.map((prod) => (
                <div
                  key={prod.product_id}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                >
                  <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{prod.product_type}</p>
                      {prod.product_gender && (
                        <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {prod.product_gender}
                        </span>
                      )}
                    </div>
                    {prod.product_description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {prod.product_description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProdDialog({ open: true, editing: prod })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteProdTarget(prod.product_id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Location dialog */}
      <LocationDialog
        open={locDialog.open}
        onClose={() => setLocDialog({ open: false, editing: null })}
        onSave={saveLocation}
        initial={locDialog.editing ? locationToForm(locDialog.editing) : undefined}
        pending={locPending}
      />

      {/* Product dialog */}
      <ProductDialog
        open={prodDialog.open}
        onClose={() => setProdDialog({ open: false, editing: null })}
        onSave={saveProduct}
        initial={
          prodDialog.editing
            ? {
                product_type: prodDialog.editing.product_type ?? "",
                product_description: prodDialog.editing.product_description ?? "",
                product_gender: prodDialog.editing.product_gender ?? "",
              }
            : undefined
        }
        pending={prodPending}
      />

      {/* Delete location confirmation */}
      <AlertDialog
        open={deleteLocTarget !== null}
        onOpenChange={() => setDeleteLocTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam lokasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Lokasi ini akan dipadam. Tindakan tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteLocTarget !== null) deleteLocation.mutate(deleteLocTarget);
                setDeleteLocTarget(null);
              }}
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete product confirmation */}
      <AlertDialog
        open={deleteProdTarget !== null}
        onOpenChange={() => setDeleteProdTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk ini akan dipadam. Tindakan tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteProdTarget !== null) deleteProduct.mutate(deleteProdTarget);
                setDeleteProdTarget(null);
              }}
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
