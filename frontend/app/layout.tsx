import { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout";
import { ThemeProvider, Providers } from "@/app/providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "CovenantMatch - Nightreign Matchmaking",
  description: "Find teammates and track your Nightreign gaming sessions",
  metadataBase: new URL("https://covenant-match.com"),
  manifest: "/manifest.json",
  keywords: "Nightreign, Elden Ring, gaming, matchmaking, teammates, covenant match, team finder, game sessions",
  authors: [{ name: "Covenant Match Team" }],
  robots: "index, follow",
  appleWebApp: {
    title: "Covenant-Match"
  },
  icons: {
    apple: "/apple-icon.png",
    icon: "/icon1.png"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://covenant-match.com/",
    siteName: "Covenant Match",
    title: "CovenantMatch - Nightreign Matchmaking",
    description: "Find teammates and track your Nightreign gaming sessions",
    images: [
      {
        url: "/social/cm-1200-630.png",
        width: 1200,
        height: 630,
        alt: "Covenant Match - Find teammates for Nightreign"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "CovenantMatch - Nightreign Matchmaking",
    description: "Find teammates and track your Nightreign gaming sessions",
    images: [
      {
        url: "/social/cm-1200-628.png",
        width: 1200,
        height: 628,
        alt: "Covenant Match - Find teammates for Nightreign"
      }
    ]
  },
  alternates: {
    canonical: "https://covenant-match.com/"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Providers>
            <div className="min-h-screen bg-background text-foreground">
              <SiteHeader />
              <main className="flex-1 w-full">
                {children}
              </main>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
