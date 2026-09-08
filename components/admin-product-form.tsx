"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type ExistingImage = {
  id: string;
  url: string;
  sort_order: number;
  variant_colour?: string | null;
};type ImageItem =
  | {
      type: "existing";
      id: string;
      url: string;
      variantColour: string;
    }
  | {
      type: "new";
      key: string;
      file: File;
      url: string;
      variantColour: string;
    };

type VariantRow = {
  id?: string;
  sku?: string | null;
  size: string;
  colour: string;
  quantity: string;
  costPrice: string;
  sellingPrice: string;
  status: "available" | "sold" | "archived";
};

type ProductValues = {
  id?: string;
  name: string;
  price: number | string;
  brand: string;
  category: string;
  source: "vintage" | "surplus" | "new";
  size: string;
  colour: string;
  condition: string;
  material: string;
  description: string;
  measurements: string;
  tags: string;
  status: "available" | "reserved" | "sold" | "archived";
  quantity: number | string;
  costPrice?: number | string | null;
  soldPrice?: number | string | null;
  soldVia?: string | null;
  soldAt?: string | null;
  internalNotes?: string | null;
  sku?: string | null;
  dropName?: string | null;
  images?: ExistingImage[];
  variants?: {
    id: string;
    sku: string;
    size?: string | null;
    colour?: string | null;
    quantity: number;
    cost_price: number;
    selling_price: number;
    status: "available" | "sold" | "archived";
  }[];
};

type AdminProductFormProps = {
  mode: "new" | "edit";
  product?: ProductValues;
};

const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "ONE SIZE",
  "CUSTOM",
];

