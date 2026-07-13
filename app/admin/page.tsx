import { getAdminSessionFromCookies } from '@/lib/admin-auth';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';
import Link from 'next/link';

export default async function AdminPage() {
  const isAdmin = await getAdminSessionFromCookies();

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div className="brand-text">
            <h1>Klubovna Čtyřkoly</h1>
            <p>Rezervační systém obce</p>
          </div>
        </div>
        <div className="nav-actions">
          <Link href="/" className="btn btn-sm">Veřejný kalendář</Link>
        </div>
      </div>
      {isAdmin ? <AdminDashboard /> : <AdminLogin />}
    </>
  );
}
