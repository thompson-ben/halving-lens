import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

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
  metadataBase: new URL("https://halving-lens.vercel.app"),
  title: "Halving.lens — the clearest view of the Bitcoin cycle",
  description:
    "Every Bitcoin cycle metric, aligned to halving day zero, across all four cycles. Free.",
  openGraph: {
    title: "Halving.lens — the clearest view of the Bitcoin cycle",
    description:
      "Every Bitcoin cycle metric, aligned to halving day zero, across all four cycles. Free.",
    images: [{ url: "/og", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Halving.lens — the clearest view of the Bitcoin cycle",
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
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 px-8 lg:px-14 py-10 lg:py-14">
              <div className="max-w-[1320px] mx-auto">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
