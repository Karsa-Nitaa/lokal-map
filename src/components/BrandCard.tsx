import { MapPin } from "lucide-react";
import type { BrandWithDetails } from "@/lib/database.types";

interface BrandCardProps {
  brand: BrandWithDetails;
  index: number;
  onClick: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  clothing: "Clothing",
  "local-service": "Local Service",
  "home-bakery": "Home Bakery",
  cafe: "Cafe",
  photography: "Photography",
  others: "Others",
};

const BrandCard = ({ brand, index, onClick }: BrandCardProps) => {
  const primaryLocation = brand.Locations[0];
  const locationLabel = [primaryLocation?.city, primaryLocation?.state]
    .filter(Boolean)
    .join(", ");
  const isMuslimFriendly = brand.Locations.some((l) => l.is_muslim_friendly);
  const hasOnline = brand.Online && brand.Online.length > 0;
  const hasPhysical = brand.Locations.length > 0;
  const productTypes = [
    ...new Set(brand.Products.map((p) => p.product_type).filter(Boolean)),
  ] as string[];
  const categoryLabel = brand.brand_category
    ? CATEGORY_LABEL[brand.brand_category] ?? brand.brand_category
    : null;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full flex flex-col rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Top stripe */}
      <div className="h-1 w-full bg-primary shrink-0" />

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-tight group-hover:text-primary transition-colors truncate">
              {brand.brand_name}
            </h3>
            {locationLabel ? (
              <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
            ) : hasOnline ? (
              <span className="text-xs text-muted-foreground mt-0.5">Online only</span>
            ) : null}
          </div>
          {categoryLabel && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0 whitespace-nowrap">
              {categoryLabel}
            </span>
          )}
        </div>

        {/* Description — fixed 2 lines so cards stay same height */}
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {brand.brand_description || "Tiada deskripsi."}
        </p>

        {/* Product tags */}
        {productTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {productTypes.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-tag text-tag-foreground font-medium"
              >
                {tag}
              </span>
            ))}
            {productTypes.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                +{productTypes.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/60">
          {hasPhysical && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              Physical
            </span>
          )}
          {hasOnline && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              Online
            </span>
          )}
          {isMuslimFriendly && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-primary/30 text-primary">
              Muslim-Friendly
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default BrandCard;
