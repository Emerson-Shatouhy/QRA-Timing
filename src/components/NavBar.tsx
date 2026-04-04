import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/action";
import { createClient as createServerClient } from "../../utils/supabase/server";

export default async function NavBar() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={user ? "/management" : "/"} className="flex items-center gap-2">
            <Image
              src="/qralogo.gif"
              alt="QRA Logo"
              width={36}
              height={36}
              className="rounded"
            />
            <h1 className="text-lg font-bold text-gray-900">{user ? "QRA Management" : "QRA"}</h1>
          </Link>

        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {user.email}
              </span>
              <form action={logout}>
                <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-gray-700">
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
