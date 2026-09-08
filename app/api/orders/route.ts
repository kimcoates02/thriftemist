import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

type OrderItem = {
  id: string;
  variantId?: string | null;
  quantity: number;
};

type OrderRequest = {
  customer: {
    name: string;
    email: string;
    phone: string;
  };

  address: {
    address: string;
    city: string;
    district?: string;
    state: string;
    pin: string;
  };

  items: OrderItem[];
};

type ProductRow = {
  id: string;
  name: string;
  status: string;
  quantity: number;
  price: number;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  quantity: number;
  selling_price: number;
  status: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrderRequest;

    /* =====================================================
       VALIDATION
       ===================================================== */

    const name = body.customer?.name?.trim();

    const email =
      body.customer?.email?.trim().toLowerCase();

    const phone =
      body.customer?.phone?.trim();

    const address =
      body.address?.address?.trim();

    const city =
      body.address?.city?.trim();

    const district =
      body.address?.district?.trim() || "";

    const state =
      body.address?.state?.trim();

    const pin =
      body.address?.pin?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        {
          error: "Please enter your full name.",
        },
        { status: 400 }
      );
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (
      !phone ||
      !/^[6-9]\d{9}$/.test(phone)
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 10-digit Indian mobile number.",
        },
        { status: 400 }
      );
    }

    if (!address || address.length < 5) {
      return NextResponse.json(
        {
          error:
            "Please enter your complete delivery address.",
        },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          error: "City is required.",
        },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        {
          error: "State is required.",
        },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 6-digit PIN code.",
        },
        { status: 400 }
      );
    }

    if (!body.items?.length) {
      return NextResponse.json(
        {
          error: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    if (body.items.length > 50) {
      return NextResponse.json(
        {
          error: "Too many items in your cart.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       SERVER-SIDE PIN VERIFICATION
       ===================================================== */

    const origin = new URL(req.url).origin;

    const pinResponse = await fetch(
      `${origin}/api/pincode/${pin}`,
      {
        cache: "no-store",
      }
    );

    if (!pinResponse.ok) {
      return NextResponse.json(
        {
          error: "Unable to verify the PIN code.",
        },
        { status: 400 }
      );
    }

    const pinData = await pinResponse.json();

    if (!pinData.valid) {
      return NextResponse.json(
        {
          error: "The PIN code is not valid.",
        },
        { status: 400 }
      );
    }

    const verifiedCity =
      String(pinData.city || "").trim();

    const verifiedState =
      String(pinData.state || "").trim();

    const verifiedDistrict =
      String(pinData.district || "").trim();

    const verifiedPostOffice =
      String(pinData.postOffice || "").trim();

    if (
      city.toLowerCase() !==
        verifiedCity.toLowerCase() ||
      state.toLowerCase() !==
        verifiedState.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "The PIN code does not match the selected city/district and state.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       SUPABASE
       ===================================================== */

    const db = supabaseAdmin();

    // Attach the order to the signed-in customer when available.
    // Guest checkout remains supported.
    let userId: string | null = null;

    try {
      const serverClient =
        await supabaseServer();

      const {
        data: { user },
      } = await serverClient.auth.getUser();

      userId = user?.id || null;
    } catch {
      userId = null;
    }

    /* =====================================================
       NORMALISE CART
       ===================================================== */

    const productIds = [
      ...new Set(
        body.items
          .map((item) => item.id)
          .filter(Boolean)
      ),
    ];

    const variantIds = [
      ...new Set(
        body.items
          .map((item) => item.variantId)
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              value.length > 0
          )
      ),
    ];

    if (!productIds.length) {
      return NextResponse.json(
        {
          error:
            "Your cart contains an invalid product.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FETCH PRODUCTS
       ===================================================== */

    const {
      data: products,
      error: productsError,
    } = await db
      .from("products")
      .select(
        "id,name,status,quantity,price"
      )
      .in("id", productIds);

    if (productsError) {
      console.error(
        "GET PRODUCTS FOR ORDER ERROR:",
        productsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the products in your cart.",
        },
        { status: 500 }
      );
    }

    if (!products?.length) {
      return NextResponse.json(
        {
          error:
            "The products in your cart are no longer available.",
        },
        { status: 409 }
      );
    }

    const productRows =
      products as ProductRow[];

    /* =====================================================
       FETCH VARIANTS
       ===================================================== */

    let variants: VariantRow[] = [];

    if (variantIds.length) {
      const {
        data: variantData,
        error: variantsError,
      } = await db
        .from("product_variants")
        .select(
          "id,product_id,sku,size,colour,quantity,selling_price,status"
        )
        .in("id", variantIds);

      if (variantsError) {
        console.error(
          "GET VARIANTS FOR ORDER ERROR:",
          variantsError
        );

        return NextResponse.json(
          {
            error:
              "Unable to verify the selections in your cart.",
          },
          { status: 500 }
        );
      }

      variants =
        (variantData || []) as VariantRow[];
    }

    /* =====================================================
       CHECK STOCK + CALCULATE TOTAL
       ===================================================== */

    let subtotal = 0;

    const validatedItems: Array<{
      product: ProductRow;
      variant: VariantRow;
      quantity: number;
    }> = [];

    for (const item of body.items) {
      const product =
        productRows.find(
          (p) => p.id === item.id
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "One of the products in your cart could not be found.",
          },
          { status: 409 }
        );
      }

      if (product.status !== "available") {
        return NextResponse.json(
          {
            error:
              `${product.name} is no longer available.`,
          },
          { status: 409 }
        );
      }

      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return NextResponse.json(
          {
            error:
              `Invalid quantity for ${product.name}.`,
          },
          { status: 400 }
        );
      }

      /*
       * Every new cart item should carry a variantId.
       *
       * We still support a legacy product without a variant
       * so older carts do not immediately break.
       */
      if (!item.variantId) {
        return NextResponse.json(
          {
            error:
              `${product.name} needs to be selected again before checkout.`,
          },
          { status: 409 }
        );
      }

      const variant =
        variants.find(
          (v) =>
            v.id === item.variantId &&
            v.product_id === product.id
        );

      if (!variant) {
        return NextResponse.json(
          {
            error:
              `${product.name} has a selection that is no longer available.`,
          },
          { status: 409 }
        );
      }

      if (variant.status !== "available") {
        return NextResponse.json(
          {
            error:
              `${product.name} (${formatVariant(variant)}) is no longer available.`,
          },
          { status: 409 }
        );
      }

      if (
        Number(variant.quantity) <
        quantity
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} (${formatVariant(variant)}) does not have enough stock.`,
          },
          { status: 409 }
        );
      }

      const unitPrice =
        Number(variant.selling_price);

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          {
            error:
              `Invalid price for ${product.name}.`,
          },
          { status: 500 }
        );
      }

      subtotal +=
        unitPrice * quantity;

      validatedItems.push({
        product,
        variant,
        quantity,
      });
    }

    const shipping = 0;
    const total = subtotal;

    /* =====================================================
       ORDER NUMBER
       ===================================================== */

    const orderNumber =
      `TM${Date.now()
        .toString()
        .slice(-8)}${crypto
        .randomUUID()
        .slice(0, 4)
        .toUpperCase()}`;

    /* =====================================================
       CREATE ORDER
       ===================================================== */

    const {
      data: order,
      error: orderError,
    } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,

        customer_name: name,

        customer_email: email,

        customer_phone: phone,

        order_source: "whatsapp",

        user_id: userId,

        shipping_address: {
          address,
          city: verifiedCity,
          district: verifiedDistrict,
          state: verifiedState,
          pin,
          postOffice: verifiedPostOffice,
        },

        subtotal,

        shipping,

        total,

        payment_status: "pending",

        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error(
        "CREATE ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create your order. Please try again.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       ORDER ITEMS
       ===================================================== */

    const orderItems =
      validatedItems.map(
        ({
          product,
          variant,
          quantity,
        }) => ({
          order_id: order.id,

          product_id: product.id,

          variant_id: variant.id,

          product_name: product.name,

          price:
            Number(variant.selling_price),

          quantity,
        })
      );

    const {
      error: orderItemsError,
    } = await db
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error(
        "CREATE ORDER ITEMS ERROR:",
        orderItemsError
      );

      await db
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          error:
            "Your order could not be completed. Please contact sales.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       WHATSAPP MESSAGE
       ===================================================== */

    const productLines =
      validatedItems
        .map(
          ({
            product,
            variant,
            quantity,
          }) => {
            const lineTotal =
              Number(
                variant.selling_price
              ) * quantity;

            const variantText =
              formatVariant(variant);

            return `• ${product.name}${
              variantText
                ? ` — ${variantText}`
                : ""
            } × ${quantity} — ₹${lineTotal.toLocaleString(
              "en-IN"
            )}`;
          }
        )
        .join("\n");

    const whatsappMessage = `
Hello THRIFTEMIST,

I would like to book an order.

ORDER NUMBER: ${orderNumber}

CUSTOMER DETAILS
Name: ${name}
Email: ${email}
Phone: ${phone}

DELIVERY ADDRESS
${address}
${verifiedCity}
${verifiedDistrict ? verifiedDistrict + "\n" : ""}${verifiedState}
PIN: ${pin}

ORDER ITEMS
${productLines}

SUBTOTAL: ₹${subtotal.toLocaleString(
      "en-IN"
    )}
SHIPPING: To be confirmed by sales
TOTAL: ₹${total.toLocaleString(
      "en-IN"
    )}

Please confirm my order and send me the payment instructions.

Thank you.
`.trim();

    /* =====================================================
       WHATSAPP NUMBER
       ===================================================== */

    const whatsappNumber =
      process.env
        .NEXT_PUBLIC_WHATSAPP_NUMBER;

    if (!whatsappNumber) {
      console.error(
        "NEXT_PUBLIC_WHATSAPP_NUMBER is missing."
      );

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber,
        message:
          "Order created successfully, but WhatsApp is not configured.",
      });
    }

    const cleanNumber =
      whatsappNumber.replace(
        /\D/g,
        ""
      );

    const whatsappUrl =
      `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber,
      whatsappUrl,
    });
  } catch (error) {
    console.error(
      "ORDER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create your order.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   VARIANT LABEL
   ========================================================= */

function formatVariant(
  variant: VariantRow
) {
  const parts = [
    variant.colour
      ? `Colour: ${variant.colour}`
      : null,

    variant.size
      ? `Size: ${variant.size}`
      : null,

    variant.sku
      ? `SKU: ${variant.sku}`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}