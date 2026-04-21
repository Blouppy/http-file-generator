import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SpecProvider } from "@/contexts/spec-context";
import { LanguageProvider } from "@/contexts/language-context";
import { Toolbar } from "@/components/toolbar";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HTTP File Generator",
  description: "Upload an OpenAPI spec and generate .http files for your endpoints",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <SpecProvider>
              <Toolbar />
              {children}
            </SpecProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
