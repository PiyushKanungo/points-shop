import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { ExploreTracker } from "@/components/ExploreTracker";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Points Shop · Piyush Kanungo", template: "%s · Points Shop" },
  description:
    "Earn points by saying hi, spend them on real SFCC help from Piyush: questions, resume reviews, career chats and mock interviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn-primary">
          Skip to content
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <Footer githubUrl={process.env.GITHUB_URL} bmacUrl={process.env.BMAC_URL} />
        <Suspense fallback={null}>
          <ExploreTracker />
        </Suspense>
      </body>
    </html>
  );
}
