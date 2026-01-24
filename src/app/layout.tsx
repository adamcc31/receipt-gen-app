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
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#EEF2FF',
      '#E0E7FF',
      '#C7D2FE',
      '#A5B4FC',
      '#818CF8',
      '#6366F1',
      '#4F46E5',
      '#4338CA',
      '#3730A3',
      '#312E81',
    ],
  },
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
