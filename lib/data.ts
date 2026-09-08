import { supabaseServer } from "@/lib/supabase-server";
import type {
  Product,
  ProductVariant,
} from "@/lib/types";

/*
|--------------------------------------------------------------------------
| PRODUCT SELECT
|--------------------------------------------------------------------------
|
| Customer-facing product data.
|
| IMPORTANT:
| cost_price is intentionally NOT selected here.
| It must never be exposed through customer-facing queries.
|
*/

const PRODUCT_SELECT = `
  id,
  slug,
  name,
  price,
  brand,
  category,
  source,
  size,
  colour,
  condition,
  description,
  material,
  measurements,
  status,
  quantity,
  drop_id,
  created_at,
  product_images (
  id,
  url,
  sort_order,
  variant_colour
),
  product_variants (
    id,
    product_id,
    sku,
    size,
    colour,
    quantity,
    selling_price,
    status,
    created_at,
    updated_at
  )
`;


/*
|--------------------------------------------------------------------------
| NORMALIZE VARIANTS
|--------------------------------------------------------------------------
|
| Supabase/Postgres numeric values can sometimes arrive as strings.
| Convert numeric inventory values into real JavaScript numbers.
|
*/

function normalizeVariants(
  variants: unknown
): ProductVariant[] {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants.map((variant) => {
    const item = variant as Record<string, unknown>;

    return {
      id: String(item.id),
      product_id: String(item.product_id),
      sku: String(item.sku || ""),
      size:
        item.size === null || item.size === undefined
          ? null
          : String(item.size),
      colour:
        item.colour === null || item.colour === undefined
          ? null
          : String(item.colour),
      quantity: Number(item.quantity ?? 0),
      cost_price: 0,
      selling_price: Number(
        item.selling_price ?? 0
      ),
      status:
        item.status === "sold"
          ? "sold"
          : item.status === "archived"
            ? "archived"
            : "available",
      created_at:
        item.created_at === null ||
        item.created_at === undefined
          ? undefined
          : String(item.created_at),
      updated_at:
        item.updated_at === null ||
        item.updated_at === undefined
          ? undefined
          : String(item.updated_at),
    };
  });
}


/*
|--------------------------------------------------------------------------
| NORMALIZE PRODUCT
|--------------------------------------------------------------------------
*/

function normalizeProduct(
  product: Record<string, unknown>
): Product {
  return {
    ...(product as unknown as Product),

    price: Number(product.price ?? 0),

    quantity: Number(
      product.quantity ?? 0
    ),

    variants: normalizeVariants(
      product.product_variants
    ),
  };
}


/*
|--------------------------------------------------------------------------
| ACTIVE DROP
|--------------------------------------------------------------------------
*/

export async function getActiveDrop() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("drops")
    .select(
      "id,name,drop_number,description,status,published,created_at"
    )
    .eq("status", "active")
    .eq("published", true)
    .order("drop_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "GET ACTIVE DROP ERROR:",
      error
    );

    return null;
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
|
| Used by:
| /shop
| /latest-drop
| homepage sections
| category pages
|
*/

export async function getProducts(
  opts: {
    status?: string;
    limit?: number;
    search?: string;
    category?: string;
    source?:
      | "vintage"
      | "surplus"
      | "new";
    dropId?: string;
  } = {}
) {
  const supabase = await supabaseServer();

  let q = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", {
      ascending: false,
    });

  if (opts.status) {
    q = q.eq(
      "status",
      opts.status
    );
  }

  if (opts.category) {
    q = q.eq(
      "category",
      opts.category
    );
  }

  if (opts.source) {
    q = q.eq(
      "source",
      opts.source
    );
  }

  if (opts.dropId) {
    q = q.eq(
      "drop_id",
      opts.dropId
    );
  }

  if (opts.search) {
    q = q.or(
      `name.ilike.%${opts.search}%,brand.ilike.%${opts.search}%,category.ilike.%${opts.search}%`
    );
  }

  if (opts.limit) {
    q = q.limit(
      opts.limit
    );
  }

  const {
    data,
    error,
  } = await q;

  if (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return [];
  }

  return (data || []).map(
    (product) =>
      normalizeProduct(
        product as Record<string, unknown>
      )
  );
}


