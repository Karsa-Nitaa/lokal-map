import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Pencil, Trash2, MapPin, Package, Globe,
  ChevronDown, ChevronUp, Loader2, Crosshair,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

// Extract coordinates from a full Google Maps URL (client-side, no API needed)
function extractCoordsFromUrl(url: string): { lat: string; lng: string } | null {
  // Pattern 1: @lat,lon,zoom  e.g. /@5.4056215,100.402462,17z
  const atMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

  // Pattern 2: !3d<lat>...!4d<lng>  in data=... segment
  const dataMatch = url.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
  if (dataMatch) return { lat: dataMatch[1], lng: dataMatch[2] };

  // Pattern 3: /maps/search/lat,+lon
  const searchMatch = url.match(/\/maps\/search\/(-?\d+\.?\d+),\+?(-?\d+\.?\d+)/);
  if (searchMatch) return { lat: searchMatch[1], lng: searchMatch[2] };

  // Pattern 4: ?q=lat,lon
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d+),\+?(-?\d+\.?\d+)/);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

  return null;
}
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "clothing", label: "Fashion" },
  { value: "local-service", label: "Local Service" },
  { value: "home-bakery", label: "Home Bakery" },
  { value: "cafe", label: "Cafe" },
  { value: "photography", label: "Photography" },
  { value: "others", label: "Others" },
] as const;

const PRICE_RANGES = [
  { value: "$", label: "$ — RM0 – 50.99" },
  { value: "$$", label: "$$ — RM51 – 99.99" },
  { value: "$$$", label: "$$$ — RM100+" },
] as const;

