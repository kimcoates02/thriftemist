export type ProductSource =
  | "vintage"
  | "surplus"
  | "new";

export type ProductStatus =
  | "available"
  | "reserved"
  | "sold"
  | "archived";

export type ProductVariantStatus =
  | "available"
  | "sold"
  | "archived";

/*
|--------------------------------------------------------------------------
| PRODUCT VARIANT
|--------------------------------------------------------------------------
|
| Every colour/size combination is an independent inventory item.
|
| Example:
|
| Black / M / Qty 10
| Black / L / Qty 8
| White / M / Qty 12
|
*/

export type ProductVariant = {
  id: string;

  product_id: string;

  sku: string;

  size?: string | null;

  colour?: string | null;

  quantity: number;

  cost_price: number;

  selling_price: number;

  status: ProductVariantStatus;

  created_at?: string;

  updated_at?: string;
};


/*
|--------------------------------------------------------------------------
| PRODUCT
|--------------------------------------------------------------------------
*/

export type Product = {
  id: string;

  slug: string;

  name: string;

  /*
   * Legacy/base selling price.
   *
   * For products with variants, the actual selected
   * variant price comes from ProductVariant.selling_price.
   */
  price: number;

  brand?: string | null;

  category: string;

  source: ProductSource;

  /*
   * Legacy product-level fields.
   *
   * These are retained for compatibility with existing
   * products and existing parts of the website.
   */
  size?: string | null;

  colour?: string | null;

  condition: string;

  description?: string | null;

  material?: string | null;

  measurements?: Record<string, string> | null;

  status: ProductStatus;

  /*
   * Legacy/base quantity.
   *
   * For variant products, total inventory will eventually
   * be derived from the variants.
   */
  quantity: number;

  sku?: string | null;

  tags?: string[] | null;

  drop_id?: string | null;

  created_at?: string;

  product_images?: {
    id: string;
    url: string;
    sort_order: number;
  }[];

  /*
  |--------------------------------------------------------------------------
  | VARIANTS
  |--------------------------------------------------------------------------
  |
  | One-of-one vintage product:
  | one variant.
  |
  | Bulk/size/colour product:
  | multiple variants.
  |
  */

  variants?: ProductVariant[];
};