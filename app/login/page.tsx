"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (res.ok) {
        router.replace(params.get("from") || "/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo iniciar sesión");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-p/15 text-xl">
            🌙
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">WhiteMoon</p>
            <p className="text-xs text-muted">Call Center IA · Panel interno</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card/60 p-6"
        >
          <h1 className="text-lg font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted">
            Acceso restringido al equipo de WhiteMoon.
          </p>

          <label className="mt-5 block text-xs font-medium text-muted">
            Usuario
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
              placeholder="whitemoon"
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-muted">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 px-3 py-2 text-xs text-[#ff9b9b]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-p px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-p2 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
