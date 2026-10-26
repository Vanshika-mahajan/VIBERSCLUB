import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import { AppNav } from "@/components/AppNav";
import { Toaster } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vibers Club", template: "%s · Vibers Club" },
  description: "Find your people in Manali: travellers, locals, events and places.",
  applicationName: "Vibers Club",
};

export const viewport: Viewport = {
  themeColor: "#F6F8FC",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col md:flex-row">
        <AppNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
