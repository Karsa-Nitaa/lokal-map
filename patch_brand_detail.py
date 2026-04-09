import codecs
import re

with codecs.open('src/pages/BrandDetailPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Icons import
content = content.replace(
    'MessageSquarePlus, Lock, Package,',
    'MessageSquarePlus, Lock, Package, Globe, Link as LinkIcon,'
)

# 2. Fetcher
content = content.replace(
    '.select("*, Locations(*), Products(*)")',
    '.select("*, Locations(*), Products(*), Online(*)")'
)

# 3. Muslim Friendly Explanation
content = content.replace(
    '<p className="text-sm text-primary font-medium">☪ Muslim-Friendly</p>',
    '<p className="text-sm text-primary font-medium">☪ Muslim-Friendly</p>\n          <p className="text-xs text-muted-foreground">Pakaian menutup aurat / fitting room dsb.</p>'
)

content = content.replace(
    '<span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">\n                ☪ Muslim-Friendly\n              </span>',
    '''<span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium group relative cursor-help">
                ☪ Muslim-Friendly
                <div className="absolute top-full left-0 mt-1 hidden group-hover:block w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border z-50">
                  Ciri-ciri seperti pakaian menutup aurat atau kemudahan bersesuaian dengan Muslim.
                </div>
              </span>'''
)


# 4. OperationHours
old_op_hours = """function OperationHours({ hours }: { hours: Record<string, string> | null }) {
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
}"""

new_op_hours = """function OperationHours({ hours }: { hours: Record<string, string> | null }) {
  if (!hours || Object.keys(hours).length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  const parts = DAYS_OF_WEEK.map((day) => 
    hours[day] ? <span key={day} className="px-1.5 py-0.5 rounded bg-muted/50 mb-1 inline-block mr-1.5"><span className="capitalize font-medium text-foreground/80">{day.slice(0, 3)}:</span> {hours[day]}</span> : null
  );
  return (
    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-0.5">
      {parts}
    </div>
  );
}"""

content = content.replace(old_op_hours, new_op_hours)

# 5. Online Platforms UI
online_card = """
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
"""

content = content.replace(
    '{/* ── Locations ─────────────────────────────────── */}',
    online_card + '\n        {/* ── Locations ─────────────────────────────────── */}\n'
)

# 6. Change Location title to "Physical Locations" if there are online
content = content.replace(
    'Lokasi ({brand.Locations.length})',
    'Lokasi Fizikal ({brand.Locations.length})'
)

# 7. Products gender
content = content.replace(
    '<p className="font-medium text-sm">{p.product_type}</p>',
    '<p className="font-medium text-sm flex items-center gap-2">{p.product_type} {p.product_gender && <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.product_gender}</span>}</p>'
)

with codecs.open('src/pages/BrandDetailPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
