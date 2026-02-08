import type { Metadata } from "next";
import { Nunito } from "next/font/google"; // Your existing font
import "./globals.css";
import Navbar from "@/components/Navbar";
import AIChatWidget from "@/components/AIChatWidget";
import Providers from "@/components/Providers";

const nunito = Nunito({ 
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"] 
});

export const metadata: Metadata = {
  title: "OpenRescue Platform",
  description: "Find your new best friend.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: '/apple-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={nunito.className}>
        <Providers>
          <Navbar />
          
          {children}

          <footer className="bg-white border-t border-gray-100 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-6 text-center">
              <p className="text-gray-400 mb-4 font-bold">
                © 2025 OpenRescue. Made with 🐾 for pets.
              </p>
              <div className="flex gap-4 justify-center text-sm text-gray-400 font-bold">
                <a href="#" className="hover:text-orange-500">Privacy</a>
                <a href="#" className="hover:text-orange-500">Terms</a>
                <a href="/admin" className="hover:text-slate-900">Staff Login</a>
              </div>
            </div>
          </footer>

          {/* AI Chat Widget */}
          <AIChatWidget />
        </Providers>
      </body>
    </html>
  );
}