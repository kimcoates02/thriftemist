"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Product,
  ProductVariant,
} from "@/lib/types";

/*
|--------------------------------------------------------------------------
| CART ITEM
|--------------------------------------------------------------------------
|
| A cart item represents:
|
| Product + selected variant
|
| For a one-of-one vintage piece, variantId will normally
| point to its single/default variant.
|
*/

export type CartItem = Product & {
  cartQty: number;

  /*
   * Selected inventory variant.
   */
  variantId: string;

  /*
   * Snapshot of the selected variant.
   *
   * These values are stored in the cart so the cart can
   * continue displaying the customer's exact selection.
   */
  variant?: ProductVariant;

  variantSku?: string | null;

  variantSize?: string | null;

  variantColour?: string | null;

  variantPrice: number;

  variantQuantity: number;
};


/*
|--------------------------------------------------------------------------
| CART CONTEXT
|--------------------------------------------------------------------------
*/

type CartContextType = {
  items: CartItem[];

  /*
   * Number of individual pieces in the cart.
   *
   * Example:
   *
   * Jacket x1 + Shirt x2 = 3
   */
  count: number;

  /*
   * Add a product using a selected variant.
   */
  add: (
    product: Product,
    variant?: ProductVariant
  ) => void;

  /*
   * Remove an exact cart line.
   */
  remove: (
    id: string,
    variantId?: string
  ) => void;

  /*
   * Change quantity of an exact cart line.
   */
  setQuantity: (
    id: string,
    quantity: number,
    variantId?: string
  ) => void;

  /*
   * Increase quantity of an exact cart line.
   */
  increase: (
    id: string,
    variantId?: string
  ) => void;

  /*
   * Decrease quantity of an exact cart line.
   */
  decrease: (
    id: string,
    variantId?: string
  ) => void;

  /*
   * Empty the entire cart.
   */
  clear: () => void;

  /*
   * Total cart value.
   */
  total: number;
};


/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

const CartContext =
  createContext<CartContextType | null>(
    null
  );


/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

const CART_STORAGE_KEY =
  "thriftemist-cart";

const OLD_CART_STORAGE_KEY =
  "thritemist-cart";


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/*
 * Build a unique cart-line key.
 *
 * Same product + different variants must remain
 * separate cart items.
 */
function getCartKey(
  productId: string,
  variantId: string
) {
  return `${productId}:${variantId}`;
}


/*
 * Get a usable variant for legacy products.
 *
 * Existing carts may contain products from before
 * the variant system was introduced.
 *
 * We keep them working instead of destroying the cart.
 */
function getFallbackVariant(
  product: Product
): ProductVariant {
  const existing =
    product.variants?.[0];

  if (existing) {
    return existing;
  }

  return {
    id: `legacy-${product.id}`,
    product_id: product.id,
    sku:
      product.sku ||
      `LEGACY-${product.id.slice(0, 8)}`,
    size: product.size ?? null,
    colour: product.colour ?? null,
    quantity: Math.max(
      0,
      Number(product.quantity || 0)
    ),
    cost_price: 0,
    selling_price: Number(
      product.price || 0
    ),
    status:
      product.status === "sold"
        ? "sold"
        : product.status === "archived"
          ? "archived"
          : "available",
    created_at:
      product.created_at,
    updated_at:
      product.created_at,
  };
}


/*
 * Convert a stored object into a valid CartItem.
 *
 * This also upgrades older cart entries that were
 * saved before variants existed.
 */
