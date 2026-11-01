/*
  Bow Service Marketplace: settings
  Edit this file when your Google Sheet, contact details, or categories change.
  The Google Sheet must be shared as "Anyone with the link can view".
*/
window.STORE_CONFIG = {
  storeName: "Bow Service Marketplace",
  tagline: "Private Finds • Local Deals • Collectibles",
  storeSubtitle: "Local finds, private sale listings, collectibles, and Bow Service marketplace items, all priced below Amazon.",

  sheetId: "1U9WIQvFk4uh7jxTdREpMRE4OVuHxTW4EunUnd_xMCYk",
  sheetName: "Inventory",
  sheetGid: 0,   // the Inventory tab's gid (number after #gid= in the sheet address); used as a backup

  currency: "USD",

  // Who runs the marketplace and where. Shown on the home page, About page and footer.
  business: {
    operator: "Bow Service / Potter Service",
    city: "Sevierville",
    state: "Tennessee"
  },

  // AVAILABILITY: while inventory is being redone, availability is hidden everywhere
  // (no Available / Sold / On order tags, every item is listed). Set to true to turn it back on.
  showAvailability: false,

  // Short notice shown at the top of every page. Leave "" to hide it.
  notice: "We’re moving to a new warehouse, so item availability isn’t shown right now. Please ask before buying!",

  contact: {
    sellerName: "Bow Service",
    email: "",
    phone: "",
    facebook: ""
  },

  // Items added within this many days count as "New".
  newArrivalDays: 30,

  // Categories that need an 18+ confirmation before they're shown.
  adultCategories: ["Adult"],

  // Categories never shown on the public site (match ignores upper/lower case). Example: ["Store use"]
  hiddenCategories: [],

  // Fix spelling / merge duplicate category names from the sheet. Left side = what's in the sheet.
  // Upper/lower case and extra spaces are already merged automatically (e.g. "STORE USE" = "Store USE").
  categoryAliases: {
    "Colelction": "Collection",
    "Kithen": "Kitchen",
    "Flasklight": "Flashlight",
    "Skirts": "Skirt",
    "Toys": "Toy",
    "Books": "Book",
    "Bags": "Bag",
    "Networking": "Network",
    "Games": "Gaming",
    "Game": "Gaming",
    "Lights": "Light",
    "Bow": "Bow items",
    "Store": "Store use",
    "": "Other"
  },

  // How each "Available" status from the sheet is shown. Anything not listed is shown as-is.
  statusLabels: {
    "available": { label: "Available", tone: "ok" },
    "ordered": { label: "On order", tone: "info", note: "Ordered and on the way" },
    "processing": { label: "Processing", tone: "info", note: "Being checked in" },
    "reserved": { label: "Reserved", tone: "warn", note: "Held for a buyer" },
    "sold": { label: "Sold", tone: "muted" }
  }
};
