import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PageTracker } from "@/components/PageTracker";
import { AttributionCapture } from "@/components/AttributionCapture";
import { BareChromeSync } from "@/components/ChromeGate";
import { SITE_URL, SITE_NAME } from "@/lib/site";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "halvinglens.com — the clearest view of the Bitcoin cycle",
    template: "%s · halvinglens.com",
  },
  description:
    "Every Bitcoin cycle metric, aligned to halving day zero, across all four cycles. Free.",
  alternates: { canonical: "/" },
  applicationName: SITE_NAME,
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-ink-950 text-ink-100 font-sans antialiased">
        {/* Hide site chrome before paint on the paid landing (?nav=1 keeps it). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname,n=new URLSearchParams(location.search).get('nav');if(p==='/start'&&n!=='1'){document.documentElement.setAttribute('data-bare','1');}}catch(e){}})();`,
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
          </div>
        </div>
        <PageTracker />
        <AttributionCapture />
        <BareChromeSync />
      </body>
    </html>
  );
}
