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
        <div className="max-w-screen-2xl mx-auto px-4 py-6 flex flex-col items-center gap-3">
          <div className="text-sm font-medium text-gray-700">
            Quinsigamond Racing Association
          </div>
          <div className="text-xs text-gray-400">
            Lake Quinsigamond &middot; Worcester, Massachusetts
          </div>
          <div className="max-w-md text-center text-xs text-gray-400 leading-relaxed">
            Developed by Emerson Shatouhy. This site is in active development. Found a bug?{" "}
            <a
              href="mailto:emersont2003@gmail.com"
              className="text-blue-500 hover:text-blue-600 underline underline-offset-2"
            >
              Let me know
            </a>.
          </div>
        </div>
      </footer>
    </div>
  );
}
