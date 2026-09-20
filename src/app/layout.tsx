import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import Preloader from "@/components/Preloader";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-custom",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-custom",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Navithon Logistics | Global Freight Forwarding & Supply Chain Architecture",
  description:
    "One operator. Every leg of the journey. Freight forwarding, air cargo, ocean transport, and customs brokerage — unified under one accountable team.",
  keywords: [
    "Navithon Logistics",
    "global freight forwarding",
    "air freight",
    "ocean freight",
    "customs brokerage",
    "supply chain architecture",
    "cargo tracking",
    "project cargo",
    "intermodal logistics",
  ],
  openGraph: {
    title: "Navithon Logistics | Global Freight Forwarding & Supply Chain Architecture",
    description:
      "One operator. Every leg of the journey. Freight forwarding, air cargo, ocean transport, and customs — unified under one accountable team.",
    type: "website",
    siteName: "Navithon Logistics",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Preloader />
        <CustomCursor />
        <SmoothScroll>
          <Navbar />
          <div style={{ flex: 1 }}>{children}</div>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
