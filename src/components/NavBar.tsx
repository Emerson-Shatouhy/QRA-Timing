import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/action";
import { createClient as createServerClient } from "../../utils/supabase/server";

export default async function NavBar() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's role if authenticated
  let userRole: 'admin' | 'timer' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <h1 className="text-xl font-bold text-gray-900">QRA Timing</h1>
          </Link>

          {/* Role-based navigation links */}
          {user && userRole === 'admin' && (
            <>
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Races
              </Link>
              <Link href="/teams" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Teams
              </Link>
              <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Admin
              </Link>
            </>
          )}

          {user && userRole === 'timer' && (
            <Link href="/timer" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Timing
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <form action={logout}>
                <Button variant="outline" size="sm" type="submit">
                  Logout
                </Button>
              </form>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}