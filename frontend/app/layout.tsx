import { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout";
import { ThemeProvider, Providers } from "@/app/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CovenantMatch - Nightreign Matchmaking",
  description: "Find teammates and track your Nightreign gaming sessions",
  manifest: "/manifest.json",
  keywords: "Nightreign, Elden Ring, gaming, matchmaking, teammates, covenant match, team finder, game sessions",
  authors: [{ name: "Covenant Match Team" }],
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Covenant Match Logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "CovenantMatch - Nightreign Matchmaking",
    description: "Find teammates and track your Nightreign gaming sessions",
    images: ["/web-app-manifest-512x512.png"]
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
