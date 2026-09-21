'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOperationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/operations');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
      }}
    >
      Redirecting to Navithon Operations Console (/operations)...
    </div>
  );
}
