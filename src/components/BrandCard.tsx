import { MapPin } from "lucide-react";
import type { BrandWithDetails } from "@/lib/database.types";

interface BrandCardProps {
  brand: BrandWithDetails;
  index: number;
  onClick: () => void;
}

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

  return (
    <button
      onClick={onClick}
      className="group text-left w-full rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Color accent bar */}
      <div className="h-2 bg-primary" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-bold group-hover:text-accent transition-colors">
              {brand.brand_name}
            </h3>
            {locationLabel && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
                <MapPin className="w-3 h-3" />
                {locationLabel}
              </div>
            )}
          </div>
          {brand.Locations.length > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium shrink-0">
              {brand.Locations.length} lokasi
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {brand.brand_description || "—"}
        </p>

        {/* Product type tags */}
        {productTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {productTypes.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-tag text-tag-foreground font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer badges */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {hasOnline && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
              🌐 Online
            </span>
          )}
          {hasPhysical && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-tag text-tag-foreground font-medium">
              🏪 Fizikal
            </span>
          )}
          {isMuslimFriendly && (
            <span className="text-xs text-primary font-medium">
              ☪ Muslim-Friendly
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default BrandCard;
