import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
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
  title: "AssetTrack — Fixed Asset Register",
  description:
    "Create, track and audit company assets: QR tags, purchase records, depreciation, custody and verification.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {/* Shell reads the query string, so it renders inside a Suspense boundary. */}
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen bg-[#f4f6f8]" />}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: "14px" },
            success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
