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
  // No canonical here (PR131): a layout-level canonical is inherited by every
  // page that doesn't set its own `alternates`, silently marking those pages as
  // duplicates of the homepage. Each page declares its own canonical instead;
  // the homepage's lives in src/app/page.tsx.
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
        {/* FIRST, deliberately. React flushes effects in tree order, so anything
            mounted above the page content runs its effect before the page's own.
            AttributionCapture used to sit below {children}: on a visitor's first
            paid landing the hero fired `landing_view` BEFORE first-touch
            attribution had been persisted, so the event carried no utm_content
            and the arrival looked untagged. It renders null, so the skip link
            below is still the first element in the tab order. */}
        <AttributionCapture />
        {/* Keyboard bypass for the sidebar/topbar chrome (PR132). Visually
            hidden until focused; first element in the tab order. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-accent/40 focus:bg-ink-900 focus:px-4 focus:py-2.5 focus:text-[13px] focus:text-ink-100"
        >
          Skip to main content
        </a>
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
            <main id="main" className="flex-1 px-8 lg:px-14 py-10 lg:py-14">
              <div className="max-w-[1320px] mx-auto">{children}</div>
            </main>
            <div className="site-chrome" style={{ display: "contents" }}>
              <Footer />
            </div>
          </div>
        </div>
        <PageTracker />
        <ProfileBeacon />
        <BareChromeSync />
        <MarketingScripts />
      </body>
    </html>
  );
}
