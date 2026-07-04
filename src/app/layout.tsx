import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Vocali",
  title: "Vocali",
  description:
    "Daily speaking prompts for confidence, self-expression, and thinking on the spot.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vocali",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/vocali-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/vocali-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/vocali-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/vocali-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/vocali-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#00A7A5",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunitoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
