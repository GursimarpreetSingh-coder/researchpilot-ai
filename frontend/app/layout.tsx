import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResearchPilot AI",
    template: "%s | ResearchPilot AI",
  },
  description:
    "AI-powered research paper analysis, question answering, and intelligent research workspace.",
  keywords: [
    "AI",
    "research papers",
    "paper analysis",
    "RAG",
    "research assistant",
    "ResearchPilot AI",
  ],
  authors: [
    {
      name: "ResearchPilot AI",
    },
  ],
  applicationName: "ResearchPilot AI",
  generator: "Next.js",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    title: "ResearchPilot AI",
    description:
      "Understand, analyze, and explore research papers with AI.",
    siteName: "ResearchPilot AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResearchPilot AI",
    description:
      "Your intelligent AI-powered research workspace.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f8fafc",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#050816",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>

        <div
          id="global-loader"
          aria-hidden="true"
        />

        <ThemeProvider>{children}</ThemeProvider>

        <div
          id="toast-root"
          aria-live="polite"
          aria-atomic="true"
        />
      </body>
    </html>
  );
}
