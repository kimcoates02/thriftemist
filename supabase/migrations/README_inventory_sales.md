# THRIFTEMIST inventory & sales tracking

Run `20260828_inventory_sales_tracking.sql` in Supabase after the existing product-source migration.

It adds the `reserved` product status and admin-only sales fields: cost price, sold price, sold channel, sold timestamp and internal notes. It also adds `order_source` to orders.

The customer data access layer intentionally selects only public product fields, so admin-only sales/cost notes are not sent to customer pages.
