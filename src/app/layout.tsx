import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NavGurukul Kitchen Duty Management",
  description: "Automated kitchen duty management system for NavGurukul students",
  keywords: ["NavGurukul", "Kitchen Duty", "Management", "Students", "Food"],
  authors: [{ name: "NavGurukul" }],
  openGraph: {
    title: "NavGurukul Kitchen Duty Management",
    description: "Automated kitchen duty management system for NavGurukul students",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NavGurukul Kitchen Duty Management",
    description: "Automated kitchen duty management system for NavGurukul students",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
