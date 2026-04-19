export type Category = "clothing" | "local-service" | "home-bakery" | "cafe" | "photography" | "others";

export interface Store {
  id: string;
  label: string; // e.g. "Flagship – Bangsar", "Outlet – Sunway Pyramid"
  location: string;
  address: string;
  googleMapsUrl: string;
  operatingHours: string;
  contactWhatsApp?: string;
  parkingInfo?: string;
}

export interface Brand {
  id: string;
  name: string;
  category: Category;
  description: string;
  location: string;
  address: string;
  googleMapsUrl: string;
  priceRange: "$" | "$$" | "$$$";
  styleTags: string[];
  genderCategory: ("Men" | "Women" | "Unisex" | "Kids")[];
  operatingHours: string;
  contactWhatsApp: string;
  parkingInfo: string;
  photos: string[];
  lastVerified: string;
  muslimFriendly: boolean;
  muslimFriendlyInfo?: string;
  paymentMethods: string[];
  onlineStoreUrl?: string;
  onlineStorePlatform?: string;
  area: string;
  stores?: Store[]; // for brands with multiple outlets
}

export const CATEGORIES = [
  { id: "clothing" as Category, label: "Fashion", emoji: "🛍️", available: true },
  { id: "local-service" as Category, label: "Local Service", emoji: "🎨", available: false },
  { id: "home-bakery" as Category, label: "Home Bakery", emoji: "🧁", available: false },
  { id: "cafe" as Category, label: "Cafe", emoji: "☕", available: false },
  { id: "photography" as Category, label: "Photography", emoji: "📷", available: false },
  { id: "others" as Category, label: "Others", emoji: "✨", available: false },
] as const;

export const CATEGORY_FILTERS: Record<string, {
  styleTags: readonly string[];
  genderOptions: readonly string[];
  areas: readonly string[];
}> = {
  clothing: {
    styleTags: [
      "Minimalist", "Streetwear", "Baju Kurung", "Vintage",
      "Oversized", "Casual", "Smart Casual", "Activewear",
      "Modest Wear", "Y2K", "Workwear", "Batik Modern",
    ],
    genderOptions: ["Men", "Women", "Unisex", "Kids"],
    areas: [
      "Kuala Lumpur", "Selangor", "Johor Bahru", "Penang",
      "Melaka", "Pahang", "Kelantan", "Terengganu",
    ],
  },
};

// kept for backwards compat
export const STYLE_TAGS = CATEGORY_FILTERS.clothing.styleTags;
export const GENDER_OPTIONS = CATEGORY_FILTERS.clothing.genderOptions;
export const AREAS = CATEGORY_FILTERS.clothing.areas;

