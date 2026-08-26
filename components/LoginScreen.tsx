"use client";

import { useState } from "react";
import { Boxes, Eye, EyeOff, LogIn, TriangleAlert } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Spinner } from "./ui";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setBusy(true);
    try {
      await signIn(password);
      // On success the provider swaps this screen out; no navigation needed.
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Boxes size={26} />
          </div>
          <h1 className="text-xl font-bold text-brand-900">AssetTrack</h1>
          <p className="text-sm text-zinc-500">Fixed Asset Register</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
        >
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium text-zinc-700"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the dashboard password"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={`w-full rounded-lg border bg-white py-2.5 pl-3 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500/20 ${
                error
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-zinc-300 focus:border-brand-500"
              }`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="mt-2 flex items-center gap-1.5 text-xs text-rose-600"
            >
              <TriangleAlert size={13} className="shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Spinner /> : <LogIn size={16} />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Accounts Dashboard · asset &amp; depreciation register
        </p>
      </div>
    </div>
  );
}
