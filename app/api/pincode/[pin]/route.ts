import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ pin: string }>;
  }
) {
  try {
    const { pin } = await params;

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          error: "Please enter a valid 6-digit PIN code.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to verify this PIN code.",
        },
        {
          status: 502,
        }
      );
    }

    const data = await response.json();

    const result = data?.[0];

    if (
      !result ||
      result.Status !== "Success" ||
      !Array.isArray(result.PostOffice) ||
      result.PostOffice.length === 0
    ) {
      return NextResponse.json(
        {
          error: "PIN code not found.",
        },
        {
          status: 404,
        }
      );
    }

    const office = result.PostOffice[0];

    return NextResponse.json({
      valid: true,
      pin,
      city: office.District || office.Block || office.Name || "",
      state: office.State || "",
      district: office.District || "",
      postOffice: office.Name || "",
    });
  } catch (error) {
    console.error("PIN LOOKUP ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to verify the PIN code right now.",
      },
      {
        status: 500,
      }
    );
  }
}