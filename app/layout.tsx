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

export const metadata: Metadata = {
  title: "Ikizami cy'Umutekano mu Muhanda | Driving Theory Quiz",
  description:
    "Kwitegura ikizami cy'umutekano mu muhanda mu Kinyarwanda: ibibazo 20, iminota 20, gutsinda 12/20.",
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
 * Applies the persisted theme before first paint to avoid a flash
 * of the wrong color scheme.
 */
const themeInitScript = `
try {
  var stored = localStorage.getItem("quiz-theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if ((stored && stored === "dark") || (!stored && prefersDark)) {
    document.documentElement.classList.add("dark");
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <PwaRegister />
      </body>
    </html>
  );
}