const SALE_CHANNELS = [
  {
    value: "offline_store",
    label: "Offline Store",
  },
  {
    value: "instagram",
    label: "Instagram",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
  },
  {
    value: "website",
    label: "Website",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function AdminProductForm({
  mode,
  product,
}: AdminProductFormProps) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /* --------------------------------------------------------------------------
  | SALES STATE
  | -------------------------------------------------------------------------- */

  const [saleBusy, setSaleBusy] = useState(false);
  const [saleMsg, setSaleMsg] = useState("");

  const [currentQuantity, setCurrentQuantity] = useState(
    Number(product?.quantity ?? 0)
  );

  const [selectedSaleVariantId, setSelectedSaleVariantId] =
  useState("");

const [saleQuantity, setSaleQuantity] = useState("1");

const [salePrice, setSalePrice] = useState(
  String(product?.price ?? "")
);

  const [saleVia, setSaleVia] = useState("");

  const [saleNotes, setSaleNotes] = useState("");

  /* --------------------------------------------------------------------------
  | CATEGORY STATE
  | -------------------------------------------------------------------------- */

  const [categories, setCategories] = useState<string[]>([]);

  const [categoryValue, setCategoryValue] = useState(
    product?.category || ""
  );

  const [customCategory, setCustomCategory] = useState("");

  /* --------------------------------------------------------------------------
  | SOURCE / STATUS STATE
  | -------------------------------------------------------------------------- */

  const [sourceValue, setSourceValue] = useState<
    "vintage" | "surplus" | "new"
  >(product?.source || "vintage");

  const [statusValue, setStatusValue] = useState<
    "available" | "reserved" | "sold" | "archived"
  >(product?.status || "available");

  /* --------------------------------------------------------------------------
  | SOLD DATE & TIME
  | -------------------------------------------------------------------------- */

  function getLocalDateTimeValue(date = new Date()) {
    const pad = (value: number) =>
      String(value).padStart(2, "0");

    return (
      `${date.getFullYear()}-${pad(
        date.getMonth() + 1
      )}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  const [soldAtValue, setSoldAtValue] = useState(() => {
    if (product?.soldAt) {
      const date = new Date(product.soldAt);

      if (!Number.isNaN(date.getTime())) {
        return getLocalDateTimeValue(date);
      }
    }

    return "";
  });

  /* --------------------------------------------------------------------------
  | VARIANT STATE
  | -------------------------------------------------------------------------- */

  const [variants, setVariants] = useState<VariantRow[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size || "",
        colour: variant.colour || "",
        quantity: String(variant.quantity ?? 0),
        costPrice: String(variant.cost_price ?? 0),
        sellingPrice: String(
          variant.selling_price ?? product.price ?? 0
        ),
        status: variant.status,
      }));
    }

    return [
      {
        size: product?.size || "",
        colour: product?.colour || "",
        quantity: String(product?.quantity ?? 1),
        costPrice: String(product?.costPrice ?? 0),
        sellingPrice: String(product?.price ?? 0),
        status:
          product?.status === "archived"
            ? "archived"
            : product?.status === "sold"
              ? "sold"
              : "available",
      },
    ];
  });

  /* --------------------------------------------------------------------------
  | IMAGE STATE
  | -------------------------------------------------------------------------- */

  const [items, setItems] = useState<ImageItem[]>(() =>
    (product?.images || [])
      .slice()
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order
      )
      .map((image) => ({
  type: "existing" as const,
  id: image.id,
  url: image.url,
  variantColour: image.variant_colour || "",
}))
  );

  /* --------------------------------------------------------------------------
  | LOAD CATEGORIES
  | -------------------------------------------------------------------------- */

  async function loadCategories() {
    try {
      const response = await fetch(
        "/api/admin/products",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load products."
        );
      }

      const data = await response.json();

      const uniqueCategories: string[] =
        Array.from(
          new Set<string>(
            (data.products || [])
              .map(
                (item: {
                  category?: string | null;
                }) =>
                  String(
                    item.category || ""
                  ).trim()
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

      setCategories(uniqueCategories);
    } catch (error) {
      console.error(
        "LOAD CATEGORIES ERROR:",
        error
      );

      setCategories([]);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  /* --------------------------------------------------------------------------
  | LOAD VARIANTS
  | -------------------------------------------------------------------------- */

  useEffect(() => {
  if (
    mode !== "edit" ||
    !product?.id
  ) {
    return;
  }

  const productId = product.id;
  const productPrice = product.price;

  async function loadVariants() {
    try {
      const response = await fetch(
        `/api/admin/products/${productId}/variants`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load variants."
        );
      }

      const loaded =
        Array.isArray(data.variants)
          ? data.variants
          : [];

      if (loaded.length === 0) {
        return;
      }

      setVariants(
        loaded.map(
          (variant: {
            id: string;
            sku: string;
            size?: string | null;
            colour?: string | null;
            quantity: number;
            cost_price: number;
            selling_price: number;
            status:
              | "available"
              | "sold"
              | "archived";
          }) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size || "",
            colour:
              variant.colour || "",
            quantity: String(
              variant.quantity ?? 0
            ),
            costPrice: String(
              variant.cost_price ?? 0
            ),
            sellingPrice: String(
              variant.selling_price ??
                productPrice ??
                0
            ),
            status: variant.status,
          })
        )
      );
    } catch (error) {
      console.error(
        "LOAD VARIANTS ERROR:",
        error
      );
    }
  }

  loadVariants();
}, [
  mode,
  product?.id,
  product?.price,
]);

  /* --------------------------------------------------------------------------
  | VARIANT FUNCTIONS
  | -------------------------------------------------------------------------- */

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        size: "",
        colour: "",
        quantity: "0",
        costPrice: "",
        sellingPrice: String(
          product?.price ?? ""
        ),
        status: "available",
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, variantIndex) =>
          variantIndex !== index
      );
    });
  }

  function updateVariant(
    index: number,
    field: keyof VariantRow,
    value: string
  ) {
    setVariants((current) =>
      current.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                [field]:
                  field === "status"
                    ? (value as VariantRow["status"])
                    : value,
              }
            : variant
      )
    );
  }

  function getTotalVariantQuantity() {
    return variants.reduce(
      (total, variant) =>
        total +
        Math.max(
          0,
          Number(variant.quantity) || 0
        ),
      0
    );
  }

  function getSelectedSaleVariant() {
    return variants.find(
      (variant) => variant.id === selectedSaleVariantId
    );
  }

  function getVariantColours() {
    return Array.from(
      new Set(
        variants
          .map((variant) => variant.colour.trim())
          .filter(Boolean)
      )
    );
  }

  /* --------------------------------------------------------------------------
  | IMAGE FUNCTIONS
  | -------------------------------------------------------------------------- */

  function addFiles(
    fileList: FileList | null
  ) {
    if (!fileList) {
      return;
    }

    const added: ImageItem[] =
      Array.from(fileList)
        .filter((file) =>
          file.type.startsWith("image/")
        )
        .map((file, index) => ({
  type: "new" as const,
  key: `${Date.now()}-${index}-${file.name}`,
  file,
  url: URL.createObjectURL(file),
  variantColour: "",
}));

    setItems((current) => [
      ...current,
      ...added,
    ]);
  }

  function removeImage(index: number) {
    setItems((current) => {
      const item = current[index];

      if (item?.type === "new") {
        URL.revokeObjectURL(item.url);
      }

      return current.filter(
        (_, i) => i !== index
      );
    });
  }

  function moveImage(
    index: number,
    direction: -1 | 1
  ) {
    setItems((current) => {
      const next = index + direction;

      if (
        next < 0 ||
        next >= current.length
      ) {
        return current;
      }

      const copy = [...current];

      [copy[index], copy[next]] = [
        copy[next],
        copy[index],
      ];

      return copy;
    });
  }

  /* --------------------------------------------------------------------------
  | SAVE PRODUCT
  | -------------------------------------------------------------------------- */

  async function submit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setBusy(true);
    setMsg("");

    /* ------------------------------------------------------------------------
    | IMAGE VALIDATION
    ------------------------------------------------------------------------ */

    if (items.length === 0) {
      setMsg(
        "Please add at least one product image."
      );
      setBusy(false);
      return;
    }

    /* ------------------------------------------------------------------------
    | CATEGORY
    ------------------------------------------------------------------------ */

    const finalCategory =
      categoryValue === "__custom__"
        ? customCategory.trim()
        : categoryValue.trim();

    if (!finalCategory) {
      setMsg(
        "Please select or enter a category."
      );
      setBusy(false);
      return;
    }

    /* ------------------------------------------------------------------------
    | VARIANT VALIDATION
    ------------------------------------------------------------------------ */

    if (variants.length === 0) {
      setMsg(
        "Please add at least one inventory variant."
      );
      setBusy(false);
      return;
    }

    const cleanedVariants =
      variants.map((variant) => ({
        ...(variant.id
          ? { id: variant.id }
          : {}),
        size:
          variant.size.trim() || null,
        colour:
          variant.colour.trim() || null,
        quantity: Math.max(
          0,
          Number(variant.quantity) || 0
        ),
        cost_price: Math.max(
          0,
          Number(variant.costPrice) || 0
        ),
        selling_price: Math.max(
          0,
          Number(variant.sellingPrice) || 0
        ),
        status: variant.status,
      }));

    /* ------------------------------------------------------------------------
    | DUPLICATE VARIANT VALIDATION
    ------------------------------------------------------------------------ */

    const variantKeys =
      new Set<string>();

    for (
      let index = 0;
      index < cleanedVariants.length;
      index++
    ) {
      const variant =
        cleanedVariants[index];

      const size =
        variant.size || "";

      const colour =
        variant.colour || "";

      const key =
        `${size.toLowerCase()}::${colour.toLowerCase()}`;

      if (variantKeys.has(key)) {
        setMsg(
          `Duplicate variant at row ${
            index + 1
          }. Each size and colour combination must be unique.`
        );
        setBusy(false);
        return;
      }

      variantKeys.add(key);

      if (
        !Number.isInteger(
          variant.quantity
        )
      ) {
        setMsg(
          `Quantity in variant ${
            index + 1
          } must be a whole number.`
        );
        setBusy(false);
        return;
      }

      if (
        variant.status === "sold" &&
        variant.quantity > 0
      ) {
        setMsg(
          `Sold variant ${
            index + 1
          } must have zero quantity.`
        );
        setBusy(false);
        return;
      }
    }

    /* ------------------------------------------------------------------------
    | FORM DATA
    ------------------------------------------------------------------------ */

    const form = new FormData(
      e.currentTarget
    );

    form.set(
      "category",
      finalCategory
    );

    form.set(
      "source",
      sourceValue
    );

    if (mode === "edit") {
      form.set(
        "status",
        statusValue
      );

      /*
       * Variants now control inventory.
       * Do not send the old product-level
       * quantity field.
       */
      form.delete("quantity");

      if (statusValue !== "sold") {
        form.delete("sold_via");
        form.delete("sold_price");
        form.delete("sold_at");
      }
    }

    /* ------------------------------------------------------------------------
    | IMAGES
    | ------------------------------------------------------------------------ */

    const newItems =
      items.filter(
        (
          item
        ): item is Extract<
          ImageItem,
          { type: "new" }
        > =>
          item.type === "new"
      );

    form.delete("images");

    newItems.forEach((item) => {
      form.append(
        "images",
        item.file
      );
    });

    /* ------------------------------------------------------------------------
    | IMAGE ORDER
    | ------------------------------------------------------------------------ */

    form.set(
      "image_order",
      JSON.stringify(
        items.map((item) =>
          item.type === "existing"
            ? {
                type: "existing",
                id: item.id,
                variant_colour: item.variantColour.trim() || null,
              }
            : {
                type: "new",
                key: item.key,
                variant_colour: item.variantColour.trim() || null,
              }
        )
      )
    );

    /* ------------------------------------------------------------------------
    | API URL
    | ------------------------------------------------------------------------ */

    const url =
      mode === "new"
        ? "/api/admin/products"
        : `/api/admin/products/${product?.id}`;

    try {
      /* ----------------------------------------------------------------------
      | SAVE PRODUCT
      ---------------------------------------------------------------------- */

      const response = await fetch(
        url,
        {
          method:
            mode === "new"
              ? "POST"
              : "PATCH",
          body: form,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save product."
        );
      }

      const productId =
        mode === "new"
          ? data.id
          : product?.id;

      if (!productId) {
        throw new Error(
          "Product was saved, but its ID could not be determined."
        );
      }

      /* ----------------------------------------------------------------------
      | SAVE VARIANTS
      ---------------------------------------------------------------------- */

      const variantResponse =
        await fetch(
          `/api/admin/products/${productId}/variants`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              variants:
                cleanedVariants,
            }),
          }
        );

      const variantData =
        await variantResponse.json();

      if (!variantResponse.ok) {
        throw new Error(
          variantData.error ||
            "Product saved, but variants could not be saved."
        );
      }

      router.push(
        "/admin/products"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "SAVE PRODUCT ERROR:",
        error
      );

      setMsg(
        error instanceof Error
          ? error.message
          : "Failed to save product."
      );

      setBusy(false);
    }
  }

  /* --------------------------------------------------------------------------
  | RECORD SALE
  | -------------------------------------------------------------------------- */
async function recordSale(
  quantityOverride?: number
) {
  if (
    mode !== "edit" ||
    !product?.id
  ) {
    return;
  }

  const selectedVariant =
    getSelectedSaleVariant();

  if (!selectedVariant?.id) {
    setSaleMsg(
      "Please select the exact variant being sold."
    );
    return;
  }

  const availableQuantity =
    Math.max(
      0,
      Number(selectedVariant.quantity) || 0
    );

  const quantity =
    quantityOverride ??
    Number(saleQuantity);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    setSaleMsg(
      "Please enter a valid quantity."
    );
    return;
  }

  if (quantity > availableQuantity) {
    setSaleMsg(
      `Only ${availableQuantity} unit${
        availableQuantity === 1
          ? ""
          : "s"
      } available for this variant.`
    );
    return;
  }

  const price =
    Number(salePrice);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    setSaleMsg(
      "Please enter a valid sale price."
    );
    return;
  }

  if (!saleVia) {
    setSaleMsg(
      "Please select where the product was sold."
    );
    return;
  }

  setSaleBusy(true);
  setSaleMsg("");

  try {
    const response =
      await fetch(
        `/api/admin/products/${product.id}/sales`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            variantId:
              selectedVariant.id,
            quantity,
            unitPrice: price,
            soldVia: saleVia,
            notes: saleNotes,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to record sale."
      );
    }

    const remaining =
      Number(
        data.variant?.quantity ?? 0
      );

    /*
     * Update the exact variant in local state.
     */
    setVariants((current) =>
      current.map((variant) =>
        variant.id ===
        selectedVariant.id
          ? {
              ...variant,
              quantity:
                String(remaining),
              status:
                data.variant?.status ??
                variant.status,
            }
          : variant
      )
    );

    /*
     * Keep the parent product quantity
     * in sync with the server response.
     */
    setCurrentQuantity(
      Number(
        data.product?.quantity ??
          Math.max(
            0,
            currentQuantity - quantity
          )
      )
    );

    setSaleQuantity("1");
    setSaleNotes("");

    /*
     * If the sold variant is now empty,
     * automatically select another
     * available variant if one exists.
     */
    if (remaining === 0) {
      const nextVariant =
        variants.find(
          (variant) =>
            variant.id !==
              selectedVariant.id &&
            variant.status ===
              "available" &&
            Number(variant.quantity) > 0
        );

      if (nextVariant?.id) {
        setSelectedSaleVariantId(
          nextVariant.id
        );
        setSalePrice(
          nextVariant.sellingPrice
        );
      } else {
        setSelectedSaleVariantId("");
      }
    }

    const variantLabel = [
      selectedVariant.colour
        ? selectedVariant.colour
        : null,
      selectedVariant.size
        ? selectedVariant.size
        : null,
    ]
      .filter(Boolean)
      .join(" / ");

    setSaleMsg(
      remaining === 0
        ? `Sale recorded. ${variantLabel || "This variant"} is now sold out.`
        : `Sale recorded. ${remaining} unit${
            remaining === 1
              ? ""
              : "s"
          } of ${
            variantLabel || "this variant"
          } remaining.`
    );
  } catch (error) {
    console.error(
      "RECORD SALE ERROR:",
      error
    );

    setSaleMsg(
      error instanceof Error
        ? error.message
        : "Failed to record sale."
    );
  } finally {
    setSaleBusy(false);
  }
}

  /* --------------------------------------------------------------------------
  | UI
  | -------------------------------------------------------------------------- */

  return (
    <div>
      {/* HEADER */}

      <p className="text-xs uppercase tracking-widest text-[#B39A6B]">
        Inventory
      </p>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="serif text-5xl">
          {mode === "new"
            ? "Add Product"
            : "Edit Product"}
        </h1>

        {mode === "edit" && (
          <div className="text-right text-[10px] uppercase tracking-[.18em] text-black/45">
            <div>SKU</div>

            <div className="mt-1 text-black">
              {product?.sku ||
                "Assigned by system"}
            </div>

            {product?.dropName && (
              <div className="mt-2">
                {product.dropName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FORM */}

      <form
        onSubmit={submit}
        className="mt-8 grid gap-4 bg-[#F1EBDD] p-6 md:grid-cols-2"
      >
        {/* PRODUCT NAME */}

        <input
          name="name"
          required
          defaultValue={
            product?.name || ""
          }
          placeholder="Product Name *"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* PRICE */}

        <input
          name="price"
          required
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            product?.price ?? ""
          }
          placeholder="Base Price *"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* BRAND */}

        <input
          name="brand"
          defaultValue={
            product?.brand || ""
          }
          placeholder="Brand"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* PRODUCT SOURCE */}

        <div className="border border-[#CFC5B3] bg-[#FAF6E9] p-4 md:col-span-2">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-[.2em] text-[#9A7B42]">
              Product Source *
            </p>

            <p className="mt-1 text-xs text-[#5F625C]">
              Tell customers whether
              this piece is Vintage,
              Surplus, or New.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                value: "vintage",
                label: "Vintage",
                note: "Pre-owned / vintage find",
              },
              {
                value: "surplus",
                label: "Surplus",
                note: "Deadstock / excess stock",
              },
              {
                value: "new",
                label: "New",
                note: "Brand-new piece",
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer border p-4 transition ${
                  sourceValue ===
                  option.value
                    ? "border-[#153726] bg-[#EAF1ED]"
                    : "border-[#D8D0C0] bg-[#F6F1E3] hover:border-[#153726]"
                }`}
              >
                <input
                  type="radio"
                  name="source"
                  value={
                    option.value
                  }
                  checked={
                    sourceValue ===
                    option.value
                  }
                  onChange={() =>
                    setSourceValue(
                      option.value as
                        | "vintage"
                        | "surplus"
                        | "new"
                    )
                  }
                  className="sr-only"
                />

                <span className="block text-xs font-medium uppercase tracking-[.15em] text-[#14251D]">
                  {option.label}
                </span>

                <span className="mt-1 block text-[10px] leading-4 text-[#6D706A]">
                  {option.note}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* CATEGORY */}

        <select
          name="category"
          required
          value={categoryValue}
          onChange={(e) => {
            setCategoryValue(
              e.target.value
            );

            if (
              e.target.value !==
              "__custom__"
            ) {
              setCustomCategory("");
            }
          }}
          className="border border-black/60 bg-transparent p-3 outline-none"
        >
          <option value="">
            Select Category *
          </option>

          {categories.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}

          <option value="__custom__">
            + Add New Category
          </option>
        </select>

        {/* CUSTOM CATEGORY */}

        {categoryValue ===
          "__custom__" && (
          <input
            type="text"
            value={customCategory}
            onChange={(e) =>
              setCustomCategory(
                e.target.value
              )
            }
            placeholder="Enter new category"
            className="border border-black/60 bg-transparent p-3 outline-none md:col-span-2"
          />
        )}

        {/* CONDITION */}

        <input
          name="condition"
          required
          defaultValue={
            product?.condition || ""
          }
          placeholder="Condition *"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* MATERIAL */}

        <input
          name="material"
          defaultValue={
            product?.material || ""
          }
          placeholder="Material"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* ADMIN-ONLY BASE COST */}

        <input
          name="cost_price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            product?.costPrice ?? ""
          }
          placeholder="Base Cost Price (Admin Only)"
          className="border border-black/60 bg-transparent p-3 outline-none"
        />

        {/* INTERNAL NOTES */}

        <textarea
          name="internal_notes"
          defaultValue={
            product?.internalNotes ||
            ""
          }
          placeholder="Internal Notes — admin only"
          rows={3}
          className="border border-black/60 bg-transparent p-3 outline-none md:col-span-2"
        />

        {/* --------------------------------------------------------------------
            VARIANTS & INVENTORY
        -------------------------------------------------------------------- */}

        <div className="border border-[#CFC5B3] bg-[#FAF6E9] p-5 md:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.2em] text-[#9A7B42]">
                Inventory
              </p>

              <h2 className="serif mt-1 text-3xl">
                Variants & Inventory
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5F625C]">
                Use one row for each
                colour and size
                combination. Every
                variant has its own
                stock, cost, selling
                price and SKU.
              </p>
            </div>

            <button
              type="button"
              onClick={
                addVariant
              }
              className="w-fit border border-[#153726] px-4 py-3 text-[10px] uppercase tracking-[.16em] text-[#153726] transition hover:bg-[#153726] hover:text-[#F8F3E0]"
            >
              + Add Variant
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {variants.map(
              (
                variant,
                index
              ) => (
                <div
                  key={
                    variant.id ||
                    `new-variant-${index}`
                  }
                  className="border border-[#D8D0C0] bg-[#F1EBDD] p-4"
                >
                  {/* VARIANT HEADER */}

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[.16em] text-black/45">
                      Variant{" "}
                      {index + 1}
                    </p>

                    {variant.sku && (
                      <p className="text-[10px] uppercase tracking-[.12em] text-black/40">
                        SKU:{" "}
                        {
                          variant.sku
                        }
                      </p>
                    )}
                  </div>

                  {/* VARIANT FIELDS */}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    {/* COLOUR */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Colour
                      </label>

                      <input
                        value={
                          variant.colour
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "colour",
                            e.target
                              .value
                          )
                        }
                        placeholder="Colour"
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      />
                    </div>

                    {/* SIZE */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Size
                      </label>

                      <select
                        value={
                          variant.size
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "size",
                            e.target
                              .value
                          )
                        }
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      >
                        <option value="">
                          Size
                        </option>

                        {SIZE_OPTIONS.map(
                          (size) => (
                            <option
                              key={
                                size
                              }
                              value={
                                size
                              }
                            >
                              {size}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* QUANTITY */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          variant.quantity
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "quantity",
                            e.target
                              .value
                          )
                        }
                        placeholder="Quantity"
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      />
                    </div>

                    {/* COST */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Cost / Unit
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          variant.costPrice
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "costPrice",
                            e.target
                              .value
                          )
                        }
                        placeholder="Cost"
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      />
                    </div>

                    {/* SELLING PRICE */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Selling Price
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          variant.sellingPrice
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "sellingPrice",
                            e.target
                              .value
                          )
                        }
                        placeholder="Selling Price"
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      />
                    </div>

                    {/* STATUS */}

                    <div>
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Status
                      </label>

                      <select
                        value={
                          variant.status
                        }
                        onChange={(
                          e
                        ) =>
                          updateVariant(
                            index,
                            "status",
                            e.target
                              .value
                          )
                        }
                        className="w-full border border-black/40 bg-transparent p-3 outline-none"
                      >
                        <option value="available">
                          Available
                        </option>

                        <option value="sold">
                          Sold
                        </option>

                        <option value="archived">
                          Archived
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* REMOVE */}

                  {variants.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeVariant(
                          index
                        )
                      }
                      className="mt-3 text-[10px] uppercase tracking-[.16em] text-red-700 underline underline-offset-4"
                    >
                      Remove Variant
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          {/* INVENTORY SUMMARY */}

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#D8D0C0] pt-4 text-xs text-[#5F625C]">
            <span>
              <strong className="text-[#153726]">
                {
                  variants.length
                }
              </strong>{" "}
              variant
              {variants.length ===
              1
                ? ""
                : "s"}
            </span>

            <span>
              <strong className="text-[#153726]">
                {
                  getTotalVariantQuantity()
                }
              </strong>{" "}
              total unit
              {getTotalVariantQuantity() ===
              1
                ? ""
                : "s"}{" "}
              in stock
            </span>
          </div>

          <p className="mt-3 text-[10px] leading-4 text-black/40">
            Each colour + size
            combination is treated
            as separate inventory.
            For one-of-one vintage
            pieces, simply keep one
            variant with quantity 1.
          </p>
        </div>

        {/* --------------------------------------------------------------------
            EDIT ONLY
        -------------------------------------------------------------------- */}

        {mode === "edit" && (
          <>
            {/* RECORD SALE */}

            {currentQuantity > 0 &&
              statusValue !==
                "sold" && (
                <div className="border border-[#CFC5B3] bg-[#FAF6E9] p-5 md:col-span-2">
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-[.2em] text-[#9A7B42]">
                      Sales
                    </p>

                    <h2 className="serif mt-1 text-3xl">
                      Record Sale
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[#5F625C]">
                      Record individual
                      sales against
                      inventory.
                    </p>
                  </div>

                  <div>
  {/* SELECT VARIANT */}

  <div className="mb-5 border border-[#D8D0C0] bg-[#F1EBDD] p-4">
    <label className="mb-2 block text-[10px] uppercase tracking-[.16em] text-black/50">
      Variant to Sell
    </label>

    <select
      value={selectedSaleVariantId}
      onChange={(e) => {
        const variantId =
          e.target.value;

        setSelectedSaleVariantId(
          variantId
        );

        const selected =
          variants.find(
            (variant) =>
              variant.id ===
              variantId
          );

        if (selected) {
          setSalePrice(
            selected.sellingPrice
          );
          setSaleQuantity("1");
        }
      }}
      className="w-full border border-black/60 bg-[#FAF6E9] p-3 outline-none"
    >
      <option value="">
        Select Variant *
      </option>

      {variants.map(
        (variant, index) => {
          const quantity =
            Math.max(
              0,
              Number(
                variant.quantity
              ) || 0
            );

          const details = [
            variant.colour
              ? variant.colour
              : null,
            variant.size
              ? variant.size
              : null,
          ]
            .filter(Boolean)
            .join(" / ");

          const label =
            details ||
            `Variant ${index + 1}`;

          return (
            <option
              key={
                variant.id ||
                `variant-${index}`
              }
              value={
                variant.id || ""
              }
              disabled={
                !variant.id ||
                variant.status !==
                  "available" ||
                quantity <= 0
              }
            >
              {label} —{" "}
              {variant.sku ||
                "No SKU"} —{" "}
              {quantity} available
            </option>
          );
        }
      )}
    </select>

    {selectedSaleVariantId && (
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[.12em] text-black/45">
        {(() => {
          const selected =
            getSelectedSaleVariant();

          if (!selected) {
            return null;
          }

          return (
            <>
              <span>
                SKU:{" "}
                <strong className="text-[#153726]">
                  {selected.sku ||
                    "—"}
                </strong>
              </span>

              <span>
                Available:{" "}
                <strong className="text-[#153726]">
                  {selected.quantity}
                </strong>
              </span>

              <span>
                Cost:{" "}
                <strong className="text-[#153726]">
                  ₹
                  {Number(
                    selected.costPrice ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </span>
            </>
          );
        })()}
      </div>
    )}
  </div>

  {/* SALE FIELDS */}

  <div className="grid gap-3 md:grid-cols-3">
    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-[.16em] text-black/50">
        Quantity Sold
      </label>

      <input
        type="number"
        min="1"
        max={
          getSelectedSaleVariant()
            ? Math.max(
                1,
                Number(
                  getSelectedSaleVariant()
                    ?.quantity
                ) || 0
              )
            : undefined
        }
        value={saleQuantity}
        onChange={(e) =>
          setSaleQuantity(
            e.target.value
          )
        }
        className="w-full border border-black/60 bg-transparent p-3 outline-none"
      />
    </div>

    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-[.16em] text-black/50">
        Actual Sale Price / Piece
      </label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={salePrice}
        onChange={(e) =>
          setSalePrice(
            e.target.value
          )
        }
        className="w-full border border-black/60 bg-transparent p-3 outline-none"
      />
    </div>

    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-[.16em] text-black/50">
        Sold Via
      </label>

      <select
        value={saleVia}
        onChange={(e) =>
          setSaleVia(
            e.target.value
          )
        }
        className="w-full border border-black/60 bg-[#FAF6E9] p-3 outline-none"
      >
        <option value="">
          Select Channel *
        </option>

        {SALE_CHANNELS.map(
          (channel) => (
            <option
              key={channel.value}
              value={
                channel.value
              }
            >
              {channel.label}
            </option>
          )
        )}
      </select>
    </div>
  </div>

  <textarea
    value={saleNotes}
    onChange={(e) =>
      setSaleNotes(
        e.target.value
      )
    }
    placeholder="Sale notes — optional"
    rows={3}
    className="mt-3 w-full border border-black/60 bg-transparent p-3 outline-none"
  />

  {selectedSaleVariantId &&
    (() => {
      const selected =
        getSelectedSaleVariant();

      if (!selected) {
        return null;
      }

      const quantity =
        Number(saleQuantity) || 0;

      const price =
        Number(salePrice) || 0;

      const cost =
        Number(
          selected.costPrice
        ) || 0;

      const revenue =
        quantity * price;

      const cogs =
        quantity * cost;

      const profit =
        revenue - cogs;

      return (
        <div className="mt-4 border border-[#D8D0C0] bg-[#F1EBDD] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[9px] uppercase tracking-[.14em] text-black/45">
                Revenue
              </p>

              <p className="mt-1 text-lg text-[#153726]">
                ₹
                {revenue.toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[.14em] text-black/45">
                COGS
              </p>

              <p className="mt-1 text-lg text-black/65">
                ₹
                {cogs.toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[.14em] text-black/45">
                Gross Profit
              </p>

              <p className="mt-1 text-lg font-medium text-[#153726]">
                ₹
                {profit.toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>
          </div>
        </div>
      );
    })()}

  <div className="mt-4 flex flex-wrap gap-3">
    <button
      type="button"
      disabled={
        saleBusy ||
        !selectedSaleVariantId
      }
      onClick={() =>
        recordSale()
      }
      className="bg-[#153726] px-5 py-3 text-[10px] uppercase tracking-[.16em] text-[#F8F3E0] disabled:opacity-50"
    >
      {saleBusy
        ? "Recording..."
        : "Record Sale"}
    </button>

    {selectedSaleVariantId && (
      <button
        type="button"
        disabled={saleBusy}
        onClick={() => {
          const selected =
            getSelectedSaleVariant();

          const quantity =
            Number(
              selected?.quantity || 0
            );

          if (
            quantity > 0 &&
            window.confirm(
              `Mark all ${quantity} remaining ${
                selected?.colour ||
                selected?.size ||
                "variant"
              } units as sold?`
            )
          ) {
            recordSale(quantity);
          }
        }}
        className="border border-[#153726] px-5 py-3 text-[10px] uppercase tracking-[.16em] text-[#153726] disabled:opacity-50"
      >
        Mark Variant Lot
        as Sold
      </button>
    )}
  </div>

  {saleMsg && (
    <p
      className={`mt-4 text-sm ${
        saleMsg
          .toLowerCase()
          .includes("failed") ||
        saleMsg
          .toLowerCase()
          .includes("please") ||
        saleMsg
          .toLowerCase()
          .includes("only") ||
        saleMsg
          .toLowerCase()
          .includes("not found") ||
        saleMsg
          .toLowerCase()
          .includes("already")
          ? "text-red-700"
          : "text-[#153726]"
      }`}
    >
      {saleMsg}
    </p>
  )}
</div>
                </div>
              )}

            {/* STATUS */}

            <select
              name="status"
              value={statusValue}
              onChange={(e) => {
                const nextStatus =
                  e.target.value as
                    | "available"
                    | "reserved"
                    | "sold"
                    | "archived";

                setStatusValue(
                  nextStatus
                );

                if (
                  nextStatus ===
                  "sold"
                ) {
                  setSoldAtValue(
                    getLocalDateTimeValue()
                  );
                } else {
                  setSoldAtValue(
                    ""
                  );
                }
              }}
              className="border border-black/60 bg-transparent p-3 outline-none"
            >
              <option value="available">
                Available
              </option>

              <option value="reserved">
                Reserved
              </option>

              <option value="sold">
                Sold
              </option>

              <option value="archived">
                Archived
              </option>
            </select>

            {/* SOLD DETAILS */}

            {statusValue ===
              "sold" && (
              <>
                <input
                  name="sold_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    product?.soldPrice ??
                    ""
                  }
                  placeholder="Sold Price (Admin Only)"
                  className="border border-black/60 bg-transparent p-3 outline-none"
                />

                <select
                  name="sold_via"
                  defaultValue={
                    product?.soldVia ||
                    ""
                  }
                  required
                  className="border border-black/60 bg-transparent p-3 outline-none"
                >
                  <option value="">
                    Sold Via *
                  </option>

                  {SALE_CHANNELS.map(
                    (
                      channel
                    ) => (
                      <option
                        key={
                          channel.value
                        }
                        value={
                          channel.value
                        }
                      >
                        {
                          channel.label
                        }
                      </option>
                    )
                  )}
                </select>

                <div className="border border-black/60 bg-transparent p-3">
                  <label
                    htmlFor="sold-at"
                    className="mb-2 block text-[10px] uppercase tracking-[.18em] text-[#9A7B42]"
                  >
                    Sold Date &
                    Time
                  </label>

                  <input
                    id="sold-at"
                    name="sold_at"
                    type="datetime-local"
                    value={
                      soldAtValue
                    }
                    readOnly
                    className="w-full bg-transparent outline-none"
                    title="Automatically recorded when the product is marked sold"
                  />

                  <p className="mt-2 text-[10px] text-[#6D706A]">
                    Automatically
                    recorded when
                    you mark this
                    product as Sold.
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* DESCRIPTION */}

        <textarea
          name="description"
          required
          defaultValue={
            product?.description ||
            ""
          }
          placeholder="Description *"
          rows={6}
          className="border border-black/60 bg-transparent p-3 outline-none md:col-span-2"
        />

        {/* MEASUREMENTS */}

        <textarea
          name="measurements"
          defaultValue={
            product?.measurements ||
            ""
          }
          placeholder='Measurements JSON, e.g. {"Chest":"24in","Length":"28in"}'
          rows={4}
          className="border border-black/60 bg-transparent p-3 outline-none md:col-span-2"
        />

        {/* TAGS */}

        <input
          name="tags"
          defaultValue={
            product?.tags || ""
          }
          placeholder="Tags, comma separated"
          className="border border-black/60 bg-transparent p-3 outline-none md:col-span-2"
        />

        {/* IMAGE GALLERY */}

        <div className="border-t border-black/15 pt-6 md:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.2em] text-[#B39A6B]">
                Product Images
              </p>

              <h2 className="serif mt-1 text-3xl">
                Gallery
              </h2>
            </div>

            <label className="cursor-pointer border border-black px-4 py-3 text-[10px] uppercase tracking-[.16em] transition hover:bg-[#153726] hover:text-[#F8F3E0]">
              + Add Images

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(
                    e.target.files
                  );

                  e.currentTarget.value =
                    "";
                }}
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-black/50">
            The first image is
            always the{" "}
            <strong className="text-black">
              Main Image
            </strong>
            . Use the arrows to
            change its position.
          </p>

          {/* IMAGE CARDS */}

          {items.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map(
                (item, index) => (
                  <div
                    key={
                      item.type ===
                      "existing"
                        ? item.id
                        : item.key
                    }
                    className="overflow-hidden border border-black/15 bg-white"
                  >
                    <div className="relative aspect-[4/5] bg-[#DED8C8]">
                      <img
                        src={
                          item.url
                        }
                        alt={`Product image ${
                          index + 1
                        }`}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-2 top-2 bg-[#122018] px-2 py-1 text-[9px] uppercase tracking-[.15em] text-[#F8F3E0]">
                        {index === 0
                          ? "Main Image"
                          : `Image ${
                              index +
                              1
                            }`}
                      </div>
                    </div>

                    <div className="border-t border-black/10 bg-[#F8F3E0] p-3">
                      <label className="mb-1.5 block text-[9px] uppercase tracking-[.14em] text-black/45">
                        Image Colour
                      </label>

                      <select
                        value={item.variantColour}
                        onChange={(e) => {
                          const value = e.target.value;

                          setItems((current) =>
                            current.map((currentItem, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...currentItem,
                                    variantColour: value,
                                  }
                                : currentItem
                            )
                          );
                        }}
                        className="w-full border border-black/40 bg-transparent p-2.5 text-xs outline-none"
                      >
                        <option value="">General / All Colours</option>

                        {getVariantColours().map((colour) => (
                          <option key={colour} value={colour}>
                            {colour}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 border-t border-black/10 text-[9px] uppercase tracking-[.12em]">
                      {/* MOVE LEFT */}

                      <button
                        type="button"
                        disabled={
                          index === 0
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            -1
                          )
                        }
                        className="border-r border-black/10 p-3 disabled:opacity-25"
                      >
                        ←
                      </button>

                      {/* MOVE RIGHT */}

                      <button
                        type="button"
                        disabled={
                          index ===
                          items.length -
                            1
                        }
                        onClick={() =>
                          moveImage(
                            index,
                            1
                          )
                        }
                        className="border-r border-black/10 p-3 disabled:opacity-25"
                      >
                        →
                      </button>

                      {/* REMOVE */}

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            index
                          )
                        }
                        className="p-3 text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-5 border border-dashed border-black/25 py-16 text-center text-xs text-black/45">
              No images added
              yet.
            </div>
          )}

          <p className="mt-4 text-[10px] uppercase tracking-[.16em] text-black/40">
            {items.length} image
            {items.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {/* SAVE */}

        <button
          type="submit"
          disabled={busy}
          className="bg-[#153726] p-4 text-xs uppercase tracking-widest text-[#F8F3E0] disabled:opacity-50 md:col-span-2"
        >
          {busy
            ? "Saving..."
            : mode === "new"
              ? "Publish Product"
              : "Save Changes"}
        </button>

        {/* ERROR */}

        {msg && (
          <p className="md:col-span-2 text-sm text-red-700">
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}
