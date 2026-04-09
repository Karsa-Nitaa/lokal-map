import codecs
import re

with codecs.open('src/pages/Index.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. imports
content = content.replace(
    'import { useNavigate } from "react-router-dom";',
    'import { useNavigate, useSearchParams } from "react-router-dom";'
)

content = content.replace(
    '.select("*, Locations(*), Products(*)")',
    '.select("*, Locations(*), Products(*), Online(*)")'
)

# 3. Replace state with searchParams
state_hooks = """
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const selectedCategory = (searchParams.get("category") as Category) || null;
  const selectedState = searchParams.get("state") || "";
  const muslimFriendlyOnly = searchParams.get("muslim") === "true";
  const showFilters = searchParams.get("filters") === "true";
  const selectedGender = searchParams.get("gender") || "";
  const storeType = searchParams.get("storeType") || "";

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      });
      return p;
    }, { replace: true });
  };

  const setSearch = (v: string) => updateParams({ search: v });
  const setSelectedCategory = (v: Category | null) => updateParams({ category: v });
  const setSelectedState = (v: string) => updateParams({ state: v });
  const setMuslimFriendlyOnly = (v: boolean) => updateParams({ muslim: v ? "true" : null });
  const setShowFilters = (v: boolean) => updateParams({ filters: v ? "true" : null });
  const setSelectedGender = (v: string) => updateParams({ gender: v });
  const setStoreType = (v: string) => updateParams({ storeType: v });
"""

old_state_hooks_regex = r'const \[search, setSearch\][\s\S]*?const \[showFilters, setShowFilters\] = useState\(false\);'

content = re.sub(old_state_hooks_regex, state_hooks.strip(), content)

# 4. Filters logic
old_reset = """
  const resetFilters = () => {
    setSelectedState("");
    setMuslimFriendlyOnly(false);
  };
"""
new_reset = """
  const resetFilters = () => {
    updateParams({ state: null, muslim: null, gender: null, storeType: null });
  };
"""
content = content.replace(old_reset.strip(), new_reset.strip())

# 5. Filter application
old_filter_logic = """
      const matchMuslim =
        !muslimFriendlyOnly ||
        b.Locations.some((l) => l.is_muslim_friendly);
      return matchCategory && matchSearch && matchState && matchMuslim;
"""
new_filter_logic = """
      const matchMuslim =
        !muslimFriendlyOnly ||
        b.Locations.some((l) => l.is_muslim_friendly);
      
      const matchGender = !selectedGender || b.Products.some(p => p.product_gender === selectedGender || p.product_gender === "unisex");
      
      const matchStoreType = !storeType || 
        (storeType === "online" ? (b.Online && b.Online.length > 0) : (b.Locations && b.Locations.length > 0));

      return matchCategory && matchSearch && matchState && matchMuslim && matchGender && matchStoreType;
"""
content = content.replace(old_filter_logic.strip(), new_filter_logic.strip())

# Update filter dependencies
content = content.replace(
    '[selectedCategory, allBrands, search, selectedState, muslimFriendlyOnly]',
    '[selectedCategory, allBrands, search, selectedState, muslimFriendlyOnly, selectedGender, storeType]'
)

# 6. Filter count
content = content.replace(
    'const activeFilterCount = (selectedState ? 1 : 0) + (muslimFriendlyOnly ? 1 : 0);',
    'const activeFilterCount = (selectedState ? 1 : 0) + (muslimFriendlyOnly ? 1 : 0) + (selectedGender ? 1 : 0) + (storeType ? 1 : 0);'
)
content = content.replace(
    'const hasActiveFilters = !!selectedState || muslimFriendlyOnly;',
    'const hasActiveFilters = !!selectedState || muslimFriendlyOnly || !!selectedGender || !!storeType;'
)

# 7. Render new filters in component
old_muslim_btn = """
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMuslimFriendlyOnly(!muslimFriendlyOnly)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      muslimFriendlyOnly
                        ? "bg-primary text-primary-foreground"
                        : "bg-tag text-tag-foreground hover:bg-primary/10"
                    }`}
                  >
                    ☪ Muslim-Friendly sahaja
                  </button>
                </div>
"""
new_filters_ui = """
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="space-y-2">
                       <h3 className="text-sm font-semibold text-muted-foreground mr-3">Platform</h3>
                       <div className="flex flex-wrap gap-2">
                          <button onClick={() => setStoreType(storeType === "fizikal" ? "" : "fizikal")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${storeType === "fizikal" ? "bg-primary text-primary-foreground" : "bg-tag text-tag-foreground hover:bg-primary/10"}`}>Fizikal sahaja</button>
                          <button onClick={() => setStoreType(storeType === "online" ? "" : "online")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${storeType === "online" ? "bg-primary text-primary-foreground" : "bg-tag text-tag-foreground hover:bg-primary/10"}`}>Online sahaja</button>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-sm font-semibold text-muted-foreground mr-3">Jantina Produk (Pakaian)</h3>
                       <div className="flex flex-wrap gap-2">
                          <button onClick={() => setSelectedGender(selectedGender === "lelaki" ? "" : "lelaki")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGender === "lelaki" ? "bg-primary text-primary-foreground" : "bg-tag text-tag-foreground hover:bg-primary/10"}`}>Lelaki</button>
                          <button onClick={() => setSelectedGender(selectedGender === "perempuan" ? "" : "perempuan")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGender === "perempuan" ? "bg-primary text-primary-foreground" : "bg-tag text-tag-foreground hover:bg-primary/10"}`}>Perempuan</button>
                          <button onClick={() => setSelectedGender(selectedGender === "unisex" ? "" : "unisex")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGender === "unisex" ? "bg-primary text-primary-foreground" : "bg-tag text-tag-foreground hover:bg-primary/10"}`}>Unisex</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMuslimFriendlyOnly(!muslimFriendlyOnly)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        muslimFriendlyOnly
                          ? "bg-primary text-primary-foreground"
                          : "bg-tag text-tag-foreground hover:bg-primary/10"
                      }`}
                    >
                      ☪ Muslim-Friendly sahaja
                    </button>
                  </div>
                </div>
"""
content = content.replace(old_muslim_btn.strip(), new_filters_ui.strip())

with codecs.open('src/pages/Index.tsx', 'w', 'utf-8') as f:
    f.write(content)
