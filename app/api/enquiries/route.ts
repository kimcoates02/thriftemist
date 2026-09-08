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
    const subject = clean(body.subject);
    const message = clean(body.message);

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

    if (subject.length > 150) {
      return NextResponse.json(
        { error: "Subject is too long." },
        { status: 400 }
      );
    }

    if (message.length < 5 || message.length > 5000) {
      return NextResponse.json(
        { error: "Please enter a valid message." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin()
      .from("enquiries")
      .insert({
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        status: "new",
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ENQUIRY ERROR:", error);

    return NextResponse.json(
      { error: "Unable to submit enquiry" },
      { status: 400 }
    );
  }
}