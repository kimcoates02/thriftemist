  "use client";

  import Link from "next/link";
  import { useEffect, useMemo, useState } from "react";

  import { useCart } from "@/components/cart-provider";
  import { money } from "@/lib/format";

  type AddressData = {
    address: string;
    city: string;
    state: string;
    pin: string;
  };

  type CustomerData = {
    name: string;
    email: string;
    phone: string;
  };

  const INDIAN_STATES = [
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu & Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  export default function Checkout() {
    const { items, total } = useCart();

    const [customer, setCustomer] = useState<CustomerData>({
      name: "",
      email: "",
      phone: "",
    });

    const [address, setAddress] = useState<AddressData>({
      address: "",
      city: "",
      state: "",
      pin: "",
    });

    const [pinLoading, setPinLoading] = useState(false);
    const [pinVerified, setPinVerified] = useState(false);
    const [pinError, setPinError] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [emailError, setEmailError] = useState("");
    const [phoneError, setPhoneError] = useState("");

    const [orderCreated, setOrderCreated] = useState(false);

    const itemCount = useMemo(
      () => items.reduce((sum, item) => sum + item.cartQty, 0),
      [items]
    );

    /*
    * ------------------------------------------------------------
    * INPUT HELPERS
    * ------------------------------------------------------------
    */

    function updateCustomer(
      field: keyof CustomerData,
      value: string
    ) {
      setCustomer((current) => ({
        ...current,
        [field]: value,
      }));

      setError("");

      if (field === "email") {
        setEmailError("");
      }

      if (field === "phone") {
        setPhoneError("");
      }
    }

    function updateAddress(
      field: keyof AddressData,
      value: string
    ) {
      setAddress((current) => ({
        ...current,
        [field]: value,
      }));

      setError("");

      if (field === "pin") {
        setPinVerified(false);
        setPinError("");
      }
    }

    /*
    * ------------------------------------------------------------
    * EMAIL VALIDATION
    * ------------------------------------------------------------
    */

    function validateEmail(email: string) {
      const value = email.trim();

      if (!value) {
        setEmailError("Email address is required.");
        return false;
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

      if (!emailPattern.test(value)) {
        setEmailError("Please enter a valid email address.");
        return false;
      }

      setEmailError("");
      return true;
    }

    /*
    * ------------------------------------------------------------
    * PHONE VALIDATION
    * ------------------------------------------------------------
    */

    function validatePhone(phone: string) {
      const value = phone.replace(/\D/g, "");

      if (!value) {
        setPhoneError("Mobile number is required.");
        return false;
      }

      if (!/^[6-9]\d{9}$/.test(value)) {
        setPhoneError(
          "Please enter a valid 10-digit Indian mobile number."
        );
        return false;
      }

      setPhoneError("");
      return true;
    }

    /*
    * ------------------------------------------------------------
    * PIN CODE LOOKUP
    * ------------------------------------------------------------
    */

    useEffect(() => {
      const pin = address.pin.trim();

      if (pin.length !== 6) {
        setPinVerified(false);
        setPinError("");
        return;
      }

      let cancelled = false;

      async function lookupPin() {
        setPinLoading(true);
        setPinVerified(false);
        setPinError("");

        try {
          const response = await fetch(
            `/api/pincode/${pin}`,
            {
              cache: "no-store",
            }
          );

          const data = await response.json();

          if (cancelled) return;

          if (!response.ok || !data.valid) {
            setPinError(
              data.error ||
                "Please enter a valid Indian PIN code."
            );
            return;
          }

          setAddress((current) => ({
            ...current,
            city: data.district || data.city || "",
            state: data.state || "",
          }));

          setPinVerified(true);
        } catch {
          if (!cancelled) {
            setPinError(
              "Unable to verify this PIN code. Please try again."
            );
          }
        } finally {
          if (!cancelled) {
            setPinLoading(false);
          }
        }
      }

      const timer = setTimeout(lookupPin, 400);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [address.pin]);

    /*
    * ------------------------------------------------------------
    * PLACE ORDER
    * ------------------------------------------------------------
    */

    async function placeOrder() {
      setError("");

      if (!items.length) {
        setError("Your cart is empty.");
        return;
      }

      const validEmail = validateEmail(customer.email);
      const validPhone = validatePhone(customer.phone);

      if (!customer.name.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (!validEmail) {
        setError("Please enter a valid email address.");
        return;
      }

      if (!validPhone) {
        setError("Please enter a valid mobile number.");
        return;
      }

      if (!address.address.trim()) {
        setError("Please enter your delivery address.");
        return;
      }

      if (!address.pin.trim()) {
        setError("Please enter your PIN code.");
        return;
      }

      if (!/^\d{6}$/.test(address.pin.trim())) {
        setError("PIN code must contain exactly 6 digits.");
        return;
      }

      if (!pinVerified) {
        setError(
          "Please wait for your PIN code to be verified."
        );
        return;
      }

      if (!address.city.trim()) {
        setError("City or district could not be verified.");
        return;
      }

      if (!address.state.trim()) {
        setError("Please select a valid Indian state or union territory.");
        return;
      }

      setLoading(true);

      try {
        /*
        * Create the order in Supabase through our server route.
        *
        * IMPORTANT:
        * We are NOT processing Razorpay here.
        *
        * Razorpay can remain configured for the future,
        * but customers currently only see the WhatsApp option.
        */

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: {
              name: customer.name.trim(),
              email: customer.email.trim(),
              phone: customer.phone.trim(),
            },

            address: {
              address: address.address.trim(),
              city: address.city.trim(),
              state: address.state.trim(),
              pin: address.pin.trim(),
            },

            items: items.map((item) => ({
  id: item.id,
  variantId: item.variantId,
  quantity: item.cartQty,
})),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to create your order request."
          );
        }

        /*
        * The server creates the order and builds the canonical
        * WhatsApp message. Use the returned URL so the browser
        * cannot accidentally use a different number or order data.
        */

        if (!data.whatsappUrl) {
          throw new Error(
            "Order created, but WhatsApp could not be prepared. Please contact sales."
          );
        }

        setOrderCreated(true);

        /*
        * Small delay so the customer sees the confirmation
        * before WhatsApp opens.
        */

        setTimeout(() => {
          window.location.href = data.whatsappUrl;
        }, 300);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create your order request."
        );

        setLoading(false);
      }
    }

    /*
    * ------------------------------------------------------------
    * EMPTY CART
    * ------------------------------------------------------------
    */

    if (!items.length) {
      return (
        <main className="min-h-[70vh] bg-[#F8F3E0] px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#B39A6B]">
              Your Selection
            </p>

            <h1 className="serif mt-5 text-6xl leading-none text-[#122018] md:text-8xl">
              Your Cart
            </h1>

            <p className="mx-auto mt-8 max-w-xl text-base leading-7 text-[#122018]/70">
              Your cart is currently empty. Explore our latest
              vintage pieces and find something that belongs
              with you.
            </p>

            <Link
              href="/shop"
              className="mt-10 inline-flex bg-[#153726] px-8 py-5 text-[10px] uppercase tracking-[0.22em] text-[#F8F3E0] transition hover:bg-[#1D4A3A]"
            >
              Explore the Collection
            </Link>
          </div>
        </main>
      );
    }

    /*
    * ------------------------------------------------------------
    * CHECKOUT PAGE
    * ------------------------------------------------------------
    */

    return (
      <main className="min-h-screen bg-[#F8F3E0] text-[#122018]">
        <div className="mx-auto max-w-[1380px] px-5 py-12 md:px-8 md:py-20">
          {/* HEADER */}

          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#B39A6B]">
              Order Request
            </p>

            <h1 className="serif mt-4 text-5xl leading-none md:text-7xl">
              Checkout
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#122018]/65">
              Complete your details below. Your order will be
              confirmed by our sales team through WhatsApp
              before payment is collected.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_460px]">
            {/* ==================================================
                CUSTOMER FORM
              ================================================== */}

            <section className="border border-[#122018]/15 bg-[#FAF6E9] p-6 md:p-8">
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#B39A6B]">
                  Customer & Shipping
                </p>

                <h2 className="serif mt-3 text-3xl md:text-4xl">
                  Delivery Details
                </h2>
              </div>

              <div className="grid gap-6">
                {/* NAME */}

                <div>
                  <label
                    htmlFor="checkout-name"
                    className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                  >
                    Full Name
                  </label>

                  <input
                    id="checkout-name"
                    type="text"
                    autoComplete="name"
                    value={customer.name}
                    onChange={(e) =>
                      updateCustomer(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Your full name"
                    className="w-full border border-black/20 bg-[#FAF6E9] px-4 py-4 text-sm text-[#122018] outline-none transition placeholder:text-[#122018]/35 focus:border-[#153726] focus:ring-1 focus:ring-[#153726]"
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="checkout-email"
                    className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                  >
                    Email Address
                  </label>

                  <input
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    value={customer.email}
                    onChange={(e) =>
                      updateCustomer(
                        "email",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      validateEmail(customer.email)
                    }
                    placeholder="you@example.com"
                    className={`w-full border bg-[#FAF6E9] px-4 py-4 text-sm text-[#122018] outline-none transition placeholder:text-[#122018]/35 focus:ring-1 ${
                      emailError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-black/20 focus:border-[#153726] focus:ring-[#153726]"
                    }`}
                  />

                  <p className="mt-2 text-[10px] text-[#122018]/50">
                    We'll use this for your order confirmation.
                  </p>

                  {emailError && (
                    <p className="mt-2 text-xs text-red-700">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* PHONE */}

                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                  >
                    Mobile Number
                  </label>

                  <input
                    id="checkout-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={customer.phone}
                    onChange={(e) =>
                      updateCustomer(
                        "phone",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    onBlur={() =>
                      validatePhone(customer.phone)
                    }
                    placeholder="10-digit mobile number"
                    className={`w-full border bg-[#FAF6E9] px-4 py-4 text-sm text-[#122018] outline-none transition placeholder:text-[#122018]/35 focus:ring-1 ${
                      phoneError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-black/20 focus:border-[#153726] focus:ring-[#153726]"
                    }`}
                  />

                  {phoneError && (
                    <p className="mt-2 text-xs text-red-700">
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* ADDRESS */}

                <div>
                  <label
                    htmlFor="checkout-address"
                    className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                  >
                    Delivery Address
                  </label>

                  <textarea
                    id="checkout-address"
                    rows={4}
                    autoComplete="street-address"
                    value={address.address}
                    onChange={(e) =>
                      updateAddress(
                        "address",
                        e.target.value
                      )
                    }
                    placeholder="House / flat number, street, locality, landmark"
                    className="w-full resize-none border border-black/20 bg-[#FAF6E9] px-4 py-4 text-sm text-[#122018] outline-none transition placeholder:text-[#122018]/35 focus:border-[#153726] focus:ring-1 focus:ring-[#153726]"
                  />
                </div>

                {/* PIN */}

                <div>
                  <label
                    htmlFor="checkout-pin"
                    className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                  >
                    PIN Code
                  </label>

                  <div className="relative">
                    <input
                      id="checkout-pin"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      value={address.pin}
                      onChange={(e) =>
                        updateAddress(
                          "pin",
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      placeholder="6-digit PIN code"
                      className={`w-full border bg-[#F8F3E0] px-4 py-4 pr-28 text-sm text-[#122018] outline-none transition placeholder:text-[#122018]/35 focus:ring-1 ${
                        pinError
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : pinVerified
                          ? "border-[#16834f] focus:border-[#153726] focus:ring-[#153726]"
                          : "border-black/20 focus:border-[#153726] focus:ring-[#153726]"
                      }`}
                    />

                    {pinLoading && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.16em] text-[#122018]/50">
                        Checking...
                      </span>
                    )}

                    {!pinLoading && pinVerified && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-medium uppercase tracking-[0.16em] text-[#16834f]">
                        Verified
                      </span>
                    )}
                  </div>

                  {pinVerified && (
                    <p className="mt-2 text-[10px] text-[#16834f]">
                      PIN verified successfully.
                    </p>
                  )}

                  {pinError && (
                    <p className="mt-2 text-xs text-red-700">
                      {pinError}
                    </p>
                  )}
                </div>

                {/* CITY + STATE */}

                <div className="grid gap-6 md:grid-cols-2">
                  {/* CITY */}

                  <div>
                    <label
                      htmlFor="checkout-city"
                      className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                    >
                      City / District
                    </label>

                    <input
                      id="checkout-city"
                      type="text"
                      value={address.city}
                      readOnly
                      placeholder="Automatically verified from PIN"
                      className="w-full border border-black/20 bg-[#EEE8D8] px-4 py-4 text-sm text-[#122018] outline-none"
                    />

                    <p className="mt-2 text-[10px] text-[#122018]/50">
                      Automatically verified from PIN.
                    </p>
                  </div>

                  {/* STATE */}

                  <div>
                    <label
                      htmlFor="checkout-state"
                      className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#122018]/65"
                    >
                      State / Union Territory
                    </label>

                    <select
                      id="checkout-state"
                      value={address.state}
                      onChange={(e) =>
                        updateAddress(
                          "state",
                          e.target.value
                        )
                      }
                      className="w-full border border-black/20 bg-[#EEE8D8] px-4 py-4 text-sm text-[#122018] outline-none focus:border-[#153726] focus:ring-1 focus:ring-[#153726]"
                    >
                      <option value="">
                        Select State / Union Territory
                      </option>

                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-[10px] text-[#122018]/50">
                      Automatically selected from PIN.
                    </p>
                  </div>
                </div>

                {/* ERROR */}

                {error && (
                  <div className="border border-red-300 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                    {error}
                  </div>
                )}

                {/* SUCCESS */}

                {orderCreated && (
                  <div className="border border-[#16834f]/30 bg-[#eaf5ef] px-4 py-4 text-sm leading-6 text-[#16643f]">
                    Your order has been created. Opening
                    WhatsApp...
                  </div>
                )}
              </div>
            </section>

            {/* ==================================================
                ORDER SUMMARY
              ================================================== */}

            <aside className="h-fit border border-[#122018]/15 bg-[#FAF6E9] p-6 md:p-8 lg:sticky lg:top-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#B39A6B]">
                Your Selection
              </p>

              <h2 className="serif mt-3 text-4xl md:text-5xl">
                Order Summary
              </h2>

              {/* ITEMS */}

              <div className="mt-8">
                {items.map((item) => {
  const variantDetails = [
    item.variantColour ? `Colour: ${item.variantColour}` : null,
    item.variantSize ? `Size: ${item.variantSize}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      key={`${item.id}:${item.variantId}`}
      className="flex gap-5 border-b border-black/10 py-5 first:pt-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-[#122018]">
          {item.name}
        </p>

        {variantDetails && (
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#122018]/55">
            {variantDetails}
          </p>
        )}

        {item.variantSku && (
          <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#122018]/40">
            SKU: {item.variantSku}
          </p>
        )}

        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#122018]/45">
          Qty: {item.cartQty}
        </p>
      </div>

      <p className="shrink-0 text-sm font-medium">
        {money(item.variantPrice * item.cartQty)}
      </p>
    </div>
  );
})}
              </div>

              {/* TOTALS */}

              <div className="mt-7 border-y border-black/15 py-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#122018]/55">
                    Subtotal
                  </span>

                  <span className="text-sm font-medium">
                    {money(total)}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#122018]/55">
                    Shipping
                  </span>

                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#122018]">
                    Confirmed by Sales
                  </span>
                </div>
              </div>

              {/* GRAND TOTAL */}

              <div className="flex items-end justify-between gap-5 py-7">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#122018]/60">
                  Total
                </span>

                <span className="serif text-4xl md:text-5xl">
                  {money(total)}
                </span>
              </div>

              {/* WHATSAPP BUTTON */}

              <button
                type="button"
                onClick={placeOrder}
                disabled={loading || pinLoading}
                className="w-full bg-[#153726] px-6 py-5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#F8F3E0] transition hover:bg-[#1D4A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B39A6B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Creating Order..."
                  : "Book Order via WhatsApp"}
              </button>

              {/* CALL SALES */}

              <a
                href={`tel:${
                  process.env.NEXT_PUBLIC_SALES_PHONE ||
                  "917006322899"
                }`}
                className="mt-3 flex w-full items-center justify-center border border-[#153726]/35 bg-[#F6F1E3] px-6 py-5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#122018] transition hover:border-[#153726] hover:bg-[#153726] hover:text-[#F8F3E0]"
              >
                Call Sales Team
              </a>

              {/* PAYMENT NOTE */}

              <div className="mt-7 border-t border-black/10 pt-6">
                <p className="text-xs leading-6 text-[#122018]/60">
                  Our sales team will confirm your order
                  and send your payment instructions
                  separately.
                </p>

                <p className="mt-4 text-xs leading-6 text-[#122018]/60">
                  Online payment is currently unavailable
                  to customers. Secure online payment can
                  be enabled later without changing your
                  order system.
                </p>
              </div>

              {/* CART INFO */}

              <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-5">
                <span className="text-[9px] uppercase tracking-[0.18em] text-[#122018]/45">
                  Pieces
                </span>

                <span className="text-[10px] uppercase tracking-[0.16em]">
                  {itemCount}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  }