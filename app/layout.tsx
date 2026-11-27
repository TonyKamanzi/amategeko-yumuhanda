import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "Ikizami cy'Umutekano mu Muhanda | Driving Theory Quiz";
const description =
  "Kwitegura ikizami cy'umutekano mu muhanda mu Kinyarwanda: ibibazo 20, iminota 20, gutsinda 12/20.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  manifest: "/manifest.webmanifest",
  applicationName: "Ikizami",
  appleWebApp: {
    capable: true,
    title: "Ikizami",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Ikizami",
    locale: "rw_RW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

// Next.js 14+ requires theme colours in the viewport export, not metadata.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00a3e0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1220" },
  ],
};

/**
 * Applies the persisted theme and text size before first paint so users never
 * see a flash of the wrong colors or font size.
 */
const appInitScript = `
try {
  var storedTheme = localStorage.getItem("quiz-theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if ((storedTheme && storedTheme === "dark") || (!storedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
  var storedSize = localStorage.getItem("quiz-text-size");
  if (storedSize === "large" || storedSize === "xlarge") {
    document.documentElement.dataset.textSize = storedSize;
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="rw"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <PwaRegister />
      </body>
    </html>
  );
}
