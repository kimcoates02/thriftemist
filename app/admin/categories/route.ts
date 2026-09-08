import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CategoryRow = {
  category: string | null;
};

export async function GET() {
  try {
    await requireAdmin();

    const db = supabaseAdmin();

    const { data, error } = await db
      .from("products")
      .select("category")
      .not("category", "is", null)
      .order("category", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CategoryRow[];

    const categories: string[] = Array.from(
      new Set(
        rows
          .map((item: CategoryRow) =>
            String(item.category ?? "").trim()
          )
          .filter(
            (category: string) =>
              Boolean(category)
          )
      )
    ).sort(
      (a: string, b: string) =>
        a.localeCompare(b)
    );

    return NextResponse.json({
      categories,
    });
  } catch (error) {
    console.error(
      "ADMIN CATEGORIES ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load categories.";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error: "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}