function normalizeCartItem(
  item: unknown
): CartItem | null {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const raw =
    item as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.price !== "number" ||
    typeof raw.cartQty !== "number" ||
    raw.cartQty <= 0
  ) {
    return null;
  }

  const product =
    raw as unknown as Product;

  const variant =
    raw.variant &&
    typeof raw.variant === "object"
      ? (raw.variant as ProductVariant)
      : undefined;

  const variantId =
    typeof raw.variantId === "string"
      ? raw.variantId
      : variant?.id ||
        `legacy-${raw.id}`;

  const variantPrice =
    typeof raw.variantPrice === "number"
      ? raw.variantPrice
      : variant?.selling_price ??
        Number(raw.price || 0);

  const variantQuantity =
    typeof raw.variantQuantity === "number"
      ? raw.variantQuantity
      : variant?.quantity ??
        Number(raw.quantity || 0);

  /*
   * IMPORTANT:
   * raw.sku/raw.size/raw.colour are unknown,
   * so explicitly verify they are strings.
   */
  const variantSku: string | null =
    typeof raw.variantSku === "string"
      ? raw.variantSku
      : variant?.sku ??
        (typeof raw.sku === "string"
          ? raw.sku
          : null);

  const variantSize: string | null =
    typeof raw.variantSize === "string"
      ? raw.variantSize
      : variant?.size ??
        (typeof raw.size === "string"
          ? raw.size
          : null);

  const variantColour: string | null =
    typeof raw.variantColour === "string"
      ? raw.variantColour
      : variant?.colour ??
        (typeof raw.colour === "string"
          ? raw.colour
          : null);

  return {
    ...product,

    variantId,

    variant,

    variantSku,

    variantSize,

    variantColour,

    variantPrice:
      Number.isFinite(variantPrice)
        ? variantPrice
        : Number(raw.price || 0),

    variantQuantity:
      Number.isFinite(variantQuantity)
        ? Math.max(
            0,
            variantQuantity
          )
        : 0,

    /*
     * Keep price synchronized with
     * the selected variant.
     */
    price:
      Number.isFinite(variantPrice)
        ? variantPrice
        : Number(raw.price || 0),

    /*
     * Keep quantity synchronized with
     * the selected variant.
     */
    quantity:
      Number.isFinite(variantQuantity)
        ? Math.max(
            0,
            variantQuantity
          )
        : 0,

    cartQty: Math.floor(
      raw.cartQty
    ),
  };
}


