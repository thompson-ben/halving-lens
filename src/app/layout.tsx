import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PageTracker } from "@/components/PageTracker";
import { AttributionCapture } from "@/components/AttributionCapture";
import { ProfileBeacon } from "@/components/ProfileBeacon";
import { BareChromeSync } from "@/components/ChromeGate";
import { MarketingScripts } from "@/components/MarketingScripts";
import { Footer } from "@/components/Footer";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Browser UI tint (mobile address bar, PWA) — the brand ink ground.
export const viewport: Viewport = {
  themeColor: "#05070a",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HalvingLens — The Clearest View of the Bitcoin Cycle",
    template: "%s | HalvingLens",
  },
  description:
    "Every Bitcoin cycle metric, aligned to halving day zero, across all four cycles. Free.",
  alternates: { canonical: "/" },
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "halvinglens.com — the clearest view of the Bitcoin cycle",
    description:
      "Every Bitcoin cycle metric, aligned to halving day zero, across all four cycles. Free.",
    images: [{ url: "/og", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "halvinglens.com — the clearest view of the Bitcoin cycle",
    description: "Bitcoin cycle intelligence, free. Every metric aligned to halving day zero.",
    images: ["/og"],
  },
  // Meta (Facebook) Business domain verification — renders
  // <meta name="facebook-domain-verification" content="…"> in <head>.
  verification: {
    other: { "facebook-domain-verification": "x39mdys9nqbeaicylh1lfhs2y1sq61" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-ink-950 text-ink-100 font-sans antialiased">
        {/* Hide site chrome before paint on the paid landings (?nav=1 keeps it). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname,n=new URLSearchParams(location.search).get('nav');if((p==='/start'||p==='/free')&&n!=='1'){document.documentElement.setAttribute('data-bare','1');}}catch(e){}})();`,
          }}
        />
        {/* Site-wide structured data (P3.4): publisher + site identity. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: "HalvingLens",
                  url: SITE_URL,
                  logo: `${SITE_URL}/og`,
                  description:
                    "Independent Bitcoin research publication — evidence-based historical cycle analysis, without hype or price predictions.",
                  founder: { "@type": "Person", name: "Ben Thompson" },
                  sameAs: SOCIAL_LINKS.map((s) => s.href),
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: "HalvingLens",
                  url: SITE_URL,
                  publisher: { "@id": `${SITE_URL}/#organization` },
                },
              ],
            }),
          }}
        />
        <div className="flex min-h-screen">
          <div className="site-chrome" style={{ display: "contents" }}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="site-chrome" style={{ display: "contents" }}>
              <TopBar />
            </div>
            <main className="flex-1 px-8 lg:px-14 py-10 lg:py-14">
              <div className="max-w-[1320px] mx-auto">{children}</div>
            </main>
            <div className="site-chrome" style={{ display: "contents" }}>
              <Footer />
            </div>
          </div>
        </div>
        <PageTracker />
        <AttributionCapture />
        <ProfileBeacon />
        <BareChromeSync />
        <MarketingScripts />
      </body>
    </html>
  );
}
