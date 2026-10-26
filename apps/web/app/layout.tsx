import type { Metadata, Viewport } from "next";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vibers Club", template: "%s · Vibers Club" },
  description: "Find your people in Manali: travellers, locals, events and places.",
  applicationName: "Vibers Club",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col md:flex-row">
        <AppNav />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
