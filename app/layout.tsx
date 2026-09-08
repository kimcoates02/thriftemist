import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://thriftemist.com"),
  title: {
    default: "THRIFTEMIST | Vintage, Surplus & New",
    template: "%s | THRIFTEMIST",
  },
  description:
    "THRIFTEMIST — curated vintage, quality surplus and new clothing. Carefully selected pieces with limited availability.",
  openGraph: {
    title: "THRIFTEMIST | Vintage, Surplus & New",
    description:
      "Curated vintage, quality surplus and new clothing from Srinagar, Kashmir.",
    url: "https://thriftemist.com",
    siteName: "THRIFTEMIST",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "THRIFTEMIST | Vintage, Surplus & New",
    description:
      "Curated vintage, quality surplus and new clothing from Srinagar, Kashmir.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}