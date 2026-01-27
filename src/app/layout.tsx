import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { uiFlags } from "@/lib/uiFlags";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const theme = createTheme({
  primaryColor: 'brand',
  fontFamily: 'var(--font-inter), sans-serif',
  defaultRadius: 'lg',
  colors: {
    brand: [
      '#fdf2f8', // 0
      '#fce7f3', // 1
      '#fbcfe8', // 2
      '#f9a8d4', // 3
      '#f472b6', // 4
      '#ec4899', // 5 (Primary)
      '#db2777', // 6
      '#be185d', // 7
      '#9d174d', // 8
      '#831843', // 9
    ],
  },
  components: {
    Button: {
      defaultProps: {
        fw: 600,
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        withBorder: false, // Cleaner look as per design
      },
      styles: {
        root: {
          backgroundColor: 'var(--color-surface)',
        }
      }
    }
  }
});

export const metadata: Metadata = {
  title: "Receipt Management | EXATA",
  description: "Professional receipt management for finance teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <ToastProvider enabled={uiFlags.toasts}>{children}</ToastProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
