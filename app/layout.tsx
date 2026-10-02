import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", axes: ["opsz"] });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ellison & Co. — Job Book",
  description: "Leads, quotes and jobs for Ellison & Co. Home Refresh.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Job Book", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f2ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <TabBar />
      </body>
    </html>
  );
}
