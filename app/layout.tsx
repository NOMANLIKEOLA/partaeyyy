import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Partaey — every event, everywhere",
  description: "Discover and list raves, concerts, comedy, conferences and festivals across Nigeria."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = !!user && user.email === process.env.ADMIN_EMAIL;

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('partaey-theme');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="font-sans pb-16">
        <Suspense fallback={<div className="h-[73px] border-b border-hairline" />}>
          <Nav initialUserEmail={user?.email ?? null} isAdmin={isAdmin} />
        </Suspense>
        <main className="max-w-[1140px] mx-auto px-4 sm:px-6 md:px-10">{children}</main>
        <footer className="border-t border-hairline mt-16 px-4 sm:px-6 md:px-10 py-8 text-paperDim text-xs flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
          <div>PARTAEY — like you.</div>
          <div>&copy; {new Date().getFullYear()} Partaey</div>
        </footer>
      </body>
    </html>
  );
}