# Bow Service Marketplace (v2)

The public inventory site for market.potterservice.com. A plain static site (no build step) that reads
inventory live from the Google Sheet set in `config.js`.

## Updating inventory
Edit the Google Sheet. The site picks up changes within about 2 minutes (browsers cache the sheet briefly).

## Settings: `config.js`
- `showAvailability`: **false right now** (warehouse move). Every item is listed with no Available / Sold / On order
  tags. Set to `true` once inventory is redone to bring back status tags, the sold toggle and the On order tabs.
- `notice`: the yellow bar at the top of every page. Set to `""` to remove it.
- `business`: operator name and city/state shown on the home, About and footer.
- `sheetId` / `sheetName`: which Google Sheet tab to read (must be shared "Anyone with the link can view").
- `contact`: email / phone / Facebook. **Fill these in.** They power the "Ask about this item" button and the Contact page.
- `adultCategories`: categories that need an 18+ confirmation.
- `hiddenCategories`: categories never shown publicly (e.g. `["Store use"]`).
- `categoryAliases`: fix typos and merge duplicate category names from the sheet.
- `statusLabels`: how each "Available" value is shown (e.g. "Ordered" shows as "On order").
- `newArrivalDays`: how recent an item must be to get the "New" badge.

## Files
- `index.html`: shop home (hero, top deals, just added, full shop with filters)
- `pages/`: item, deals, new-arrivals, categories, wishlist, contact, terms
- `assets/css/site.css`: all styling
- `assets/js/core.js`: shared code (sheet loading, header/footer, product cards, wishlist, age check)
- `assets/js/home.js`, `assets/js/pages.js`: page logic

## Sheet columns used
Item ID, Item Name, Category, Item Value (Amazon price), Description, Sale Price (Bow price), Internal Code,
Available (Available / Ordered / Processing / Reserved / Sold), Image URLs (comma separated), Amazon Link,
Date Added, Last Updated, Notes, Discount, and optional On Ebay / Ebay Link / Az.
