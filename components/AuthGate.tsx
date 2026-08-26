"use client";

import { Boxes } from "lucide-react";
import { useHydrated } from "@/lib/useHydrated";
import { useAuth } from "./AuthProvider";
import LoginScreen from "./LoginScreen";
import Shell from "./Shell";

/**
 * Decides what the app renders: the login screen, or the dashboard shell.
 *
 * Whether someone is signed in is known only in the browser — the session lives
 * in an httpOnly cookie that the API validates — so the server cannot render the
 * right branch. It always renders the holding state, and `useHydrated` makes the
 * first client render agree before the real branch takes over. Without that the
 * two disagree and React discards the tree with a hydration error.
 *
 * The holding state also stops the login form flashing at someone who is already
 * signed in while /auth/me is still in flight.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const hydrated = useHydrated();

  if (!hydrated || status === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f6f8]">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand-600 text-white">
          <Boxes size={22} />
        </div>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (status === "out") return <LoginScreen />;

  return <Shell>{children}</Shell>;
}
