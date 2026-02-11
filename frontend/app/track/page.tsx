import { Suspense } from 'react';
import TrackClient from './track-client';

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-soft">
            <div className="text-sm text-slate-500">Memuat halaman...</div>
          </div>
        </main>
      }
    >
      <TrackClient />
    </Suspense>
  );
}
