import re

with open('src/pages/admin/BrandFormPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace('import type { DBLocation, DBProduct } from', 'import type { DBLocation, DBProduct, DBOnline } from')
content = content.replace('MapPin, Package,', 'MapPin, Package, Globe,')

# 2. Schema
online_schema = '''
const onlineSchema = z.object({
  facebook_link: safeUrl.optional(),
  instagram_link: safeUrl.optional(),
  tiktok_link: safeUrl.optional(),
  website_link: safeUrl.optional(),
  additional_link: safeUrl.optional(),
});
type OnlineForm = z.infer<typeof onlineSchema>;
'''
content = content.replace('const productSchema = z.object({', online_schema + '\nconst productSchema = z.object({')

content = content.replace('product_description: z.string().optional(),\n});', 'product_description: z.string().optional(),\n  product_gender: z.string().optional(),\n});')

# 3. Query
content = content.replace('.select("*, Locations(*), Products(*)")', '.select("*, Locations(*), Products(*), Online(*)")')

# 4. BrandData type
content = content.replace('Products: DBProduct[];\n      };', 'Products: DBProduct[];\n        Online: DBOnline[];\n      };')

# 5. Extract values
extract_online = '''
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
'''

content = content.replace('const locations: DBLocation[] = brandData?.Locations ?? [];\n  const products: DBProduct[] = brandData?.Products ?? [];', extract_online)

# 6. Tabs
tabs_list = '''
            <TabsTrigger value="brand">Brand Info</TabsTrigger>
            <TabsTrigger value="online" disabled={!isEdit}>
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Online
            </TabsTrigger>
            <TabsTrigger value="locations" disabled={!isEdit}>
'''
content = content.replace('<TabsTrigger value="brand">Brand Info</TabsTrigger>\n            <TabsTrigger value="locations" disabled={!isEdit}>', tabs_list)


# 7. Online Tab Content
online_tab_content = '''
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
'''
content = content.replace('{/* ── Locations Tab ─────────────────────────────────────────────── */}', online_tab_content)

# 8. Product Dialog Gender field
product_gender_field = '''
          <div className="space-y-1.5">
            <Label>Jantina (optional)</Label>
            <Select onValueChange={(v) => { document.getElementById('hf-product-gender').value = v; document.getElementById('hf-product-gender').dispatchEvent(new Event('change', { bubbles: true })); }} defaultValue={initial?.product_gender ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua / Unisex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unisex">Unisex</SelectItem>
                  <SelectItem value="lelaki">Lelaki sahaja</SelectItem>
                  <SelectItem value="perempuan">Perempuan sahaja</SelectItem>
                </SelectContent>
            </Select>
            <input type="hidden" id="hf-product-gender" {...register("product_gender")} />
          </div>
'''
content = content.replace('<div className="space-y-1.5">\n            <Label>Deskripsi (optional)</Label>', product_gender_field + '\n          <div className="space-y-1.5">\n            <Label>Deskripsi (optional)</Label>')

# 9. Update initial product form in BrandFormPage
content = content.replace('product_description: prodDialog.editing.product_description ?? "",', 'product_description: prodDialog.editing.product_description ?? "",\n                product_gender: prodDialog.editing.product_gender ?? "",')
content = content.replace('product_description: form.product_description || null,', 'product_description: form.product_description || null,\n        product_gender: form.product_gender || null,')

with open('src/pages/admin/BrandFormPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