export const brands: Brand[] = [
  {
    id: "1",
    category: "clothing",
    name: "Pestle & Mortar Clothing",
    description: "Malaysian streetwear pioneer blending urban aesthetics with local identity. Known for bold graphics and quality basics.",
    location: "Bangsar, KL",
    address: "Lot 1-03, Bangsar Village II, Jalan Telawi 1, Bangsar",
    googleMapsUrl: "https://maps.google.com/?q=Pestle+Mortar+Clothing+Bangsar",
    priceRange: "$$",
    styleTags: ["Streetwear", "Casual", "Oversized"],
    genderCategory: ["Men", "Women", "Unisex"],
    operatingHours: "10:00 AM - 9:00 PM",
    contactWhatsApp: "60123456789",
    parkingInfo: "Parking senang — Bangsar Village ada underground parking",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Fitting room selesa, surau ada dalam mall",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://pestlemortar.com",
    onlineStorePlatform: "Website",
    area: "Kuala Lumpur",
    stores: [
      {
        id: "1-1",
        label: "Flagship – Bangsar Village II",
        location: "Bangsar, KL",
        address: "Lot 1-03, Bangsar Village II, Jalan Telawi 1, Bangsar",
        googleMapsUrl: "https://maps.google.com/?q=Pestle+Mortar+Clothing+Bangsar",
        operatingHours: "10:00 AM - 9:00 PM",
        contactWhatsApp: "60123456789",
        parkingInfo: "Bangsar Village ada underground parking",
      },
      {
        id: "1-2",
        label: "Outlet – Pavilion KL",
        location: "Bukit Bintang, KL",
        address: "Lot 4.01, Level 4, Pavilion Kuala Lumpur",
        googleMapsUrl: "https://maps.google.com/?q=Pestle+Mortar+Clothing+Pavilion+KL",
        operatingHours: "10:00 AM - 10:00 PM",
        parkingInfo: "Pavilion ada multi-level parking",
      },
    ],
  },
  {
    id: "2",
    category: "clothing",
    name: "Nala Designs",
    description: "Artisanal batik brand known for contemporary prints on modern silhouettes. Every piece tells a story of Malaysian heritage.",
    location: "Publika, KL",
    address: "Lot 25, Level G2, Publika Shopping Gallery",
    googleMapsUrl: "https://maps.google.com/?q=Nala+Designs+Publika",
    priceRange: "$$$",
    styleTags: ["Batik Modern", "Minimalist", "Modest Wear"],
    genderCategory: ["Women", "Unisex"],
    operatingHours: "10:00 AM - 8:00 PM",
    contactWhatsApp: "60198765432",
    parkingInfo: "Publika parking RM2/entry on weekends, senang cari",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Fitting room luas & private, surau di Level 1",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://shopee.com.my/naladesigns",
    onlineStorePlatform: "Shopee",
    area: "Kuala Lumpur"
  },
  {
    id: "3",
    category: "clothing",
    name: "Kapten Batik",
    description: "Revolutionizing batik for the modern man. Premium batik shirts perfect for office or weekend brunch.",
    location: "KLCC, KL",
    address: "Lot 114, Level 1, Suria KLCC",
    googleMapsUrl: "https://maps.google.com/?q=Kapten+Batik+Suria+KLCC",
    priceRange: "$$$",
    styleTags: ["Batik Modern", "Smart Casual", "Workwear"],
    genderCategory: ["Men"],
    operatingHours: "10:00 AM - 10:00 PM",
    contactWhatsApp: "60112233445",
    parkingInfo: "KLCC parking besar tapi peak hour packed — datang awal",
    photos: [],
    lastVerified: "Jan 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Surau besar dalam KLCC, fitting room private",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://kaptenbatik.com",
    onlineStorePlatform: "Website",
    area: "Kuala Lumpur"
  },
  {
    id: "4",
    category: "clothing",
    name: "Oxwhite",
    description: "Direct-to-consumer basics brand offering premium quality at honest prices. Famous for their white shirts and polo tees.",
    location: "Petaling Jaya, Selangor",
    address: "Unit 3A-1, Level 3A, Sunway Nexis, Kota Damansara",
    googleMapsUrl: "https://maps.google.com/?q=Oxwhite+Sunway+Nexis",
    priceRange: "$",
    styleTags: ["Minimalist", "Smart Casual", "Workwear"],
    genderCategory: ["Men", "Women"],
    operatingHours: "10:00 AM - 7:00 PM",
    contactWhatsApp: "60176543210",
    parkingInfo: "Free parking depan kedai, senang",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Fitting room ada, surau dekat area Sunway Nexis",
    paymentMethods: ["QR Pay", "Card"],
    onlineStoreUrl: "https://oxwhite.com",
    onlineStorePlatform: "Website",
    area: "Selangor"
  },
  {
    id: "5",
    category: "clothing",
    name: "Wak Doyok",
    description: "From grooming to fashion — Wak Doyok's clothing line brings rugged vintage charm with a Malaysian twist.",
    location: "Bangi, Selangor",
    address: "Lot 2-15, Evo Mall, Bandar Baru Bangi",
    googleMapsUrl: "https://maps.google.com/?q=Wak+Doyok+Evo+Mall+Bangi",
    priceRange: "$$",
    styleTags: ["Vintage", "Casual", "Streetwear"],
    genderCategory: ["Men"],
    operatingHours: "10:00 AM - 9:00 PM",
    contactWhatsApp: "60139876543",
    parkingInfo: "Evo Mall ada covered parking, senang",
    photos: [],
    lastVerified: "Jan 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Surau dalam mall",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    area: "Selangor"
  },
  {
    id: "6",
    category: "clothing",
    name: "Vivy Yusof — dUCk",
    description: "Fashion-forward modest wear brand by Vivy Yusof. From scarves to ready-to-wear, dUCk is all about fun, feminine style.",
    location: "Pavilion KL",
    address: "Lot 3.02.01, Level 3, Pavilion Kuala Lumpur",
    googleMapsUrl: "https://maps.google.com/?q=dUCk+Pavilion+KL",
    priceRange: "$$$",
    styleTags: ["Modest Wear", "Smart Casual", "Minimalist"],
    genderCategory: ["Women"],
    operatingHours: "10:00 AM - 10:00 PM",
    contactWhatsApp: "60181234567",
    parkingInfo: "Pavilion ada multi-level parking, plan datang awal weekend",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Fitting room sangat selesa, surau cantik di Level 2",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://theduck.co",
    onlineStorePlatform: "Website",
    area: "Kuala Lumpur",
    stores: [
      {
        id: "6-1",
        label: "Flagship – Pavilion KL",
        location: "Pavilion KL",
        address: "Lot 3.02.01, Level 3, Pavilion Kuala Lumpur",
        googleMapsUrl: "https://maps.google.com/?q=dUCk+Pavilion+KL",
        operatingHours: "10:00 AM - 10:00 PM",
        contactWhatsApp: "60181234567",
        parkingInfo: "Pavilion ada multi-level parking, plan datang awal weekend",
      },
      {
        id: "6-2",
        label: "Outlet – Mid Valley",
        location: "Mid Valley, KL",
        address: "Lot 2.54, Level 2, Mid Valley Megamall",
        googleMapsUrl: "https://maps.google.com/?q=dUCk+Mid+Valley",
        operatingHours: "10:00 AM - 10:00 PM",
        parkingInfo: "Mid Valley parking besar, weekend packed",
      },
      {
        id: "6-3",
        label: "Outlet – Sunway Pyramid",
        location: "Sunway, Selangor",
        address: "Lot LG2.106, Lower Ground 2, Sunway Pyramid",
        googleMapsUrl: "https://maps.google.com/?q=dUCk+Sunway+Pyramid",
        operatingHours: "10:00 AM - 10:00 PM",
        parkingInfo: "Sunway Pyramid parking luas",
      },
    ],
  },
  {
    id: "7",
    category: "clothing",
    name: "Masai",
    description: "Y2K-inspired streetwear for the youth. Bold colors, chunky silhouettes, and unapologetic self-expression.",
    location: "SS15 Subang Jaya",
    address: "52, Jalan SS15/4, Subang Jaya",
    googleMapsUrl: "https://maps.google.com/?q=SS15+Subang+Jaya",
    priceRange: "$",
    styleTags: ["Y2K", "Streetwear", "Oversized"],
    genderCategory: ["Unisex"],
    operatingHours: "12:00 PM - 9:00 PM",
    contactWhatsApp: "60145678901",
    parkingInfo: "Parking susah — street parking je, datang motor lagi best",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: false,
    paymentMethods: ["QR Pay", "Cash"],
    onlineStoreUrl: "https://shopee.com.my/masai",
    onlineStorePlatform: "Shopee",
    area: "Selangor"
  },
  {
    id: "8",
    category: "clothing",
    name: "Jelita Wardrobe",
    description: "Elegant baju kurung and kebaya with a modern twist. Perfect for Raya, nikah, or any special occasion.",
    location: "Shah Alam, Selangor",
    address: "No 15, Jalan Plumbum V 7/V, Seksyen 7, Shah Alam",
    googleMapsUrl: "https://maps.google.com/?q=Shah+Alam+Seksyen+7",
    priceRange: "$$",
    styleTags: ["Baju Kurung", "Modest Wear", "Smart Casual"],
    genderCategory: ["Women"],
    operatingHours: "10:00 AM - 7:00 PM (Closed Sundays)",
    contactWhatsApp: "60167890123",
    parkingInfo: "Parking depan kedai free, luas",
    photos: [],
    lastVerified: "Jan 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Full privacy fitting room, surau 5 min jalan kaki",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://tiktok.com/@jelitawardrobe",
    onlineStorePlatform: "TikTok Shop",
    area: "Selangor"
  },
  {
    id: "9",
    category: "clothing",
    name: "Youthcraft Studio",
    description: "Underground streetwear collective creating limited drops with hand-drawn art. Each piece is a wearable canvas.",
    location: "George Town, Penang",
    address: "23, Lebuh Armenian, George Town",
    googleMapsUrl: "https://maps.google.com/?q=Lebuh+Armenian+Penang",
    priceRange: "$$",
    styleTags: ["Streetwear", "Vintage", "Casual"],
    genderCategory: ["Men", "Unisex"],
    operatingHours: "11:00 AM - 8:00 PM",
    contactWhatsApp: "60191234567",
    parkingInfo: "Street parking only — dekat dengan Jetty LRT, jalan kaki best",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: false,
    paymentMethods: ["QR Pay", "Cash"],
    area: "Penang"
  },
  {
    id: "10",
    category: "clothing",
    name: "Lubna",
    description: "Modest fashion powerhouse with a global reach. Known for elegant cuts, earthy tones, and modest yet trendy designs.",
    location: "Mid Valley, KL",
    address: "Lot S-033, Level 2, Mid Valley Megamall",
    googleMapsUrl: "https://maps.google.com/?q=Lubna+Mid+Valley",
    priceRange: "$$",
    styleTags: ["Modest Wear", "Minimalist", "Smart Casual"],
    genderCategory: ["Women"],
    operatingHours: "10:00 AM - 10:00 PM",
    contactWhatsApp: "60123451234",
    parkingInfo: "Mid Valley parking besar, tapi weekend memang packed",
    photos: [],
    lastVerified: "Feb 2026",
    muslimFriendly: true,
    muslimFriendlyInfo: "Fitting room private & luas, surau tersedia",
    paymentMethods: ["QR Pay", "Card", "Cash"],
    onlineStoreUrl: "https://lubna.co",
    onlineStorePlatform: "Website",
    area: "Kuala Lumpur"
  },
];
