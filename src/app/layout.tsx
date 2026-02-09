import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/header";
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
  title: "Prompt Workbench",
  description:
    "A prompt engineering workbench powered by @mzedstudio/llm-cache — run experiments across models, compare results, and time-travel through response history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Header />
            <main className="overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
