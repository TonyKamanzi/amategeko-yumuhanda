import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