const brandSchema = z.object({
  brand_name: z.string().min(1, "Nama brand wajib diisi"),
  brand_description: z.string().optional(),
  brand_category: z.string().min(1, "Kategori wajib dipilih"),
  price_range: z.string().optional(),
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

// ─── Reusable Field ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-border" />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2">{children}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Location Dialog ──────────────────────────────────────────────────────────

function LocationDialog({
  open, onClose, onSave, initial, pending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: LocationForm) => void;
  initial?: LocationForm;
  pending: boolean;
}) {
  const [showHours, setShowHours] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const {
    register, handleSubmit, reset, control, watch, setValue,
    formState: { errors },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: initial ?? { is_muslim_friendly: false },
  });

  useEffect(() => {
    reset(initial ?? { is_muslim_friendly: false });
    setShowHours(false);
    setDetectMsg(null);
  }, [open, initial, reset]);

  const gmapLink = watch("googlemap_link") ?? "";
  const latValue = watch("latitude") ?? "";
  const lngValue = watch("longitude") ?? "";

  async function handleAutoDetect() {
    const url = gmapLink.trim();
    if (!url) {
      setDetectMsg({ type: "err", text: "Isi Google Maps link dulu." });
      return;
    }

    setDetecting(true);
    setDetectMsg(null);

    // 1. Try client-side extraction first (works for full Google Maps URLs)
    const clientCoords = extractCoordsFromUrl(url);
    if (clientCoords) {
      setValue("latitude", clientCoords.lat);
      setValue("longitude", clientCoords.lng);
      setDetectMsg({ type: "ok", text: `✓ ${clientCoords.lat}, ${clientCoords.lng}` });
      setDetecting(false);
      return;
    }

    // 2. Short link or unrecognised — ask backend to resolve
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/resolve-gmaps?url=${encodeURIComponent(url)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDetectMsg({ type: "err", text: err.error ?? `Server error ${res.status}. Isi manual.` });
        setDetecting(false);
        return;
      }
      const data = await res.json();
      if (data.lat && data.lng) {
        setValue("latitude", String(data.lat));
        setValue("longitude", String(data.lng));
        setDetectMsg({ type: "ok", text: `✓ ${data.lat}, ${data.lng}` });
      } else {
        setDetectMsg({ type: "err", text: data.error ?? "Koordinat tidak ditemui. Isi manual." });
      }
    } catch (e) {
      // fetch itself threw → likely CORS or backend not reachable
      const msg = "Auto-detect tidak available. Sila isi koordinat manual.";
      setDetectMsg({ type: "err", text: msg });
    } finally {
      setDetecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial ? "Edit Lokasi" : "Tambah Lokasi"}
          </DialogTitle>
        </DialogHeader>

        <form id="location-form" onSubmit={handleSubmit(onSave)} className="space-y-4">
          <SectionHeading>Alamat</SectionHeading>

          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Lot (optional)">
              <Input {...register("lot_number")} placeholder="Lot 1-03" className="h-9 text-sm" />
            </Field>
            <Field label="Poskod (optional)">
              <Input {...register("postal_code")} placeholder="50350" className="h-9 text-sm" />
            </Field>
          </div>

          <Field label="Alamat Jalan *" error={errors.street_address?.message}>
            <Input {...register("street_address")} placeholder="Jalan Telawi, Bangsar" className="h-9 text-sm" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Bandar *" error={errors.city?.message}>
              <Input {...register("city")} placeholder="Kuala Lumpur" className="h-9 text-sm" />
            </Field>
            <Field label="Negeri *" error={errors.state?.message}>
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih negeri…" />
                    </SelectTrigger>
                    <SelectContent>
                      {MALAYSIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <SectionHeading>Navigasi</SectionHeading>

          <Field label="Google Maps Link" error={errors.googlemap_link?.message}
            hint="Paste mana-mana format: https://maps.app.goo.gl/… atau URL penuh Google Maps">
            <div className="flex gap-2">
              <Input
                {...register("googlemap_link")}
                placeholder="https://maps.app.goo.gl/… atau URL penuh"
                className="h-9 text-sm flex-1"
              />
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={detecting || !gmapLink.trim()}
                title="Auto-detect koordinat dari link"
                className="h-9 px-3 rounded-md border border-border bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
              >
                {detecting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Crosshair className="w-3.5 h-3.5" />}
                {detecting ? "Detecting…" : "Auto-detect"}
              </button>
            </div>
            {detectMsg && (
              <p className={`text-[11px] mt-1 ${detectMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {detectMsg.text}
              </p>
            )}
          </Field>

          {/* Lat / Long — auto-filled or manual entry */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" hint="Auto-detect atau isi manual">
              <Input
                {...register("latitude")}
                placeholder="e.g. 5.4057"
                className={`h-9 text-sm ${latValue ? "border-green-500/50 bg-green-50/30 dark:bg-green-900/10" : ""}`}
              />
            </Field>
            <Field label="Longitude" hint="Auto-detect atau isi manual">
              <Input
                {...register("longitude")}
                placeholder="e.g. 100.4050"
                className={`h-9 text-sm ${lngValue ? "border-green-500/50 bg-green-50/30 dark:bg-green-900/10" : ""}`}
              />
            </Field>
          </div>

          <Field label="Waze Link" error={errors.waze_link?.message}>
            <Input {...register("waze_link")} placeholder="https://waze.com/…" className="h-9 text-sm" />
          </Field>

          <SectionHeading>Kenalan & Bayaran</SectionHeading>

          <Field label="No. Telefon / WhatsApp">
            <Input {...register("phone_number")} placeholder="601x-xxxxxxxx" className="h-9 text-sm" />
          </Field>

          <Field label="Kaedah Bayaran" hint="Pisahkan dengan koma: Cash, Card, QR Pay">
            <Input {...register("payment_methods")} placeholder="Cash, Card, QR Pay" className="h-9 text-sm" />
          </Field>

          <Field label="Maklumat Parking (optional)">
            <Textarea {...register("parking_remarks")} rows={2} placeholder="Contoh: Free parking di belakang bangunan" className="text-sm" />
          </Field>

          <SectionHeading>Ciri Tambahan</SectionHeading>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Controller
              control={control}
              name="is_muslim_friendly"
              render={({ field }) => (
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  id="muslim-friendly"
                />
              )}
            />
            <div>
              <Label htmlFor="muslim-friendly" className="cursor-pointer text-sm font-medium">Muslim-Friendly</Label>
              <p className="text-[11px] text-muted-foreground">Fitting room berasingan, pakaian menutup aurat dsb.</p>
            </div>
          </div>

          {/* Hours toggle */}
          <button
            type="button"
            onClick={() => setShowHours((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showHours ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="font-medium">Waktu Operasi</span>
            <span className="text-[11px] text-muted-foreground/60">(optional)</span>
          </button>

          {showHours && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">Contoh: 10:00 AM – 9:00 PM atau kosongkan = Tutup</p>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground capitalize w-16 shrink-0">{day}</span>
                  <Input
                    {...register(day)}
                    placeholder="10:00 AM – 9:00 PM"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>Batal</Button>
          <Button size="sm" type="submit" form="location-form" disabled={pending}>
            {pending ? "Saving…" : "Simpan Lokasi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Dialog ───────────────────────────────────────────────────────────

function ProductDialog({
  open, onClose, onSave, initial, pending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProductForm) => void;
  initial?: ProductForm;
  pending: boolean;
}) {
  const {
    register, handleSubmit, reset, control, watch, setValue,
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial ? "Edit Produk" : "Tambah Produk"}
          </DialogTitle>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(onSave)} className="space-y-4">
          <Field label="Nama / Jenis Produk *" error={errors.product_type?.message}>
            <Input
              {...register("product_type")}
              placeholder="e.g. Baju Kurung, Hijab, Accessories"
              className="h-9 text-sm"
            />
          </Field>

          <Field label="Jantina (optional)">
            <Select value={genderValue} onValueChange={(v) => setValue("product_gender", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pilih jantina…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unisex">Unisex</SelectItem>
                <SelectItem value="lelaki">Lelaki</SelectItem>
                <SelectItem value="perempuan">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Deskripsi (optional)">
            <Textarea
              {...register("product_description")}
              rows={3}
              placeholder="Cerita sikit tentang produk ni…"
              className="text-sm"
            />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>Batal</Button>
          <Button size="sm" type="submit" form="product-form" disabled={pending}>
            {pending ? "Saving…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab nav helper ───────────────────────────────────────────────────────────

function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number; disabled?: boolean }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-border mb-6 gap-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === tab.id
              ? "border-primary text-primary"
              : tab.disabled
              ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const brandId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("brand");

  // ── Brand form ───────────────────────────────────────────────────────────────
  const {
    register: registerBrand,
    handleSubmit: handleBrandSubmit,
    reset: resetBrand,
    control: controlBrand,
    formState: { errors: brandErrors },
  } = useForm<BrandForm>({ resolver: zodResolver(brandSchema) });

  // ── Fetch ────────────────────────────────────────────────────────────────────
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
        price_range: string | null;
        Locations: DBLocation[];
        Products: DBProduct[];
        Online: DBOnline[];
      };
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (brandData) {
      resetBrand({
        brand_name: brandData.brand_name ?? "",
        brand_description: brandData.brand_description ?? "",
        brand_category: brandData.brand_category ?? "",
        price_range: brandData.price_range ?? "",
      });
    }
  }, [brandData, resetBrand]);

  const locations: DBLocation[] = brandData?.Locations ?? [];
  const products: DBProduct[] = brandData?.Products ?? [];
  const onlineRecord: DBOnline | null = brandData?.Online?.[0] ?? null;

  // ── Online form ──────────────────────────────────────────────────────────────
  const [onlinePending, setOnlinePending] = useState(false);
  const {
    register: registerOnline,
    handleSubmit: handleOnlineSubmit,
    reset: resetOnline,
    formState: { errors: onlineErrors },
  } = useForm<OnlineForm>({ resolver: zodResolver(onlineSchema) });

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

  // ── Save brand ───────────────────────────────────────────────────────────────
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
            price_range: data.price_range || null,
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
            price_range: data.price_range || null,
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
      toast.error("Gagal menyimpan brand.");
    } finally {
      setBrandPending(false);
    }
  };

  // ── Location CRUD ────────────────────────────────────────────────────────────
  const [locDialog, setLocDialog] = useState<{ open: boolean; editing: DBLocation | null }>({
    open: false, editing: null,
  });
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
        const { error } = await supabase.from("Locations").update(payload).eq("location_id", locDialog.editing.location_id);
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
  const [prodDialog, setProdDialog] = useState<{ open: boolean; editing: DBProduct | null }>({
    open: false, editing: null,
  });
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
        const { error } = await supabase.from("Products").update(payload).eq("product_id", prodDialog.editing.product_id);
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const tabs = [
    { id: "brand", label: "Brand Info" },
    { id: "online", label: "Online", disabled: !isEdit },
    {
      id: "locations",
      label: "Lokasi Fizikal",
      count: isEdit ? locations.length : undefined,
      disabled: !isEdit,
    },
    {
      id: "products",
      label: "Produk",
      count: isEdit ? products.length : undefined,
      disabled: !isEdit,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="h-8">
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-display font-bold text-sm">
            {isEdit ? (brandData?.brand_name ?? "Edit Brand") : "Tambah Brand Baru"}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {/* ── Brand Info ──────────────────────────────────────────────── */}
        {activeTab === "brand" && (
          <form onSubmit={handleBrandSubmit(saveBrand)} className="space-y-4 max-w-lg">
            <Field label="Nama Brand *" error={brandErrors.brand_name?.message}>
              <Input
                {...registerBrand("brand_name")}
                placeholder="Nama brand"
                className="h-9 text-sm"
              />
            </Field>

            <Field label="Kategori *" error={brandErrors.brand_category?.message}>
              <Controller
                control={controlBrand}
                name="brand_category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih kategori…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Deskripsi (optional)">
              <Textarea
                {...registerBrand("brand_description")}
                rows={4}
                placeholder="Cerita sikit tentang brand ni…"
                className="text-sm"
              />
            </Field>

            <Field
              label="Julat Harga (optional)"
              hint="$ = RM0–50.99  ·  $$ = RM51–99.99  ·  $$$ = RM100+"
            >
              <Controller
                control={controlBrand}
                name="price_range"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih julat harga…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tiada —</SelectItem>
                      {PRICE_RANGES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="sm" disabled={brandPending}>
                {brandPending ? "Saving…" : isEdit ? "Kemaskini" : "Buat Brand"}
              </Button>
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  Lokasi & produk boleh ditambah selepas brand dibuat.
                </p>
              )}
            </div>
          </form>
        )}

        {/* ── Online ──────────────────────────────────────────────────── */}
        {activeTab === "online" && (
          <form onSubmit={handleOnlineSubmit(saveOnline)} className="space-y-4 max-w-lg">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              Satu brand hanya boleh ada satu rekod online. Isi mana-mana link yang berkenaan.
            </div>

            <Field label="Website" error={onlineErrors.website_link?.message}>
              <Input {...registerOnline("website_link")} placeholder="https://www.brand.com" className="h-9 text-sm" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Instagram" error={onlineErrors.instagram_link?.message}>
                <Input {...registerOnline("instagram_link")} placeholder="https://instagram.com/…" className="h-9 text-sm" />
              </Field>
              <Field label="TikTok" error={onlineErrors.tiktok_link?.message}>
                <Input {...registerOnline("tiktok_link")} placeholder="https://tiktok.com/@…" className="h-9 text-sm" />
              </Field>
            </div>

            <Field label="Facebook" error={onlineErrors.facebook_link?.message}>
              <Input {...registerOnline("facebook_link")} placeholder="https://facebook.com/…" className="h-9 text-sm" />
            </Field>

            <Field label="Shopee / Link Tambahan" error={onlineErrors.additional_link?.message}>
              <Input {...registerOnline("additional_link")} placeholder="https://shopee.com.my/…" className="h-9 text-sm" />
            </Field>

            <Button type="submit" size="sm" disabled={onlinePending}>
              {onlinePending ? "Saving…" : onlineRecord ? "Kemaskini Online" : "Simpan Online"}
            </Button>
          </form>
        )}

        {/* ── Locations ───────────────────────────────────────────────── */}
        {activeTab === "locations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {locations.length === 0 ? "Belum ada lokasi fizikal." : `${locations.length} lokasi`}
              </p>
              <Button size="sm" onClick={() => setLocDialog({ open: true, editing: null })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Lokasi
              </Button>
            </div>

            {locations.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center text-muted-foreground text-sm">
                Tiada lokasi fizikal lagi.
              </div>
            )}

            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.location_id}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {[loc.street_address, loc.city, loc.state].filter(Boolean).join(", ")}
                    </p>
                    {loc.is_muslim_friendly && (
                      <span className="text-[11px] text-primary">Muslim-Friendly</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setLocDialog({ open: true, editing: loc })}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteLocTarget(loc.location_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Products ────────────────────────────────────────────────── */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {products.length === 0 ? "Belum ada produk." : `${products.length} produk`}
              </p>
              <Button size="sm" onClick={() => setProdDialog({ open: true, editing: null })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Produk
              </Button>
            </div>

            {products.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center text-muted-foreground text-sm">
                Tiada produk lagi.
              </div>
            )}

            <div className="space-y-2">
              {products.map((prod) => (
                <div
                  key={prod.product_id}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
                >
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{prod.product_type}</p>
                      {prod.product_gender && (
                        <span className="text-[10px] uppercase font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {prod.product_gender}
                        </span>
                      )}
                    </div>
                    {prod.product_description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {prod.product_description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setProdDialog({ open: true, editing: prod })}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteProdTarget(prod.product_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <LocationDialog
        open={locDialog.open}
        onClose={() => setLocDialog({ open: false, editing: null })}
        onSave={saveLocation}
        initial={locDialog.editing ? locationToForm(locDialog.editing) : undefined}
        pending={locPending}
      />

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

      {/* Delete location */}
      <AlertDialog open={deleteLocTarget !== null} onOpenChange={() => setDeleteLocTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam lokasi?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan tidak boleh dibatalkan.</AlertDialogDescription>
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

      {/* Delete product */}
      <AlertDialog open={deleteProdTarget !== null} onOpenChange={() => setDeleteProdTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam produk?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan tidak boleh dibatalkan.</AlertDialogDescription>
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
