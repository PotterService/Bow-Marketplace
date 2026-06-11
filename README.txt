Bow Service Marketplace PUBLIC v3 MULTIPAGE

Included pages:
- index.html
- pages/item.html
- pages/deals.html
- pages/wishlist.html
- pages/cart.html
- pages/contact.html
- pages/login.html
- pages/terms.html

Important behavior:
- Sheet tab name is Inventory.
- Only items where the Available column is exactly marked "sold" are hidden by default.
- Other statuses like reserved, available, pending, processing, etc. still display.
- Sold items can be shown with the "See sold items" checkbox on the storefront.
- Sold item pages show a sold notice and Buy on Amazon button if Amazon Link exists.
- Similar items exclude sold items.
- Adult category asks for 18+ confirmation.
- README files stay inside the ZIP and are not linked in the public site nav.


V4 FIXES
--------
- Featured deals now display as styled cards instead of plain blue links.
- Available counter subtracts items where Available is exactly "sold".
- Blank Sale Price shows "Contact for pricing".
- Item pages now use a main image carousel with thumbnail navigation.


V5 SOLD COUNTER FIX
-------------------
- Sheet column lookup is now more forgiving.
- Available counter now uses the normalized Available status.
- It will detect sold even if the sheet cell says "Sold", " sold ", or the header has extra spacing.


V6 MOBILE + CATEGORIES
----------------------
- Fixed mobile header/search bar so it should not force sideways scrolling.
- Added pages/categories.html.
- Added Select Category button near Featured Deals.
- Category cards open the storefront with the selected category applied.
- Homepage stays cleaner for easier phone browsing.


V7 BROWSE MODAL + MOBILE FIXES
------------------------------
- Browse Marketplace now asks whether to browse all items or select a category.
- Browse all scrolls to current listings.
- Select a category opens the categories page.
- Added stronger no-horizontal-scroll mobile CSS across all pages.


V8 CATEGORY FIX
---------------
- Category page now saves the selected category before redirecting.
- Homepage now reads the selected category from the URL or temporary localStorage.
- The selected category remains applied and the page scrolls to listings.
