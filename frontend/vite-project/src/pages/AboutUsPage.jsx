import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CarFront, Clock3, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react';
import CustomerPortalHeader from '../components/CustomerPortalHeader';
import '../styles/Home.css';

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Verified Vendors',
    description: 'Only reviewed and approved vendors can list vehicles, helping customers book with confidence.',
  },
  {
    icon: BadgeCheck,
    title: 'Secure Booking Flow',
    description: 'Clear booking statuses, payment windows, and confirmation tracking reduce booking uncertainty.',
  },
  {
    icon: Sparkles,
    title: 'Trust-First Experience',
    description: 'Transparent pricing, vehicle details, and profile-based access controls improve reliability.',
  },
];

const AboutUsPage = () => {
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    navigate('/verification');
  };

  const handleLogout = async () => {
    try {
      await globalThis.fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="home-container" style={{ backgroundColor: '#0f0f0f' }}>
      <CustomerPortalHeader activeTab="about" onProfile={handleGoToProfile} onLogout={handleLogout} />

      <section className="hero-section">
        <h1 className="hero-title">
          About <span className="text-accent">NepRide</span>
        </h1>
        <p style={{ maxWidth: '780px', color: '#a7a7a7', lineHeight: 1.7, margin: '0 0 2rem' }}>
          NepRide helps customers discover verified vehicles, compare listings quickly, and book with confidence through a clean rental experience.
          We keep the flow simple for riders and practical for vendors, with transparent details and a focused booking process.
        </p>

        <div className="hero-buttons">
          <button className="btn-primary-accent" onClick={() => navigate('/customer-dashboard', { state: { activeView: 'vehicles' } })}>
            Browse Vehicles <ArrowRight size={20} />
          </button>
          <button className="btn-secondary-accent" onClick={() => navigate('/customer-dashboard/contact')}>
            Contact Us
          </button>
          <button className="btn-secondary-accent" onClick={() => navigate('/customer-dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </section>

      <section className="landing-panels">
        <article className="landing-panel">
          <div className="landing-panel-icon">
            <Users size={18} />
          </div>
          <h2>About NepRide</h2>
          <p>
            NepRide helps customers find verified vehicles, compare listings quickly, and book with confidence through a clean rental experience.
            We keep the flow simple for riders and practical for vendors, with transparent details and a focused booking process.
          </p>
        </article>

        <article className="landing-panel">
          <div className="landing-panel-icon">
            <ShieldCheck size={18} />
          </div>
          <h2>Verified Vendors</h2>
          <p>Only reviewed and approved vendors can list vehicles, helping customers book with confidence.</p>
        </article>

        <article className="landing-panel">
          <div className="landing-panel-icon">
            <Wallet size={18} />
          </div>
          <h2>Secure Booking</h2>
          <p>Clear booking statuses, payment windows, and confirmation tracking reduce booking uncertainty.</p>
        </article>
      </section>

      <section className="landing-panels landing-panels-single">
        <article className="landing-panel landing-panel-wide">
          <div className="landing-panel-icon">
            <CarFront size={18} />
          </div>
          <h2>Why NepRide Feels Different</h2>
          <p>
            The platform is built around trust, speed, and clarity. Customers can compare options easily, understand what they are booking, and move
            through the rental flow without clutter.
          </p>

          <div className="landing-panels" style={{ padding: '1.2rem 0 0', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="landing-panel" style={{ padding: '1rem' }}>
                  <div className="landing-panel-icon">
                    <Icon size={18} />
                  </div>
                  <h2 style={{ fontSize: '1.05rem' }}>{item.title}</h2>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </article>
      </section>

      <section className="fleet-section" style={{ paddingTop: '0.5rem', paddingBottom: '3rem' }}>
        <div className="fleet-header" style={{ marginBottom: '1rem' }}>
          <div className="fleet-title-container">
            <h2 className="fleet-title">
              Trust <span className="text-accent">First</span>
            </h2>
            <p className="fleet-subtitle">
              NepRide is designed to make vehicle discovery feel simple, reliable, and consistent from landing page to booking.
            </p>
          </div>
        </div>

        <article className="landing-panel landing-panel-wide">
          <div className="landing-panel-icon">
            <Clock3 size={18} />
          </div>
          <h2>Fast confirmation, clean experience</h2>
          <p>
            Customers can move from browsing to booking without extra noise. The same visual language used on the landing page carries through here
            so the about page feels like part of the same product.
          </p>
        </article>
      </section>
    </div>
  );
};

export default AboutUsPage;
