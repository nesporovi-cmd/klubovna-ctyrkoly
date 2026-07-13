'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Nesprávné heslo.');
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Nepodařilo se spojit se serverem.');
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap">
      <div className="login-card">
        <div className="brand-mark">K</div>
        <h2>Přihlášení administrátora</h2>
        <p>Zadejte heslo pro přístup ke správě rezervací.</p>
        {error && <div className="error-box show">{error}</div>}
        <div className="field">
          <input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Přihlašuji…' : 'Přihlásit se'}
        </button>
      </div>
    </div>
  );
}
