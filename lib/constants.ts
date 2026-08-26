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