/*
|--------------------------------------------------------------------------
| CART PROVIDER
|--------------------------------------------------------------------------
*/

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] =
    useState<CartItem[]>([]);

  const [loaded, setLoaded] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | LOAD CART
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      /*
       * First try the current storage key.
       */
      let stored =
        localStorage.getItem(
          CART_STORAGE_KEY
        );

      /*
       * If nothing exists there, check
       * the old typo so existing customers
       * don't lose their cart.
       */
      if (!stored) {
        stored =
          localStorage.getItem(
            OLD_CART_STORAGE_KEY
          );

        if (stored) {
          localStorage.setItem(
            CART_STORAGE_KEY,
            stored
          );

          localStorage.removeItem(
            OLD_CART_STORAGE_KEY
          );
        }
      }

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (Array.isArray(parsed)) {
          const validItems =
            parsed
              .map(
                normalizeCartItem
              )
              .filter(
                (
                  item
                ): item is CartItem =>
                  item !== null
              );

          setItems(
            validItems
          );
        }
      }
    } catch (error) {
      console.error(
        "CART LOAD ERROR:",
        error
      );

      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);


  /*
  |--------------------------------------------------------------------------
  | SAVE CART
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    /*
     * Do not overwrite localStorage with []
     * before the initial cart has loaded.
     */
    if (!loaded) {
      return;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        "CART SAVE ERROR:",
        error
      );
    }
  }, [
    items,
    loaded,
  ]);


  /*
  |--------------------------------------------------------------------------
  | ADD PRODUCT
  |--------------------------------------------------------------------------
  */

  function add(
    product: Product,
    selectedVariant?: ProductVariant
  ) {
    /*
     * Use the explicitly selected variant.
     *
     * For old/simple products, fall back
     * to their first variant.
     */
    const variant =
      selectedVariant ||
      getFallbackVariant(
        product
      );

    /*
     * Never allow an unavailable
     * variant into the cart.
     */
    if (
      product.status !==
        "available" ||
      variant.status !==
        "available" ||
      Number(
        variant.quantity
      ) < 1
    ) {
      return;
    }

    const variantId =
      variant.id;

    const variantPrice =
      Number(
        variant.selling_price
      );

    const variantQuantity =
      Math.max(
        0,
        Number(
          variant.quantity
        )
      );

    const cartKey =
      getCartKey(
        product.id,
        variantId
      );

    setItems(
      (current) => {
        const existing =
          current.find(
            (item) =>
              getCartKey(
                item.id,
                item.variantId
              ) === cartKey
          );

        /*
         * Same product + same variant
         * already exists.
         */
        if (existing) {
          const maximum =
            Math.max(
              1,
              variantQuantity
            );

          const nextQuantity =
            Math.min(
              existing.cartQty +
                1,
              maximum
            );

          return current.map(
            (item) =>
              getCartKey(
                item.id,
                item.variantId
              ) === cartKey
                ? {
                    ...item,

                    variant,

                    variantSku:
                      variant.sku,

                    variantSize:
                      variant.size,

                    variantColour:
                      variant.colour,

                    variantPrice,

                    variantQuantity,

                    price:
                      variantPrice,

                    quantity:
                      variantQuantity,

                    cartQty:
                      nextQuantity,
                  }
                : item
          );
        }

        /*
         * New product/variant combination.
         */
        return [
          ...current,

          {
            ...product,

            variantId,

            variant,

            variantSku:
              variant.sku,

            variantSize:
              variant.size,

            variantColour:
              variant.colour,

            variantPrice,

            variantQuantity,

            price:
              variantPrice,

            quantity:
              variantQuantity,

            cartQty: 1,
          },
        ];
      }
    );
  }


  /*
  |--------------------------------------------------------------------------
  | FIND CART ITEM
  |--------------------------------------------------------------------------
  */

  function matchesItem(
    item: CartItem,
    id: string,
    variantId?: string
  ) {
    if (item.id !== id) {
      return false;
    }

    /*
     * Backward compatibility:
     * if no variant ID is supplied,
     * match the product ID.
     */
    if (!variantId) {
      return true;
    }

    return (
      item.variantId ===
      variantId
    );
  }


  /*
  |--------------------------------------------------------------------------
  | REMOVE
  |--------------------------------------------------------------------------
  */

  function remove(
    id: string,
    variantId?: string
  ) {
    setItems(
      (current) =>
        current.filter(
          (item) =>
            !matchesItem(
              item,
              id,
              variantId
            )
        )
    );
  }


  /*
  |--------------------------------------------------------------------------
  | SET QUANTITY
  |--------------------------------------------------------------------------
  */

  function setQuantity(
    id: string,
    quantity: number,
    variantId?: string
  ) {
    setItems(
      (current) =>
        current
          .map((item) => {
            if (
              !matchesItem(
                item,
                id,
                variantId
              )
            ) {
              return item;
            }

            const requested =
              Math.floor(
                Number(
                  quantity
                )
              );

            /*
             * Quantity below 1
             * removes the item.
             */
            if (
              !Number.isFinite(
                requested
              ) ||
              requested <= 0
            ) {
              return null;
            }

            const maximum =
              Math.max(
                1,
                Number(
                  item.variantQuantity ??
                    item.quantity ??
                    0
                )
              );

            return {
              ...item,

              cartQty:
                Math.min(
                  requested,
                  maximum
                ),
            };
          })
          .filter(
            (
              item
            ): item is CartItem =>
              item !== null
          )
    );
  }


  /*
  |--------------------------------------------------------------------------
  | INCREASE
  |--------------------------------------------------------------------------
  */

  function increase(
    id: string,
    variantId?: string
  ) {
    setItems(
      (current) =>
        current.map(
          (item) => {
            if (
              !matchesItem(
                item,
                id,
                variantId
              )
            ) {
              return item;
            }

            const maximum =
              Math.max(
                1,
                Number(
                  item.variantQuantity ??
                    item.quantity ??
                    0
                )
              );

            if (
              item.cartQty >=
              maximum
            ) {
              return item;
            }

            return {
              ...item,

              cartQty:
                item.cartQty +
                1,
            };
          }
        )
    );
  }


  /*
  |--------------------------------------------------------------------------
  | DECREASE
  |--------------------------------------------------------------------------
  */

  function decrease(
    id: string,
    variantId?: string
  ) {
    setItems(
      (current) =>
        current
          .map((item) => {
            if (
              !matchesItem(
                item,
                id,
                variantId
              )
            ) {
              return item;
            }

            if (
              item.cartQty <= 1
            ) {
              return null;
            }

            return {
              ...item,

              cartQty:
                item.cartQty -
                1,
            };
          })
          .filter(
            (
              item
            ): item is CartItem =>
              item !== null
          )
    );
  }


  /*
  |--------------------------------------------------------------------------
  | CLEAR CART
  |--------------------------------------------------------------------------
  */

  function clear() {
    setItems([]);
  }


  /*
  |--------------------------------------------------------------------------
  | CART COUNT
  |--------------------------------------------------------------------------
  */

  const count =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.cartQty,
          0
        ),
      [items]
    );


  /*
  |--------------------------------------------------------------------------
  | CART TOTAL
  |--------------------------------------------------------------------------
  */

  const total =
    useMemo(
      () =>
        items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.variantPrice ??
                item.price
            ) *
              item.cartQty,
          0
        ),
      [items]
    );


  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const value =
    useMemo(
      () => ({
        items,

        count,

        add,

        remove,

        setQuantity,

        increase,

        decrease,

        clear,

        total,
      }),
      [
        items,
        count,
        total,
      ]
    );


  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}


/*
|--------------------------------------------------------------------------
| USE CART
|--------------------------------------------------------------------------
*/

export function useCart() {
  const context =
    useContext(
      CartContext
    );

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}