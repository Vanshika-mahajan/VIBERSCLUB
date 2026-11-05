import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/syne";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import { AppNav } from "@/components/AppNav";
import { SoundEffects } from "@/components/SoundEffects";
import { Toaster } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vibers Club", template: "%s · Vibers Club" },
  description:
    "Find your people in Manali: travellers, locals, events and places.",
  applicationName: "Vibers Club",
};

export const viewport: Viewport = {
  themeColor: "#F7F2E8",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppNav />
        <SoundEffects />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-[72px] pb-32 md:px-10 md:pt-10">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
