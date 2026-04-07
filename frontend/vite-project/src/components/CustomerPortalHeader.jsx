import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, LogOut } from 'lucide-react';

const CustomerPortalHeader = ({ activeTab = '', activeProfile = false, onLogout, onProfile, onTabChange }) => {
  const navigate = useNavigate();
  const [isProfileHovered, setIsProfileHovered] = useState(false);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', path: '/customer-dashboard', state: { activeView: 'dashboard' } },
    { key: 'vehicles', label: 'Vehicle', path: '/customer-dashboard', state: { activeView: 'vehicles' } },
    { key: 'bookings', label: 'My Bookings', path: '/customer-dashboard', state: { activeView: 'bookings' } },
    { key: 'about', label: 'About Us', path: '/customer-dashboard/about', state: { activeView: 'about' } },
    { key: 'contact', label: 'Contact Us', path: '/customer-dashboard/contact', state: { activeView: 'contact' } },
  ];

  const handleNavigate = (tab) => {
    onTabChange?.(tab.state?.activeView || tab.key);
    navigate(tab.path, tab.state ? { state: tab.state } : undefined);
  };

  const isProfileActive = activeProfile || isProfileHovered;
  const effectiveActiveTab = activeProfile ? 'profile' : activeTab;

  return (
    <header
      className="home-header"
      style={{
        backgroundColor: '#111111',
        borderBottom: '1px solid #D4AF37',
        padding: '1rem 1.5rem 0.9rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <Car size={20} color="#D4AF37" />
          <span style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.02em' }}>NepRide</span>
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const isActive = effectiveActiveTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleNavigate(tab)}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '0.72rem 1.05rem',
                backgroundColor: isActive ? '#D4AF37' : 'transparent',
                color: isActive ? '#111111' : '#d9d9d9',
                fontSize: '0.92rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: 'pointer',
                boxShadow: isActive ? 'inset 0 -2px 0 #b38b1d' : 'none',
                transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onProfile}
          onMouseEnter={() => setIsProfileHovered(true)}
          onMouseLeave={() => setIsProfileHovered(false)}
          style={{
            border: `1px solid ${isProfileActive ? '#D4AF37' : '#3a3524'}`,
            backgroundColor: isProfileActive ? '#D4AF37' : '#171717',
            color: isProfileActive ? '#111111' : '#e5e5e5',
            borderRadius: '999px',
            padding: '0.48rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
            boxShadow: isProfileActive ? '0 0 0 2px rgba(212,175,55,0.18) inset' : 'none',
            transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1rem' }} aria-hidden="true">✓</span>
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          style={{
            border: '1px solid #4a1f1f',
            backgroundColor: 'transparent',
            color: '#f0b2b2',
            borderRadius: '999px',
            padding: '0.48rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  );
};

export default CustomerPortalHeader;