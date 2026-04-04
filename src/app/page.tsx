import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
          QRA Timing
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Lake Quinsigamond Regatta
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/spectator">
            <Button variant="outline" size="lg">
              View Results
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
