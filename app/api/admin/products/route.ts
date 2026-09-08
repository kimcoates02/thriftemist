import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateSku(db: ReturnType<typeof supabaseAdmin>) {
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
    const match = String(row.sku || "").match(
      new RegExp(`^TM-${year}-(\\d+)$`)
    );

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  let next = max + 1;

  while (true) {
    const sku = `${prefix}${String(next).padStart(5, "0")}`;

    const { data: existing, error: existingError } = await db
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

async function getCurrentDrop(db: ReturnType<typeof supabaseAdmin>) {
  const { data: active, error: activeError } = await db
    .from("drops")
    .select("id")
    .eq("status", "active")
    .order("drop_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw activeError;
  }

  if (active?.id) {
    return active.id;
  }

  const { data: latest, error: latestError } = await db
    .from("drops")
    .select("id")
    .order("drop_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  return latest?.id || null;
}

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

  return JSON.parse(text);
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| GET PRODUCTS
|--------------------------------------------------------------------------
|
| Used by:
| /admin/products
|
| Loads all products for the admin inventory table.
|
*/

export async function GET() {
  try {
    await requireAdmin();

    const db = supabaseAdmin();

    const { data, error } = await db
      .from("products")
      .select(`
        *,
        product_images (
          id,
          url,
          sort_order
        ),
        drops (
          id,
          name,
          drop_number
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ADMIN GET PRODUCTS ERROR:", error);

      return NextResponse.json(
        {
          error: error.message || "Unable to load products.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      products: data || [],
    });
  } catch (error) {
    console.error("ADMIN PRODUCTS GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load products.",
      },
      {
        status: 401,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST PRODUCT
|--------------------------------------------------------------------------
|
| Creates a new product.
|
| SKU and Drop ID are generated automatically.
|
*/

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();

    const db = supabaseAdmin();

    const id = crypto.randomUUID();

    const name = String(formData.get("name") || "").trim();

    if (!name) {
      throw new Error("Product name is required.");
    }

    const price = Number(formData.get("price"));

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Please enter a valid price.");
    }

    const category = String(
      formData.get("category") || ""
    ).trim();

    const source = String(
      formData.get("source") || ""
    ).trim().toLowerCase();

    if (!(["vintage", "surplus", "new"] as const).includes(source as "vintage" | "surplus" | "new")) {
      throw new Error("Please select Vintage, Surplus, or New.");
    }

    if (!category) {
      throw new Error("Category is required.");
    }

    const condition = String(
      formData.get("condition") || ""
    ).trim();

    if (!condition) {
      throw new Error("Condition is required.");
    }

    const description = String(
      formData.get("description") || ""
    ).trim();

    if (!description) {
      throw new Error("Description is required.");
    }

    const rawCostPrice = String(formData.get("cost_price") || "").trim();
    const costPrice = rawCostPrice === "" ? null : Number(rawCostPrice);

    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      throw new Error("Please enter a valid cost price.");
    }

    const internalNotes =
      String(formData.get("internal_notes") || "").trim() || null;

    /*
    |--------------------------------------------------------------------------
    | AUTOMATIC SKU
    |--------------------------------------------------------------------------
    */

    const sku = await generateSku(db);

    /*
    |--------------------------------------------------------------------------
    | AUTOMATIC DROP
    |--------------------------------------------------------------------------
    */

    const dropId = await getCurrentDrop(db);

    /*
    |--------------------------------------------------------------------------
    | SLUG
    |--------------------------------------------------------------------------
    */

    const slug = `${slugify(name)}-${id.slice(0, 6)}`;

    /*
    |--------------------------------------------------------------------------
    | PRODUCT
    |--------------------------------------------------------------------------
    */

    const { error: productError } = await db
      .from("products")
      .insert({
        id,
        name,
        slug,
        price,

        cost_price: costPrice,

        internal_notes: internalNotes,

        brand:
          String(formData.get("brand") || "").trim() ||
          null,

        category,

        source,

        size:
          String(formData.get("size") || "").trim() ||
          null,

        colour:
          String(formData.get("colour") || "").trim() ||
          null,

        condition,

        material:
          String(formData.get("material") || "").trim() ||
          null,

        description,

        measurements: parseMeasurements(
          formData.get("measurements")
        ),

        sku,

        drop_id: dropId,

        status: "available",

        quantity: 1,

        tags: parseTags(formData.get("tags")),
      });

    if (productError) {
      throw productError;
    }

    /*
    |--------------------------------------------------------------------------
    | IMAGES
    |--------------------------------------------------------------------------
    */

    const files = formData
      .getAll("images")
      .filter(
        (value): value is File =>
          value instanceof File && value.size > 0
      );

    if (files.length === 0) {
      throw new Error(
        "Please add at least one product image."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | IMAGE ORDER
    |--------------------------------------------------------------------------
    |
    | The first image is always the MAIN IMAGE.
    |
    */

    const rawOrder = String(
      formData.get("image_order") || "[]"
    );

    const imageOrder = JSON.parse(rawOrder) as {
      type: "new";
      key: string;
      variant_colour?: string | null;
    }[];

    const newEntries = imageOrder.filter(
      (entry) => entry.type === "new"
    );

    const fileMap = new Map<string, File>();

    files.forEach((file, index) => {
      const key = newEntries[index]?.key;

      if (key) {
        fileMap.set(key, file);
      }
    });

    let sortOrder = 0;

    for (const entry of imageOrder) {
      const file = fileMap.get(entry.key);

      if (!file) {
        continue;
      }

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        ""
      );

      const path = `products/${id}/${sortOrder}-${safeName}`;

      const upload = await db.storage
        .from("product-images")
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });

      if (upload.error) {
        throw upload.error;
      }

      const { data: publicUrl } = db.storage
        .from("product-images")
        .getPublicUrl(path);

      const { error: imageError } = await db
        .from("product_images")
        .insert({
          product_id: id,
          url: publicUrl.publicUrl,
          sort_order: sortOrder,
          variant_colour:
            typeof entry.variant_colour === "string" &&
            entry.variant_colour.trim()
              ? entry.variant_colour.trim()
              : null,
        });

      if (imageError) {
        throw imageError;
      }

      sortOrder++;
    }

    if (sortOrder === 0) {
      throw new Error(
        "Please add at least one product image."
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      sku,
      drop_id: dropId,
    });
  } catch (error) {
    console.error("ADMIN CREATE PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product.",
      },
      {
        status: 400,
      }
    );
  }
}