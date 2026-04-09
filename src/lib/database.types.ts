// TypeScript types that mirror the Supabase schema exactly.
// operation_hours is stored as JSONB with shape { monday: "9AM-9PM", ... }

export type BrandCategory =
  | "clothing"
  | "local-service"
  | "home-bakery"
  | "cafe"
  | "photography"
  | "others";

export interface DBBrand {
  brand_id: number;
  created_at: string;
  brand_name: string | null;
  brand_description: string | null;
  brand_category: BrandCategory | null;
}

export interface DBLocation {
  location_id: number;
  created_at: string;
  lot_number: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  state: string | null;
  latitude: string | null;
  longitude: string | null;
  waze_link: string | null;
  googlemap_link: string | null;
  operation_hours: Record<string, string> | null;
  phone_number: string | null;
  payment_methods: string | null;
  parking_remarks: string | null;
  is_muslim_friendly: boolean | null;
  updated_at: string | null;
  brand_id: number | null;
}

export interface DBProduct {
  product_id: number;
  created_at: string;
  product_type: string | null;
  product_description: string | null;
  product_gender: string | null;
  brand_id: number | null;
}

export interface DBOnline {
  online_id: number;
  created_at: string;
  facebook_link: string | null;
  instagram_link: string | null;
  tiktok_link: string | null;
  website_link: string | null;
  additional_link: string | null;
  updated_at: string | null;
  brand_id: number | null;
}

export interface BrandWithDetails extends DBBrand {
  Locations: DBLocation[];
  Products: DBProduct[];
  Online: DBOnline[];
}

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
] as const;