/*
|--------------------------------------------------------------------------
| SINGLE PRODUCT
|--------------------------------------------------------------------------
|
| Used by:
| /shop/[slug]
|
*/

export async function getProduct(
  slug: string
) {
  const supabase = await supabaseServer();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(
      "GET PRODUCT ERROR:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return normalizeProduct(
    data as Record<string, unknown>
  );
}


/*
|--------------------------------------------------------------------------
| AVAILABLE CATEGORIES
|--------------------------------------------------------------------------
|
| Used for customer-facing shop/category filters.
|
| Only categories with at least one AVAILABLE
| product are returned.
|
*/

export async function getAvailableCategories(): Promise<
  string[]
> {
  const supabase =
    await supabaseServer();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("category")
    .eq("status", "available")
    .not("category", "is", null)
    .order("category", {
      ascending: true,
    });

  if (error) {
    console.error(
      "GET AVAILABLE CATEGORIES ERROR:",
      error
    );

    return [];
  }

  const categories: string[] =
    Array.from(
      new Set<string>(
        (data || [])
          .map(
            (
              item: {
                category?: string | null;
              }
            ) =>
              String(
                item.category || ""
              ).trim()
          )
          .filter(
            (
              category: string
            ) =>
              Boolean(category)
          )
      )
    );

  return categories;
}


/*
|--------------------------------------------------------------------------
| FEATURED CATEGORIES
|--------------------------------------------------------------------------
|
| Automatically builds the homepage
| Featured Categories section.
|
| Rules:
|
| 1. Only AVAILABLE products are considered.
| 2. A category appears only if it has an available product.
| 3. Each category appears only once.
| 4. The newest available product supplies the image.
| 5. If the last available product is sold,
|    that category automatically disappears.
| 6. New categories automatically appear.
|
*/

export async function getFeaturedCategories(): Promise<
  {
    name: string;
    image: string | null;
  }[]
> {
  const supabase =
    await supabaseServer();

  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select(`
      category,
      created_at,
      product_images (
        url,
        sort_order
      )
    `)
    .eq("status", "available")
    .not("category", "is", null)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "GET FEATURED CATEGORIES ERROR:",
      error
    );

    return [];
  }

  const categories =
    new Map<
      string,
      {
        name: string;
        image: string | null;
      }
    >();

  for (const product of data || []) {
    const category =
      String(
        product.category || ""
      ).trim();

    if (!category) {
      continue;
    }

    /*
     * Because products are ordered newest first,
     * the first product we encounter is the newest.
     */
    if (categories.has(category)) {
      continue;
    }

    const images =
      Array.isArray(
        product.product_images
      )
        ? [
            ...product.product_images,
          ].sort(
            (
              a: {
                sort_order: number;
              },
              b: {
                sort_order: number;
              }
            ) =>
              a.sort_order -
              b.sort_order
          )
        : [];

    categories.set(
      category,
      {
        name: category,
        image:
          images[0]?.url ||
          null,
      }
    );
  }

  return Array.from(
    categories.values()
  );
}


/*
|--------------------------------------------------------------------------
| SIMILAR PRODUCTS
|--------------------------------------------------------------------------
*/

export async function getSimilarProducts(
  productId: string,
  category: string,
  limit: number = 4
) {
  const supabase =
    await supabaseServer();

  const {
    data: sameCategory,
    error: categoryError,
  } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "available")
    .eq("category", category)
    .neq("id", productId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (categoryError) {
    console.error(
      "GET SIMILAR PRODUCTS ERROR:",
      categoryError
    );

    return [];
  }

  const results =
    (sameCategory || []).map(
      (product) =>
        normalizeProduct(
          product as Record<string, unknown>
        )
    );

  if (results.length < limit) {
    const remaining =
      limit - results.length;

    const existingIds = [
      productId,
      ...results.map(
        (product) =>
          product.id
      ),
    ];

    const {
      data: otherProducts,
      error: otherError,
    } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "available")
      .not(
        "id",
        "in",
        `(${existingIds.join(",")})`
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(remaining);

    if (otherError) {
      console.error(
        "GET OTHER SIMILAR PRODUCTS ERROR:",
        otherError
      );
    } else {
      results.push(
        ...(otherProducts || []).map(
          (product) =>
            normalizeProduct(
              product as Record<
                string,
                unknown
              >
            )
        )
      );
    }
  }

  return results;
}