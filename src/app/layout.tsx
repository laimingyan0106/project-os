import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/project-os/app-shell";
import { ProjectOSProvider } from "@/components/project-os/project-os-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import "@xyflow/react/dist/style.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project OS — Creator Command Center",
  description: "Projects, workflows and AI agents in one focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-full antialiased">
        <TooltipProvider>
          <ProjectOSProvider>
            <AppShell>{children}</AppShell>
          </ProjectOSProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
