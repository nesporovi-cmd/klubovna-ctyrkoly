import Link from 'next/link';
import CalendarView from '@/components/CalendarView';

export default function HomePage() {
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
          <Link href="/admin" className="btn btn-sm">Administrace</Link>
        </div>
      </div>
      <CalendarView />
    </>
  );
}
