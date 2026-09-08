import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { SiteChrome } from "@/components/site-chrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://thriftemist.com"),
  title: {
    default: "THRIFTEMIST | Vintage, Surplus & New",
    template: "%s | THRIFTEMIST",
  },
  description:
    "THRIFTEMIST — curated vintage, quality surplus and new clothing. Carefully selected pieces with limited availability.",
  applicationName: "THRIFTEMIST",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "THRIFTEMIST",
    title: "THRIFTEMIST | Vintage, Surplus & New",
    description:
      "Curated vintage, quality surplus and new clothing. Discover carefully selected pieces with limited availability.",
    url: "https://thriftemist.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "THRIFTEMIST | Vintage, Surplus & New",
    description:
      "Curated vintage, quality surplus and new clothing.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const saved = localStorage.getItem("thriftemist-theme"); const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.dataset.theme = saved || (systemDark ? "dark" : "light"); } catch (_) { document.documentElement.dataset.theme = "light"; } })()`,
          }}
        />
      </head>
      <body>
  <CartProvider>
    <SiteChrome />
    <main>{children}</main>
  </CartProvider>
</body>
    </html>
  );
}