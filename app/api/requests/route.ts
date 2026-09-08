import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function validPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone);

    const brand = clean(body.brand);
    const category = clean(body.category);
    const size = clean(body.size);
    const colour = clean(body.colour);
    const budget = clean(body.budget);
    const notes = clean(body.notes);

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Please enter a valid name." },
        { status: 400 }
      );
    }

    if (!validEmail(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (phone && !validPhone(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    if (brand.length > 100) {
      return NextResponse.json(
        { error: "Brand name is too long." },
        { status: 400 }
      );
    }

    if (category.length > 100) {
      return NextResponse.json(
        { error: "Category is too long." },
        { status: 400 }
      );
    }

    if (size.length > 50) {
      return NextResponse.json(
        { error: "Size is too long." },
        { status: 400 }
      );
    }

    if (colour.length > 100) {
      return NextResponse.json(
        { error: "Colour is too long." },
        { status: 400 }
      );
    }

    if (budget.length > 100) {
      return NextResponse.json(
        { error: "Budget is too long." },
        { status: 400 }
      );
    }

    if (notes.length > 5000) {
      return NextResponse.json(
        { error: "Notes are too long." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin()
      .from("similar_piece_requests")
      .insert({
        name,
        email,
        phone: phone || null,
        brand: brand || null,
        category: category || null,
        size: size || null,
        colour: colour || null,
        budget: budget || null,
        notes: notes || null,
        status: "new",
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("SIMILAR REQUEST ERROR:", error);

    return NextResponse.json(
      { error: "Unable to submit request" },
      { status: 400 }
    );
  }
}