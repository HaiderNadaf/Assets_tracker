/**
 * Starter catalogue for the "select product" dropdown. Anything already saved in
 * the database is merged in at runtime, and the field also accepts free text.
 */
export const PRODUCT_CATALOGUE: { category: string; products: string[] }[] = [
  {
    category: "Laptop",
    products: [
      "Dell Laptop",
      "Dell Latitude 5440",
      "HP EliteBook 840",
      "Lenovo ThinkPad E14",
      "MacBook Air M2",
      "MacBook Pro 14",
    ],
  },
  {
    category: "Desktop",
    products: ["Dell OptiPlex 7010", "HP ProDesk 400", "Custom Workstation", "iMac 24"],
  },
  {
    category: "Monitor",
    products: ['Dell 24" Monitor', 'LG 27" UltraFine', 'Samsung 32" Curved', "BenQ GW2480"],
  },
  {
    category: "Mobile",
    products: ["iPhone 14", "Samsung Galaxy S23", "OnePlus 11", "Redmi Note 13"],
  },
  {
    category: "Peripheral",
    products: ["Logitech MX Keys", "Logitech MX Master 3", "Docking Station", "Headset"],
  },
  {
    category: "Printer",
    products: ["HP LaserJet Pro", "Canon ImageRunner", "Epson EcoTank"],
  },
  {
    category: "Networking",
    products: ["Cisco Switch 24-Port", "TP-Link Router", "Ubiquiti Access Point", "UPS 2KVA"],
  },
  {
    category: "Furniture",
    products: ["Office Chair", "Work Desk", "Storage Cabinet", "Conference Table"],
  },
  {
    category: "Vehicle",
    products: ["Company Car", "Delivery Van", "Two Wheeler"],
  },
  {
    category: "Other",
    products: ["Air Conditioner", "Projector", "CCTV Camera", "Water Purifier"],
  },
];

export const ALL_PRODUCTS = PRODUCT_CATALOGUE.flatMap((g) => g.products);

/** Reverse lookup so picking a product auto-fills its category. */
export const PRODUCT_CATEGORY = new Map(
  PRODUCT_CATALOGUE.flatMap((g) => g.products.map((p) => [p, g.category] as const))
);

export const CATEGORIES = PRODUCT_CATALOGUE.map((g) => g.category);

export const DEPARTMENTS = [
  "Accounts",
  "Administration",
  "Engineering",
  "Field Operations",
  "Human Resources",
  "Legal",
  "Marketing",
  "Procurement",
  "Sales",
  "Support",
];

export const LOCATIONS = [
  "Head Office",
  "Bengaluru Office",
  "Chennai Office",
  "Hyderabad Office",
  "Mumbai Office",
  "Pune Office",
  "Warehouse",
  "Remote / Work From Home",
];

export const PAGE_SIZES = [10, 20, 50, 100];

/* ------------------------------------------------------------------ */
/* Purchase orders                                                     */
/* ------------------------------------------------------------------ */

/**
 * Buyer blocks per company, mirroring the backend defaults.
 *
 * The form pre-fills from here and the value is then stored on the order, so an
 * order issued today keeps this address even if the company later moves.
 */
export const BUYER_PROFILES: Record<string, { name: string; address: string; gstNumber: string }> = {
  GCC: {
    name: "Gold Coins Club & Resort",
    address:
      "SY NO. 45/1, ANDAPURA VILLAGE, ATTIBELE HOBLI, ANEKAL TALUK, ELECTRONIC CITY POST, Bengaluru (Bangalore) Urban, Karnataka, 560100",
    gstNumber: "29AAAAG1219N1ZM",
  },
  ENP: { name: "ENP Farms Pvt Ltd", address: "", gstNumber: "" },
};

/** Offered on the currency field; free text is accepted too. */
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

/** Seeded into a new order; every line stays editable. */
export const DEFAULT_PO_TERMS = [
  "Delivery: Within 3 Days after receipt with P.O & Approved drawing",
  "Payment: 50% Advance 50% against materials delivery at site.",
];

export const PO_UNITS = [
  "NOS",
  "Lot",
  "Set",
  "Box",
  "Pkt",
  "Kg",
  "Ltr",
  "Mtr",
  "RMT",
  "SQFT",
  "Hrs",
  "Days",
];

/* ------------------------------------------------------------------ */
/* Vendors                                                             */
/* ------------------------------------------------------------------ */

/**
 * Starter suggestions for the vendor category field. Free text underneath -
 * typing anything not on this list just adds a new category, the same way
 * PO_CATEGORIES below offers suggestions without limiting what can be typed.
 */
export const VENDOR_CATEGORIES = [
  "Steel & Structural",
  "Cement & Civil",
  "Electrical & MEP",
  "Plumbing & Sanitary",
  "Cladding & Roofing",
  "Furniture & Furnishings",
  "Housekeeping & Sanitation",
  "Kitchen & F&B Supplies",
  "IT & Networking",
  "Office & Stationery",
  "Transportation & Logistics",
  "Farm & Agriculture Inputs",
  "General",
];

/** Common hospital purchase heads, offered as suggestions on the line rows. */
export const PO_CATEGORIES = [
  "Medical Equipment",
  "Surgical Consumables",
  "Pharmacy & Drugs",
  "Diagnostics & Lab",
  "Patient Furniture",
  "Linen & Uniforms",
  "Housekeeping & Sanitation",
  "Kitchen & Dietary",
  "Civil & Interiors",
  "Electrical & MEP",
  "IT & Networking",
  "Office & Stationery",
  "Biomedical Services",
  "Transportation Charges",
  "Installation Charges",
];
