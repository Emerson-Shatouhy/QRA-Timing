"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <h1 className="text-xl font-bold text-gray-900">QRA Timing</h1>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}