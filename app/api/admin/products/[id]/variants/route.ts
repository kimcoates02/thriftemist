import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type VariantInput = {
  id?: string;
  sku?: string;
  size?: string | null;
  colour?: string | null;
  quantity?: number;
  cost_price?: number;
  selling_price?: number;
  status?: "available" | "sold" | "archived";
};

const ALLOWED_STATUSES = [
  "available",
  "sold",
  "archived",
] as const;

type VariantStatus = (typeof ALLOWED_STATUSES)[number];

function cleanText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/*
|--------------------------------------------------------------------------
| GENERATE VARIANT SKU
|--------------------------------------------------------------------------
|
| Parent product:
|   TM-2026-00007
|
| Variants:
|   TM-2026-00007-V01
|   TM-2026-00007-V02
|   TM-2026-00007-V03
|
|--------------------------------------------------------------------------
*/

async function generateVariantSku(
  db: ReturnType<typeof supabaseAdmin>,
  parentSku: string,
  usedSkus: Set<string>
) {
  let number = 1;

  while (true) {
    const sku =
      `${parentSku}-V${String(number).padStart(2, "0")}`;

    if (usedSkus.has(sku)) {
      number++;
      continue;
    }

    const { data, error } = await db
      .from("product_variants")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      usedSkus.add(sku);
      return sku;
    }

    number++;
  }
}

