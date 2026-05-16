import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/providers";
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
  title: "HaoDeal Admin Dashboard",
  description: "Internal operations dashboard for deal pipeline management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <Providers>
        <html
          lang="en"
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
          suppressHydrationWarning
        >
          <body className="min-h-full flex flex-col bg-background text-foreground">
            {children}
            <Toaster richColors position="top-right" />
          </body>
        </html>
      </Providers>
    </ClerkProvider>
  );
}
