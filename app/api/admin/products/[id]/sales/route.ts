import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_SOLD_VIA = [
  "offline_store",
  "instagram",
  "whatsapp",
  "website",
  "other",
] as const;

type SoldVia = (typeof ALLOWED_SOLD_VIA)[number];

export async function POST(
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
    const body = await req.json();

    const variantId =
      typeof body.variantId === "string"
        ? body.variantId.trim()
        : "";

    const quantitySold = Number(body.quantity);
    const soldVia = String(body.soldVia || "")
      .trim()
      .toLowerCase() as SoldVia;

    const unitPrice = Number(body.unitPrice);
    const notes =
      String(body.notes || "").trim() || null;

    /*
    |--------------------------------------------------------------------------
    | VALIDATE INPUT
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(quantitySold) ||
      quantitySold <= 0
    ) {
      throw new Error("Please enter a valid quantity.");
    }

    if (!ALLOWED_SOLD_VIA.includes(soldVia)) {
      throw new Error(
        "Please select where the product was sold."
      );
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new Error(
        "Please enter a valid sale price."
      );
    }

    if (!variantId) {
      throw new Error(
        "Please select the exact product variant."
      );
    }

    const db = supabaseAdmin();

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
      .select(
        "id, name, price, quantity, status, sku"
      )
      .eq("id", id)
      .maybeSingle();

    if (productError || !product) {
      throw new Error("Product not found.");
    }

    if (product.status === "archived") {
      throw new Error(
        "Archived products cannot be sold."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VARIANT
    |--------------------------------------------------------------------------
    */

    const {
      data: variant,
      error: variantError,
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
        status
      `)
      .eq("id", variantId)
      .eq("product_id", id)
      .maybeSingle();

    if (variantError || !variant) {
      throw new Error(
        "The selected product variant was not found."
      );
    }

    if (variant.status === "archived") {
      throw new Error(
        "This variant is archived and cannot be sold."
      );
    }

    if (variant.status === "sold") {
      throw new Error(
        "This variant is already sold."
      );
    }

    const currentQuantity = Math.floor(
      Number(variant.quantity || 0)
    );

    if (currentQuantity <= 0) {
      throw new Error(
        "There is no stock available for this variant."
      );
    }

    if (quantitySold > currentQuantity) {
      throw new Error(
        `Only ${currentQuantity} unit${
          currentQuantity === 1 ? "" : "s"
        } available for this variant.`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | USE THE VARIANT'S ACTUAL COST
    |--------------------------------------------------------------------------
    */

    const unitCost = Number(
      variant.cost_price || 0
    );

    const soldAt =
      new Date().toISOString();

    /*
    |--------------------------------------------------------------------------
    | RECORD SALE
    |--------------------------------------------------------------------------
    */

    const {
      data: sale,
      error: saleError,
    } = await db
      .from("product_sales")
      .insert({
        product_id: id,
        variant_id: variant.id,
        quantity: quantitySold,
        unit_cost: unitCost,
        unit_price: unitPrice,
        sold_via: soldVia,
        sold_at: soldAt,
        notes,
      })
      .select(`
        id,
        product_id,
        variant_id,
        quantity,
        unit_cost,
        unit_price,
        total_amount,
        sold_via,
        sold_at,
        notes
      `)
      .single();

    if (saleError || !sale) {
      throw (
        saleError ||
        new Error("Failed to record sale.")
      );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE VARIANT STOCK
    |--------------------------------------------------------------------------
    */

    const remainingQuantity =
      currentQuantity - quantitySold;

    const newVariantStatus =
      remainingQuantity === 0
        ? "sold"
        : "available";

    const {
      data: updatedVariant,
      error: variantUpdateError,
    } = await db
      .from("product_variants")
      .update({
        quantity: remainingQuantity,
        status: newVariantStatus,
        updated_at: soldAt,
      })
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
        updated_at
      `)
      .single();

    if (
      variantUpdateError ||
      !updatedVariant
    ) {
      // Roll back the ledger entry if
      // the inventory update failed.
      await db
        .from("product_sales")
        .delete()
        .eq("id", sale.id);

      throw (
        variantUpdateError ||
        new Error(
          "Failed to update variant inventory."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RECALCULATE PARENT PRODUCT
    |--------------------------------------------------------------------------
    |
    | Parent quantity = total stock across variants.
    |
    | Parent price = lowest available variant price.
    |
    | Parent status:
    |   available = at least one available variant has stock
    |   sold      = no stock remains
    |   archived  = parent was already archived
    |
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
        status
      `)
      .eq("product_id", id);

    if (finalVariantsError) {
      // The sale and variant update already happened.
      // Do not delete the sale here because the inventory
      // change succeeded. Throw so the admin knows that
      // parent synchronization needs attention.
      throw finalVariantsError;
    }

    const totalQuantity =
      (finalVariants || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

    const availableVariants =
      (finalVariants || []).filter(
        (item) =>
          item.status === "available" &&
          Number(item.quantity || 0) > 0
      );

    let parentPrice =
      Number(product.price || 0);

    if (availableVariants.length > 0) {
      parentPrice = Math.min(
        ...availableVariants.map(
          (item) =>
            Number(
              item.selling_price || 0
            )
        )
      );
    }

    const parentStatus =
      product.status === "archived"
        ? "archived"
        : totalQuantity > 0
          ? "available"
          : "sold";

    /*
    |--------------------------------------------------------------------------
    | UPDATE PARENT PRODUCT
    |--------------------------------------------------------------------------
    */

    const {
      error: productUpdateError,
    } = await db
      .from("products")
      .update({
        quantity: totalQuantity,
        price: parentPrice,
        status: parentStatus,
        updated_at: soldAt,

        // These remain useful as the latest
        // product-level sale information.
        sold_price: unitPrice,
        sold_via: soldVia,
        sold_at:
          totalQuantity === 0
            ? soldAt
            : null,
      })
      .eq("id", id);

    if (productUpdateError) {
      throw productUpdateError;
    }

    /*
    |--------------------------------------------------------------------------
    | RETURN
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      ok: true,

      sale,

      variant: {
        id: updatedVariant.id,
        sku: updatedVariant.sku,
        size: updatedVariant.size,
        colour: updatedVariant.colour,
        previousQuantity: currentQuantity,
        quantity: remainingQuantity,
        status: newVariantStatus,
        unitCost,
        unitPrice,
      },

      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        previousQuantity: Number(
          product.quantity || 0
        ),
        quantity: totalQuantity,
        status: parentStatus,
        price: parentPrice,
      },
    });
  } catch (error) {
    console.error(
      "RECORD PRODUCT VARIANT SALE ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to record sale.";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 400;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}