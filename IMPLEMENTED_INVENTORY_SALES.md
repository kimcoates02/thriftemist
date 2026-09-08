# THRIFTEMIST inventory/sales update

Updated from the latest `Thriftemist-inventory-sales-update 5 .zip`.

## Changes
- Admin edit form exposes Available / Reserved / Sold / Archived.
- Sold products require a sales channel: Offline Store, Instagram, WhatsApp, Website, Other.
- Admin-only cost price, sold price, sold date/time and internal notes remain internal.
- Source is explicitly submitted as Vintage / Surplus / New.
- Status and source are explicitly submitted by the form.
- Non-sold statuses clear sold channel/price/date before saving.
- Sold status forces quantity to 0.
- If a previously sold/archived item is returned to Available/Reserved with quantity 0, quantity is restored to 1.
- Invalid sold date/time is rejected cleanly.
- Existing API route `/api/admin/products/[id]` is preserved.

## Database
Use the existing migration:
`supabase/migrations/20260828_inventory_sales_tracking.sql`

No secrets are included in this archive.