/*
|--------------------------------------------------------------------------
| GET VARIANTS
|--------------------------------------------------------------------------
*/

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const db = supabaseAdmin();

    const {
      data: product,
      error: productError,
    } = await db
      .from("products")
      .select("id, sku, name")
      .eq("id", id)
      .maybeSingle();

    if (productError || !product) {
      throw new Error("Product not found.");
    }

    const {
      data: variants,
      error: variantsError,
    } = await db
      .from("product_variants")
      .select(`
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
      `)
      .eq("product_id", id)
      .order("created_at", {
        ascending: true,
      });

    if (variantsError) {
      throw variantsError;
    }

    return NextResponse.json({
      ok: true,
      product,
      variants: variants || [],
    });
  } catch (error) {
    console.error(
      "ADMIN GET PRODUCT VARIANTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load variants.",
      },
      {
        status: 400,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| SAVE VARIANTS
|--------------------------------------------------------------------------
|
| The admin form sends the complete variant list.
|
| Existing variants are updated.
| New variants are created automatically.
| Variants removed from the form are deleted only when they have
| zero stock and are not referenced by an order.
|
|--------------------------------------------------------------------------
*/

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const db = supabaseAdmin();

    const body = await req.json();

    if (
      !body ||
      !Array.isArray(body.variants)
    ) {
      throw new Error(
        "Invalid variants payload."
      );
    }

    const inputVariants =
      body.variants as VariantInput[];

    /*
    |--------------------------------------------------------------------------
    | PRODUCT
    |--------------------------------------------------------------------------
    */

    const {
      data: product,
      error: productError,
    } = await db
      .from("products")
      .select(`
        id,
        sku,
        price,
        cost_price,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (productError || !product) {
      throw new Error("Product not found.");
    }

    /*
    |--------------------------------------------------------------------------
    | BASIC LIMIT
    |--------------------------------------------------------------------------
    */

    if (inputVariants.length > 100) {
      throw new Error(
        "A product cannot have more than 100 variants."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE + VALIDATE
    |--------------------------------------------------------------------------
    */

    const normalized: {
      id?: string;
      sku?: string;
      size: string | null;
      colour: string | null;
      quantity: number;
      cost_price: number;
      selling_price: number;
      status: VariantStatus;
    }[] = [];

    const combinations = new Set<string>();
    const submittedIds = new Set<string>();

    for (const input of inputVariants) {
      const size = cleanText(input.size);
      const colour = cleanText(input.colour);

      const quantity = Number(
        input.quantity ?? 0
      );

      const costPrice = Number(
        input.cost_price ?? 0
      );

      const sellingPrice = Number(
        input.selling_price ?? product.price
      );

      const status =
        String(
          input.status ?? "available"
        ).trim().toLowerCase() as VariantStatus;

      if (
        input.id &&
        submittedIds.has(input.id)
      ) {
        throw new Error(
          "Duplicate variant ID."
        );
      }

      if (input.id) {
        submittedIds.add(input.id);
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 0
      ) {
        throw new Error(
          "Variant quantity must be a whole number of 0 or more."
        );
      }

      if (
        !Number.isFinite(costPrice) ||
        costPrice < 0
      ) {
        throw new Error(
          "Variant cost price must be 0 or more."
        );
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        throw new Error(
          "Variant selling price must be 0 or more."
        );
      }

      if (
        !ALLOWED_STATUSES.includes(status)
      ) {
        throw new Error(
          "Invalid variant status."
        );
      }

      /*
      * Sold variants cannot contain stock.
      */

      if (status === "sold" && quantity !== 0) {
        throw new Error(
          "A sold variant must have zero quantity."
        );
      }

      /*
      * Prevent duplicate Size + Colour combinations.
      */

      const combination =
        `${size || ""}|||${colour || ""}`
          .toLowerCase();

      if (combinations.has(combination)) {
        throw new Error(
          `Duplicate variant combination: ${
            colour || "No colour"
          } / ${
            size || "No size"
          }.`
        );
      }

      combinations.add(combination);

      normalized.push({
        id: input.id,
        sku: cleanText(input.sku) || undefined,
        size,
        colour,
        quantity,
        cost_price: costPrice,
        selling_price: sellingPrice,
        status,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EXISTING VARIANTS
    |--------------------------------------------------------------------------
    */

    const {
      data: existingVariants,
      error: existingVariantsError,
    } = await db
      .from("product_variants")
      .select(`
        id,
        sku,
        quantity,
        status
      `)
      .eq("product_id", id);

    if (existingVariantsError) {
      throw existingVariantsError;
    }

    const existingMap = new Map(
      (existingVariants || []).map(
        (variant) => [
          variant.id,
          variant,
        ]
      )
    );

    /*
    |--------------------------------------------------------------------------
    | USED SKUS
    |--------------------------------------------------------------------------
    */

    const usedSkus = new Set<string>();

    for (const variant of existingVariants || []) {
      if (variant.sku) {
        usedSkus.add(variant.sku);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | UPSERT VARIANTS
    |--------------------------------------------------------------------------
    */

    const savedVariants = [];

    for (const variant of normalized) {
      let sku = variant.sku;

      /*
      * Existing variant:
      * preserve its SKU.
      */

      if (variant.id) {
        const existing =
          existingMap.get(
            variant.id
          );

        if (!existing) {
          throw new Error(
            "Variant does not belong to this product."
          );
        }

        sku = existing.sku;
      }

      /*
      * New variant:
      * generate SKU automatically.
      */

      if (!sku) {
        sku = await generateVariantSku(
          db,
          product.sku,
          usedSkus
        );
      }

      const payload = {
        product_id: id,
        sku,
        size: variant.size,
        colour: variant.colour,
        quantity: variant.quantity,
        cost_price: variant.cost_price,
        selling_price: variant.selling_price,
        status: variant.status,
        updated_at:
          new Date().toISOString(),
      };

      if (variant.id) {
        const {
          data,
          error,
        } = await db
          .from("product_variants")
          .update(payload)
          .eq("id", variant.id)
          .eq("product_id", id)
          .select(`
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
          `)
          .single();

        if (error) {
          throw error;
        }

        savedVariants.push(data);
      } else {
        const {
          data,
          error,
        } = await db
          .from("product_variants")
          .insert(payload)
          .select(`
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
          `)
          .single();

        if (error) {
          throw error;
        }

        savedVariants.push(data);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE REMOVED VARIANTS
    |--------------------------------------------------------------------------
    |
    | Only delete variants that:
    |
    | - are no longer submitted
    | - have zero stock
    |
    | This prevents accidentally destroying live inventory.
    |
    |--------------------------------------------------------------------------
    */

    for (const existing of existingVariants || []) {
      if (
        submittedIds.has(existing.id)
      ) {
        continue;
      }

      if (
        Number(existing.quantity) > 0
      ) {
        throw new Error(
          `Variant ${existing.sku} still has stock. Remove its stock before deleting the variant.`
        );
      }

      const {
        error: deleteError,
      } = await db
        .from("product_variants")
        .delete()
        .eq("id", existing.id)
        .eq("product_id", id);

      if (deleteError) {
        throw deleteError;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SYNCHRONIZE PARENT PRODUCT
    |--------------------------------------------------------------------------
    |
    | Parent quantity =
    | total quantity across all variants.
    |
    | Parent price =
    | lowest currently available variant price.
    |
    | Parent status:
    |
    | - available if stock exists
    | - sold if variants exist but all are sold/out
    | - archived if parent is archived
    |
    |--------------------------------------------------------------------------
    */

    const {
      data: finalVariants,
      error: finalVariantsError,
    } = await db
      .from("product_variants")
      .select(`
        id,
        quantity,
        selling_price,
        cost_price,
        status
      `)
      .eq("product_id", id);

    if (finalVariantsError) {
      throw finalVariantsError;
    }

    const totalQuantity =
      (finalVariants || []).reduce(
        (sum, variant) =>
          sum + Number(variant.quantity || 0),
        0
      );

    const availableVariants =
      (finalVariants || []).filter(
        (variant) =>
          variant.status === "available" &&
          Number(variant.quantity) > 0
      );

    let parentPrice =
      Number(product.price || 0);

    if (availableVariants.length > 0) {
      parentPrice = Math.min(
        ...availableVariants.map(
          (variant) =>
            Number(
              variant.selling_price
            )
        )
      );
    }

    let parentStatus =
      product.status;

    if (product.status !== "archived") {
      parentStatus =
        totalQuantity > 0
          ? "available"
          : "sold";
    }

    const {
      error: parentUpdateError,
    } = await db
      .from("products")
      .update({
        quantity: totalQuantity,
        price: parentPrice,
        status: parentStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (parentUpdateError) {
      throw parentUpdateError;
    }

    return NextResponse.json({
      ok: true,
      variants: finalVariants || [],
      quantity: totalQuantity,
      price: parentPrice,
      status: parentStatus,
    });
  } catch (error) {
    console.error(
      "ADMIN SAVE PRODUCT VARIANTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save variants.",
      },
      {
        status: 400,
      }
    );
  }
}