import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebGPUProvider } from "./contexts/WebGPUContext";
import { LLMProvider } from "./contexts/LLMContext";
import { GameWordsProvider } from "./contexts/GameWordsContext";
import { GoogleTagManager } from '@next/third-parties/google'
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Wikipedia Game...but with LLMs",
  description: "Play the Wikipedia game with the help of an LLM running in your browser",
  icons: {
    icon: {
      url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>',
      type: 'image/svg+xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-54BT9D33" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`} 
        style={{ // TODO: fix this hack for safari ios ignoring tailwind dark mode
          background: "#0a0a0a",
          color: "#ededed",
        }}
      >
        <Suspense>  
          <WebGPUProvider>
            <LLMProvider>
              <GameWordsProvider>
                {children}
              </GameWordsProvider>
            </LLMProvider>
          </WebGPUProvider>
          </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
