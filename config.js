/* 
  Bow Private Marketplace PRO
  Edit this file when your Google Sheet or sheet tab name changes.

  IMPORTANT:
  Your Google Sheet must be shared so visitors can view it.
  Recommended share setting: Anyone with the link can view.
*/

window.STORE_CONFIG = {
  storeName: "Bow Service Marketplace",
  storeSubtitle: "Local finds, private sale listings, collectibles, and Bow Service marketplace items.",
  sheetId: "1U9WIQvFk4uh7jxTdREpMRE4OVuHxTW4EunUnd_xMCYk",
  sheetName: "Inventory",

  // Uses opensheet.elk.sh for simple public Google Sheets JSON.
  // If it ever stops working, replace this with your own Apps Script API URL.
  dataMode: "opensheet",

  currency: "USD",
  defaultImage: "assets/placeholders/no-image.svg",

  contact: {
    sellerName: "Bow Service",
    email: "",
    phone: "",
    facebook: ""
  },

  features: {
    enableCart: true,
    enableWishlist: true,
    enableCompare: true,
    enableProductModal: true,
    enableAdminDashboard: true,
    enableExternalLinks: true
  }
};
