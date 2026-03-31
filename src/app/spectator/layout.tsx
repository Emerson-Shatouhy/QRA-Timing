import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QRA Race Results - Lake Quinsigamond",
  description: "Live racing results from Lake Quinsigamond, Worcester MA",
};

export default function SpectatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Quinsigamond Racing Association &middot; Worcester, MA
        </div>
      </footer>
    </div>
  );
}
