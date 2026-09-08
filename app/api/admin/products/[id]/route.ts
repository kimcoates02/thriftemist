import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type VariantInput = {
  id?: string;
  sku?: string | null;
  size?: string | null;
  colour?: string | null;
  quantity?: number;
  cost_price?: number;
  selling_price?: number;
  status?: "available" | "sold" | "archived";
};

type ImageOrderItem =
  | {
      type: "existing";
      id: string;
      variant_colour?: string | null;
    }
  | {
      type: "new";
      key: string;
      variant_colour?: string | null;
    };

function parseMeasurements(
  value: FormDataEntryValue | null
) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      'Measurements must be valid JSON. Example: {"Chest":"24in","Length":"28in"}'
    );
  }
}

function parseTags(
  value: FormDataEntryValue | null
) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| GENERATE SKU
|--------------------------------------------------------------------------
*/

async function generateSku(
  db: ReturnType<typeof supabaseAdmin>
) {
  const year = new Date().getFullYear();
  const prefix = `TM-${year}-`;

  const { data, error } = await db
    .from("products")
    .select("sku")
    .like("sku", `${prefix}%`);

  if (error) {
    throw error;
  }

  let max = 0;

  for (const row of data || []) {
    const match = String(
      row.sku || ""
    ).match(
      new RegExp(
        `^TM-${year}-(\\d+)$`
      )
    );

    if (match) {
      max = Math.max(
        max,
        Number(match[1])
      );
    }
  }

  let next = max + 1;

  while (true) {
    const sku =
      `${prefix}${String(next).padStart(5, "0")}`;

    const {
      data: existing,
      error: existingError,
    } = await db
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      return sku;
    }

    next++;
  }
}

/*
|--------------------------------------------------------------------------
| GET CURRENT DROP
|--------------------------------------------------------------------------
*/

