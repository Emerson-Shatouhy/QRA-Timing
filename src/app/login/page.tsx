import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center gap-6 p-6 md:p-10 overflow-hidden">
      {/* Background image */}
      <Image
        src="/DRC.png"
        alt=""
        fill
        className="object-cover"
        priority
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex flex-col items-center gap-2 self-center font-medium text-lg">
          <Image
            src="/qralogo.gif"
            alt="QRA Logo"
            width={124}
            height={124}
          />
        </a>
        {searchParams.error && (
          <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-md p-3 text-sm">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
