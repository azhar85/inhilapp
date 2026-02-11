'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const ADMIN_TOKEN_KEY = 'inhilapp_admin_token';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError('Email atau password salah.');
        return;
      }

      const data = await response.json();
      if (!data.token) {
        setError('Login gagal.');
        return;
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      router.replace('/admin');
    } catch {
      setError('Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-semibold text-ink">Login Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Masuk untuk mengelola katalog dan pesanan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