async function getCurrentDrop(
  db: ReturnType<typeof supabaseAdmin>
) {
  const {
    data: active,
    error: activeError,
  } = await db
    .from("drops")
    .select("id")
    .eq("status", "active")
    .order("drop_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  if (active?.id) {
    return active.id;
  }

  const {
    data: latest,
    error: latestError,
  } = await db
    .from("drops")
    .select("id")
    .order("drop_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  return latest?.id || null;
}

/*
|--------------------------------------------------------------------------
| PATCH PRODUCT
|--------------------------------------------------------------------------
|
| Used when editing an existing product.
|
| SKU:
|   Never accepted from browser.
|   Existing SKU is preserved.
|
| DROP:
|   Never accepted from browser.
|   Existing drop is preserved.
|
| IMAGES:
|   Existing images can be reordered.
|   Existing images can be removed.
|   New images can be added.
|   First image becomes Main Image.
|
|--------------------------------------------------------------------------
*/

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function makeVariantSku(parentSku: string, index: number) {
  return `${parentSku}-V${String(index).padStart(2, "0")}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, sku, name")
      .eq("id", id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select(
        `
          id,
          product_id,
          sku,
          size,
          colour,
          quantity,
          cost_price,
          selling_price,
          status,
          created_at,
          updated_at
        `
      )
      .eq("product_id", id)
      .order("created_at", { ascending: true });

    if (variantsError) {
      console.error("Variant GET error:", variantsError);

      return NextResponse.json(
        { error: "Failed to load product variants." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product,
      variants: variants ?? [],
    });
  } catch (error) {
    console.error("Variant GET error:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to load variants." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || !Array.isArray(body.variants)) {
      return NextResponse.json(
        { error: "variants must be an array." },
        { status: 400 }
      );
    }

    const inputVariants = body.variants as VariantInput[];

    if (inputVariants.length > 100) {
      return NextResponse.json(
        { error: "A product can have a maximum of 100 variants." },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // ---------------------------------------------------------
    // Load parent product
    // ---------------------------------------------------------

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, sku, name, price, quantity, status, cost_price"
      )
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const parentSku =
      typeof product.sku === "string" && product.sku.trim()
        ? product.sku.trim()
        : `TM-${productId.slice(0, 8).toUpperCase()}`;

    // ---------------------------------------------------------
    // Load existing variants
    // ---------------------------------------------------------

    const { data: existingVariants, error: existingError } =
      await supabase
        .from("product_variants")
        .select(
          `
            id,
            product_id,
            sku,
            size,
            colour,
            quantity,
            cost_price,
            selling_price,
            status,
            created_at,
            updated_at
          `
        )
        .eq("product_id", productId);

    if (existingError) {
      console.error("Existing variants error:", existingError);

      return NextResponse.json(
        { error: "Failed to load existing variants." },
        { status: 500 }
      );
    }

    const existing = existingVariants ?? [];

    const existingById = new Map(
      existing.map((variant) => [variant.id, variant])
    );

    // ---------------------------------------------------------
    // Normalize + validate incoming variants
    // ---------------------------------------------------------

    const normalized: Array<{
      id?: string;
      sku: string;
      size: string | null;
      colour: string | null;
      quantity: number;
      cost_price: number;
      selling_price: number;
      status: "available" | "sold" | "archived";
    }> = [];

    const combinationKeys = new Set<string>();

    for (let index = 0; index < inputVariants.length; index++) {
      const input = inputVariants[index];

      if (!input || typeof input !== "object") {
        return NextResponse.json(
          { error: `Variant ${index + 1} is invalid.` },
          { status: 400 }
        );
      }

      const id =
        typeof input.id === "string" && input.id.trim()
          ? input.id.trim()
          : undefined;

      // Existing variant must belong to this product.
      if (id && !existingById.has(id)) {
        return NextResponse.json(
          { error: `Variant ${index + 1} does not belong to this product.` },
          { status: 400 }
        );
      }

      const size = cleanText(input.size);
      const colour = cleanText(input.colour);

      const quantity = normalizeNumber(input.quantity, 0);
      const costPrice = normalizeNumber(input.cost_price, 0);
      const sellingPrice = normalizeNumber(input.selling_price, 0);

      const status =
        input.status === "sold" ||
        input.status === "archived"
          ? input.status
          : "available";

      if (!Number.isInteger(quantity) || quantity < 0) {
        return NextResponse.json(
          {
            error: `Variant ${index + 1}: quantity must be a whole number of 0 or more.`,
          },
          { status: 400 }
        );
      }

      if (costPrice < 0) {
        return NextResponse.json(
          {
            error: `Variant ${index + 1}: cost price cannot be negative.`,
          },
          { status: 400 }
        );
      }

      if (sellingPrice < 0) {
        return NextResponse.json(
          {
            error: `Variant ${index + 1}: selling price cannot be negative.`,
          },
          { status: 400 }
        );
      }

      if (status === "sold" && quantity > 0) {
        return NextResponse.json(
          {
            error: `Variant ${index + 1}: a sold variant must have quantity 0.`,
          },
          { status: 400 }
        );
      }

      const combinationKey =
        `${size ?? ""}::${colour ?? ""}`.toLowerCase();

      if (combinationKeys.has(combinationKey)) {
        return NextResponse.json(
          {
            error: `Duplicate variant combination: ${
              colour || "No colour"
            } / ${size || "No size"}.`,
          },
          { status: 400 }
        );
      }

      combinationKeys.add(combinationKey);

      const oldVariant = id ? existingById.get(id) : null;

      const sku =
        oldVariant?.sku ||
        (typeof input.sku === "string" && input.sku.trim()
          ? input.sku.trim()
          : makeVariantSku(parentSku, index + 1));

      normalized.push({
        id,
        sku,
        size,
        colour,
        quantity,
        cost_price: costPrice,
        selling_price: sellingPrice,
        status,
      });
    }

    // ---------------------------------------------------------
    // Protect variant SKUs from duplicates
    // ---------------------------------------------------------

    const skuSet = new Set<string>();

    for (const variant of normalized) {
      const skuKey = variant.sku.toLowerCase();

      if (skuSet.has(skuKey)) {
        return NextResponse.json(
          {
            error: `Duplicate variant SKU: ${variant.sku}`,
          },
          { status: 400 }
        );
      }

      skuSet.add(skuKey);
    }

    // ---------------------------------------------------------
    // Upsert variants
    // ---------------------------------------------------------

    const savedVariants = [];

    for (const variant of normalized) {
      if (variant.id) {
        const { data, error } = await supabase
          .from("product_variants")
          .update({
            sku: variant.sku,
            size: variant.size,
            colour: variant.colour,
            quantity: variant.quantity,
            cost_price: variant.cost_price,
            selling_price: variant.selling_price,
            status: variant.status,
          })
          .eq("id", variant.id)
          .eq("product_id", productId)
          .select(
            `
              id,
              product_id,
              sku,
              size,
              colour,
              quantity,
              cost_price,
              selling_price,
              status,
              created_at,
              updated_at
            `
          )
          .single();

        if (error || !data) {
          console.error("Variant update error:", error);

          return NextResponse.json(
            {
              error: `Failed to update variant ${variant.sku}.`,
            },
            { status: 500 }
          );
        }

        savedVariants.push(data);
      } else {
        const { data, error } = await supabase
          .from("product_variants")
          .insert({
            product_id: productId,
            sku: variant.sku,
            size: variant.size,
            colour: variant.colour,
            quantity: variant.quantity,
            cost_price: variant.cost_price,
            selling_price: variant.selling_price,
            status: variant.status,
          })
          .select(
            `
              id,
              product_id,
              sku,
              size,
              colour,
              quantity,
              cost_price,
              selling_price,
              status,
              created_at,
              updated_at
            `
          )
          .single();

        if (error || !data) {
          console.error("Variant insert error:", error);

          return NextResponse.json(
            {
              error: `Failed to create variant ${variant.sku}.`,
            },
            { status: 500 }
          );
        }

        savedVariants.push(data);
      }
    }

    // ---------------------------------------------------------
    // Handle removed variants safely
    //
    // Do NOT hard-delete variants that have already been used
    // by orders. Archive them instead.
    // ---------------------------------------------------------

    const incomingIds = new Set(
      normalized
        .map((variant) => variant.id)
        .filter((id): id is string => Boolean(id))
    );

    for (const oldVariant of existing) {
      if (incomingIds.has(oldVariant.id)) {
        continue;
      }

      // Check whether this variant has historical order references.
      const { count: orderReferenceCount, error: orderCheckError } =
        await supabase
          .from("order_items")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("variant_id", oldVariant.id);

      if (orderCheckError) {
        console.error("Variant order reference check error:", orderCheckError);

        return NextResponse.json(
          {
            error: "Failed to verify variant sales history.",
          },
          { status: 500 }
        );
      }

      if ((orderReferenceCount ?? 0) > 0) {
        const { error } = await supabase
          .from("product_variants")
          .update({
            status: "archived",
            quantity: 0,
          })
          .eq("id", oldVariant.id)
          .eq("product_id", productId);

        if (error) {
          console.error("Variant archive error:", error);

          return NextResponse.json(
            {
              error: `Failed to archive removed variant ${oldVariant.sku}.`,
            },
            { status: 500 }
          );
        }
      } else {
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .eq("id", oldVariant.id)
          .eq("product_id", productId);

        if (error) {
          console.error("Variant delete error:", error);

          return NextResponse.json(
            {
              error: `Failed to remove variant ${oldVariant.sku}.`,
            },
            { status: 500 }
          );
        }
      }
    }

    // ---------------------------------------------------------
    // Re-read variants after changes
    // ---------------------------------------------------------

    const { data: finalVariants, error: finalVariantsError } =
      await supabase
        .from("product_variants")
        .select(
          `
            id,
            product_id,
            sku,
            size,
            colour,
            quantity,
            cost_price,
            selling_price,
            status,
            created_at,
            updated_at
          `
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

    if (finalVariantsError) {
      console.error("Final variants error:", finalVariantsError);

      return NextResponse.json(
        { error: "Failed to reload variants." },
        { status: 500 }
      );
    }

    const variants = finalVariants ?? [];

    // ---------------------------------------------------------
    // Calculate parent product inventory
    // ---------------------------------------------------------

    const totalQuantity = variants.reduce(
      (sum, variant) => sum + Number(variant.quantity || 0),
      0
    );

    const availableVariants = variants.filter(
      (variant) =>
        variant.status === "available" &&
        Number(variant.quantity || 0) > 0
    );

    const availablePrices = availableVariants
      .map((variant) => Number(variant.selling_price || 0))
      .filter((price) => Number.isFinite(price));

    const parentPrice =
      availablePrices.length > 0
        ? Math.min(...availablePrices)
        : Number(product.price || 0);

    let parentStatus = product.status;

    if (product.status !== "archived") {
      parentStatus = totalQuantity > 0 ? "available" : "sold";
    }

    // Keep parent cost as the first/lowest current variant cost.
    const variantCosts = variants
      .map((variant) => Number(variant.cost_price || 0))
      .filter((cost) => Number.isFinite(cost));

    const parentCostPrice =
      variantCosts.length > 0
        ? Math.min(...variantCosts)
        : Number(product.cost_price || 0);

    // ---------------------------------------------------------
    // Update parent product
    // ---------------------------------------------------------

    const { data: updatedProduct, error: productUpdateError } =
      await supabase
        .from("products")
        .update({
          quantity: totalQuantity,
          price: parentPrice,
          cost_price: parentCostPrice,
          status: parentStatus,
        })
        .eq("id", productId)
        .select(
          `
            id,
            slug,
            name,
            price,
            cost_price,
            quantity,
            status,
            sku
          `
        )
        .single();

    if (productUpdateError || !updatedProduct) {
      console.error(
        "Parent product update error:",
        productUpdateError
      );

      return NextResponse.json(
        {
          error: "Variants were saved, but the parent product could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      variants,
    });
  } catch (error) {
    console.error("Variant PUT error:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    if (
      error instanceof SyntaxError
    ) {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save product variants." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | ADMIN CHECK
    |--------------------------------------------------------------------------
    */

    await requireAdmin();

    const { id } = await params;

    const formData =
      await req.formData();

    const db =
      supabaseAdmin();

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCT
    |--------------------------------------------------------------------------
    */

    const {
      data: existingProduct,
      error: productFetchError,
    } = await db
      .from("products")
      .select(
        "id, sku, drop_id, source, status, price, sold_price, sold_via, sold_at, cost_price, internal_notes"
      )
      .eq("id", id)
      .single();

    if (
      productFetchError ||
      !existingProduct
    ) {
      throw new Error(
        "Product not found."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | READ FORM DATA
    |--------------------------------------------------------------------------
    */

    const name =
      String(
        formData.get("name") ||
          ""
      ).trim();

    const category =
      String(
        formData.get(
          "category"
        ) || ""
      ).trim();

    const source =
      String(
        formData.get("source") ||
          existingProduct.source ||
          "vintage"
      ).trim().toLowerCase();

    const status =
      String(
        formData.get("status") ||
          "available"
      ).trim().toLowerCase();

    if (
      !["available", "reserved", "sold", "archived"].includes(status)
    ) {
      throw new Error("Invalid product status.");
    }

    const rawCostPrice = String(formData.get("cost_price") || "").trim();
    const costPrice = rawCostPrice === "" ? null : Number(rawCostPrice);

    const rawSoldPrice = String(formData.get("sold_price") || "").trim();
    let soldPrice = rawSoldPrice === "" ? null : Number(rawSoldPrice);

    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      throw new Error("Please enter a valid cost price.");
    }

    if (soldPrice !== null && (!Number.isFinite(soldPrice) || soldPrice < 0)) {
      throw new Error("Please enter a valid sold price.");
    }

    const soldViaValue =
      String(formData.get("sold_via") || "").trim().toLowerCase();

    const allowedSoldVia = [
      "offline_store",
      "instagram",
      "whatsapp",
      "website",
      "other",
    ];

    if (soldViaValue && !allowedSoldVia.includes(soldViaValue)) {
      throw new Error("Invalid sold channel.");
    }

    const soldVia =
      status === "sold" && soldViaValue
        ? soldViaValue
        : null;

    const soldAtInput = String(formData.get("sold_at") || "").trim();

    let soldAt = null as string | null;

    if (status === "sold") {
      if (soldAtInput) {
        const parsedSoldAt = new Date(soldAtInput);

        if (Number.isNaN(parsedSoldAt.getTime())) {
          throw new Error("Please enter a valid sold date and time.");
        }

        soldAt = parsedSoldAt.toISOString();
      }
      if (!soldVia) {
        throw new Error("Please select where the product was sold.");
      }

      soldPrice =
        soldPrice ?? Number(existingProduct.price);

      soldAt =
        soldAt ?? new Date().toISOString();
    }

    if (
      !(
        ["vintage", "surplus", "new"] as const
      ).includes(
        source as "vintage" | "surplus" | "new"
      )
    ) {
      throw new Error(
        "Please select Vintage, Surplus, or New."
      );
    }

    const condition =
      String(
        formData.get(
          "condition"
        ) || ""
      ).trim();

    const description =
      String(
        formData.get(
          "description"
        ) || ""
      ).trim();

    const price =
      Number(
        formData.get("price")
      );

    /*
    |--------------------------------------------------------------------------
    | QUANTITY
    |--------------------------------------------------------------------------
    |
    | New products default to 1.
    | Edited products use the submitted quantity.
    |
    */

    const quantityValue =
      formData.get("quantity");

    let quantity =
      quantityValue === null ||
      String(quantityValue).trim() === ""
        ? 1
        : Number(quantityValue);

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!name) {
      throw new Error(
        "Product name is required."
      );
    }

    if (!category) {
      throw new Error(
        "Category is required."
      );
    }

    if (!condition) {
      throw new Error(
        "Condition is required."
      );
    }

    if (!description) {
      throw new Error(
        "Description is required."
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        "Please enter a valid price."
      );
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Please enter a valid quantity.");
    }

    /*
    * A sold item must never remain in available stock.
    * If an item is moved back from Sold/Archived to an active
    * inventory state while its quantity is still zero, restore
    * a sensible one-item stock level rather than leaving it
    * apparently available but impossible to purchase.
    */
    if (status === "sold") {
      quantity = 0;
    } else if (
      (status === "available" || status === "reserved") &&
      quantity === 0 &&
      (existingProduct.status === "sold" || existingProduct.status === "archived")
    ) {
      quantity = 1;
    }

    /*
    |--------------------------------------------------------------------------
    | SYSTEM SKU
    |--------------------------------------------------------------------------
    |
    | NEVER trust SKU sent by the browser.
    |
    */

    const systemSku =
      existingProduct.sku ||
      (await generateSku(db));

    /*
    |--------------------------------------------------------------------------
    | SYSTEM DROP
    |--------------------------------------------------------------------------
    |
    | If product already belongs to a drop,
    | keep that drop.
    |
    | If it doesn't have one, assign current drop.
    |
    */

    const systemDropId =
      existingProduct.drop_id ||
      (await getCurrentDrop(db));

    /*
    |--------------------------------------------------------------------------
    | UPDATE PRODUCT
    |--------------------------------------------------------------------------
    */

    const {
      error: updateError,
    } = await db
      .from("products")
      .update({
        name,

        price,

        brand:
          String(
            formData.get(
              "brand"
            ) || ""
          ).trim() ||
          null,

        category,

        source,

        size:
          String(
            formData.get(
              "size"
            ) || ""
          ).trim() ||
          null,

        colour:
          String(
            formData.get(
              "colour"
            ) || ""
          ).trim() ||
          null,

        condition,

        material:
          String(
            formData.get(
              "material"
            ) || ""
          ).trim() ||
          null,

        description,

        measurements:
          parseMeasurements(
            formData.get(
              "measurements"
            )
          ),

        tags:
          parseTags(
            formData.get(
              "tags"
            )
          ),

status,

        quantity:
          status === "sold"
            ? 0
            : Math.floor(quantity),

        cost_price: costPrice,

        sold_price: soldPrice,

        sold_via: soldVia,

        sold_at: soldAt,

        internal_notes:
          String(formData.get("internal_notes") || "").trim() || null,

        /*
        |--------------------------------------------------------------------------
        | SYSTEM CONTROLLED
        |--------------------------------------------------------------------------
        */

        sku: systemSku,

        drop_id:
          systemDropId,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    /*
    |--------------------------------------------------------------------------
    | IMAGE ORDER
    |--------------------------------------------------------------------------
    */

    const rawImageOrder =
      String(
        formData.get(
          "image_order"
        ) || "[]"
      );

    let imageOrder: ImageOrderItem[];

    try {
      const parsed =
        JSON.parse(
          rawImageOrder
        );

      if (
        !Array.isArray(
          parsed
        )
      ) {
        throw new Error();
      }

      imageOrder =
        parsed.filter(
          (item): item is ImageOrderItem => {
            if (
              !item ||
              typeof item !==
                "object"
            ) {
              return false;
            }

            if (
              item.type ===
                "existing" &&
              typeof item.id ===
                "string"
            ) {
              return true;
            }

            if (
              item.type ===
                "new" &&
              typeof item.key ===
                "string"
            ) {
              return true;
            }

            return false;
          }
        );
    } catch {
      throw new Error(
        "Invalid image order."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CURRENT IMAGES
    |--------------------------------------------------------------------------
    */

    const {
      data: currentImages,
      error: imageFetchError,
    } = await db
      .from("product_images")
      .select(
        "id, url, sort_order, variant_colour"
      )
      .eq(
        "product_id",
        id
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );

    if (imageFetchError) {
      throw imageFetchError;
    }

    /*
    |--------------------------------------------------------------------------
    | MAP EXISTING IMAGES
    |--------------------------------------------------------------------------
    */

    const existingMap =
      new Map<
        string,
        {
          id: string;
          url: string;
          sort_order: number;
          variant_colour: string | null;
        }
      >();

    for (
      const image of
        currentImages || []
    ) {
      existingMap.set(
        image.id,
        image
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DETERMINE RETAINED IMAGES
    |--------------------------------------------------------------------------
    */

    const retainedIds =
      new Set<string>();

    for (
      const item of imageOrder
    ) {
      if (
        item.type ===
        "existing"
      ) {
        retainedIds.add(
          item.id
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE IMAGE DATABASE RECORDS
    |--------------------------------------------------------------------------
    */

    const removedImages =
      (
        currentImages ||
        []
      ).filter(
        (image) =>
          !retainedIds.has(
            image.id
          )
      );

    if (
      removedImages.length >
      0
    ) {
      const {
        error:
          deleteImageError,
      } = await db
        .from(
          "product_images"
        )
        .delete()
        .eq(
          "product_id",
          id
        )
        .in(
          "id",
          removedImages.map(
            (image) =>
              image.id
          )
        );

      if (
        deleteImageError
      ) {
        throw deleteImageError;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | NEW IMAGE FILES
    |--------------------------------------------------------------------------
    */

    const newFiles =
      formData
        .getAll("images")
        .filter(
          (
            value
          ): value is File =>
            value instanceof
              File &&
            value.size > 0
        );

    /*
    |--------------------------------------------------------------------------
    | MAP NEW FILES
    |--------------------------------------------------------------------------
    */

    const newEntries =
      imageOrder.filter(
        (
          item
        ): item is {
          type: "new";
          key: string;
        } =>
          item.type ===
          "new"
      );

    const fileMap =
      new Map<
        string,
        File
      >();

    newEntries.forEach(
      (
        entry,
        index
      ) => {
        const file =
          newFiles[index];

        if (file) {
          fileMap.set(
            entry.key,
            file
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | REBUILD IMAGE ORDER
    |--------------------------------------------------------------------------
    |
    | sort_order:
    |
    | 0 = Main Image
    | 1 = Image 2
    | 2 = Image 3
    | etc.
    |
    */

    for (
      let sortOrder = 0;
      sortOrder <
      imageOrder.length;
      sortOrder++
    ) {
      const item =
        imageOrder[
          sortOrder
        ];

      /*
      |--------------------------------------------------------------------------
      | EXISTING IMAGE
      |--------------------------------------------------------------------------
      */

      if (
        item.type ===
        "existing"
      ) {
        if (
          !existingMap.has(
            item.id
          )
        ) {
          continue;
        }

        const {
          error,
        } = await db
          .from(
            "product_images"
          )
          .update({
            sort_order: sortOrder,
            variant_colour:
              typeof item.variant_colour === "string" &&
              item.variant_colour.trim()
                ? item.variant_colour.trim()
                : null,
          })
          .eq(
            "id",
            item.id
          )
          .eq(
            "product_id",
            id
          );

        if (error) {
          throw error;
        }

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | NEW IMAGE
      |--------------------------------------------------------------------------
      */

      const file =
        fileMap.get(
          item.key
        );

      if (!file) {
        continue;
      }

      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            ""
          )
          .slice(
            0,
            80
          );

      const path =
        `products/${id}/${crypto.randomUUID()}-${safeName || "image.jpg"}`;

      const upload =
        await db.storage
          .from(
            "product-images"
          )
          .upload(
            path,
            file,
            {
              contentType:
                file.type ||
                "image/jpeg",
              upsert: false,
            }
          );

      if (
        upload.error
      ) {
        throw upload.error;
      }

      const {
        data: publicUrl,
      } =
        db.storage
          .from(
            "product-images"
          )
          .getPublicUrl(
            path
          );

      const {
        error:
          insertImageError,
      } = await db
        .from(
          "product_images"
        )
        .insert({
          product_id: id,
          url: publicUrl.publicUrl,
          sort_order: sortOrder,
          variant_colour:
            typeof item.variant_colour === "string" &&
            item.variant_colour.trim()
              ? item.variant_colour.trim()
              : null,
        });

      if (
        insertImageError
      ) {
        throw insertImageError;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY PRODUCT HAS IMAGES
    |--------------------------------------------------------------------------
    */

    const {
      data: finalImages,
      error:
        finalImageError,
    } = await db
      .from(
        "product_images"
      )
      .select("id")
      .eq(
        "product_id",
        id
      );

    if (
      finalImageError
    ) {
      throw finalImageError;
    }

    if (
      !finalImages ||
      finalImages.length ===
        0
    ) {
      throw new Error(
        "A product must have at least one image."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      ok: true,
      id,
    });
  } catch (error) {
    console.error(
      "ADMIN UPDATE PRODUCT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Failed to update product.",
      },
      {
        status: 400,
      }
    );
  }
}