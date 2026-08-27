import type { ReactNode } from "react";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Nav } from "./Nav";
import { ToastHost } from "@/components/Toast";
import { copy } from "@/lib/copy";
import { tokenCss } from "@/lib/tokens";

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Float — Markov",
  description: copy.console.withdrawLine,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenCss() }} />
      </head>
      <body>
        <a className="skip" href="#main">
          {copy.skip}
        </a>
        <ToastHost>
          <Nav />
          {children}
        </ToastHost>
      </body>
    </html>
  );
}
