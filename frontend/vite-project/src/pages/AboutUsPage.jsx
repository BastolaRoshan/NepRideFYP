import { useNavigate } from 'react-router-dom';
import { BadgeCheck, CarFront, ShieldCheck, Sparkles, Users, Clock3, Wallet, Star } from 'lucide-react';
import CustomerPortalHeader from '../components/CustomerPortalHeader';

const cardStyle = {
  border: '1px solid rgba(219,179,59,0.16)',
  borderRadius: '20px',
  background: 'linear-gradient(180deg, rgba(20,20,20,0.92) 0%, rgba(12,12,12,0.96) 100%)',
  boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
};

const benefitCards = [
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

const highlights = [
  { icon: Users, label: 'Verified Vendors' },
  { icon: Wallet, label: 'Secure Booking' },
  { icon: Clock3, label: 'Fast Confirmation' },
  { icon: Star, label: 'Trusted Experience' },
];

const metricCards = [
  {
    icon: ShieldCheck,
    title: 'Trust First',
    copy: 'Only verified vendors list vehicles.',
  },
  {
    icon: BadgeCheck,
    title: 'Clear Booking',
    copy: 'Simple steps and status tracking.',
  },
  {
    icon: Sparkles,
    title: 'Premium UX',
    copy: 'Clean, fast, and easy to use.',
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
    <div
      style={{
        minHeight: '100vh',
        color: '#f5f5f5',
        padding: '1.2rem',
        background:
          'radial-gradient(circle at top left, rgba(219,179,59,0.14), transparent 24%), radial-gradient(circle at top right, rgba(219,179,59,0.08), transparent 22%), linear-gradient(180deg, #0b0b0b 0%, #111111 100%)',
      }}
    >
      <CustomerPortalHeader activeTab="about" onProfile={handleGoToProfile} onLogout={handleLogout} />
      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <header
          style={{
            ...cardStyle,
            marginBottom: '1rem',
            padding: '1.3rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 'auto -12% -35% auto',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(219,179,59,0.22) 0%, rgba(219,179,59,0) 72%)',
              pointerEvents: 'none',
            }}
          />

          <div
            className="about-hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 0.75fr)',
              gap: '1rem',
              alignItems: 'stretch',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(219,179,59,0.24)',
                  backgroundColor: 'rgba(219,179,59,0.08)',
                  color: '#DBB33B',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <CarFront size={13} /> About NepRide
              </span>

              <h1 style={{ margin: '0.85rem 0 0', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                vehicle booking built around trust, speed, and confidence.
              </h1>

              <p style={{ margin: '0.9rem 0 0', color: '#b2b2b2', maxWidth: '44rem', lineHeight: 1.65, fontSize: '1rem' }}>
                NepRide helps customers discover verified vehicles, book securely, and manage their rentals in a clean dashboard experience.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '1.1rem' }}>
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '0.55rem 0.8rem',
                        color: '#e7e7e7',
                        fontSize: '0.9rem',
                      }}
                    >
                      <Icon size={14} color="#DBB33B" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.8rem', position: 'relative', zIndex: 1 }}>
              {metricCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '0.9rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        width: '2.6rem',
                        height: '2.6rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(219,179,59,0.22)',
                        backgroundColor: 'rgba(219,179,59,0.08)',
                        color: '#DBB33B',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>{item.title}</p>
                      <p style={{ margin: '0.3rem 0 0', color: '#b6b6b6', lineHeight: 1.55, fontSize: '0.92rem' }}>{item.copy}</p>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => navigate('/customer-dashboard')}
                style={{
                  marginTop: '0.2rem',
                  border: '1px solid rgba(219,179,59,0.28)',
                  background: 'linear-gradient(180deg, rgba(219,179,59,0.14), rgba(219,179,59,0.08))',
                  color: '#DBB33B',
                  borderRadius: '16px',
                  padding: '0.8rem 1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        <section style={{ ...cardStyle, marginBottom: '1rem', padding: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '12px', backgroundColor: 'rgba(219,179,59,0.08)', border: '1px solid rgba(219,179,59,0.22)', color: '#DBB33B', display: 'grid', placeItems: 'center' }}>
              <CarFront size={16} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Introduction</h2>
              <p style={{ margin: '0.2rem 0 0', color: '#c6c6c6', fontSize: '0.92rem' }}>A cleaner way to discover and book vehicles.</p>
            </div>
          </div>

          <div className="about-intro-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.85rem' }}>
            <article style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.95rem' }}>
              <p style={{ margin: 0, color: '#DBB33B', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Purpose</p>
              <p style={{ margin: '0.5rem 0 0', color: '#d6d6d6', lineHeight: 1.6 }}>
                Help customers find the right vehicle faster.
              </p>
            </article>

            <article style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.95rem' }}>
              <p style={{ margin: 0, color: '#DBB33B', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Experience</p>
              <p style={{ margin: '0.5rem 0 0', color: '#d6d6d6', lineHeight: 1.6 }}>
                Browse, compare, and book with confidence.
              </p>
            </article>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: '1rem', padding: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '12px', backgroundColor: 'rgba(219,179,59,0.08)', border: '1px solid rgba(219,179,59,0.22)', color: '#DBB33B', display: 'grid', placeItems: 'center' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Mission</h2>
              <p style={{ margin: '0.2rem 0 0', color: '#c6c6c6', fontSize: '0.92rem' }}>Trust, clarity, and speed in every booking.</p>
            </div>
          </div>

          <div className="about-benefits" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.8rem' }}>
            {benefitCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.95rem' }}>
                  <div
                    style={{
                      width: '2.35rem',
                      height: '2.35rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(219,179,59,0.08)',
                      border: '1px solid rgba(219,179,59,0.22)',
                      color: '#DBB33B',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{item.title}</h3>
                  <p style={{ margin: '0.45rem 0 0', color: '#b7b7b7', lineHeight: 1.55, fontSize: '0.92rem' }}>{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .about-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 920px) {
          .about-intro-grid {
            grid-template-columns: 1fr !important;
          }

          .about-benefits {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutUsPage;
