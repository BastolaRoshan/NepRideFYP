import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Car, Edit2, LogOut, Package, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { clearSessionAuth, getSessionToken, getStoredServiceAccessAllowed, getStoredVerificationStatus, setSessionAuth } from '../utils/sessionAuth';

const palette = {
  bg: '#F6F1E8',
  shell: '#FFFDFC',
  card: '#FFFFFF',
  border: '#E7DFD0',
  accent: '#D4AF37',
  accentDark: '#A87A12',
  accentSoft: '#FFF6DD',
  text: '#171717',
  textSecondary: '#667085',
  approved: '#15803D',
  underReview: '#B45309',
  rejected: '#B91C1C',
  muted: '#94A3B8',
  surface: '#FBF8F1',
};

const normalizeVerificationStatus = (status) => {
  if (status === 'UnderReview') return 'Under Review';
  if (status === 'NotSubmitted') return 'Unverified';
  return status || 'Unverified';
};

const normalizeBookingStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'pending_payment' || normalized === 'pending') return 'pending_payment';
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  if (normalized === 'completed') return 'completed';

  return normalized || 'pending_payment';
};

const bookingStatusMeta = (status) => {
  const normalized = normalizeBookingStatus(status);

  if (normalized === 'confirmed') {
    return { label: 'Confirmed', bg: '#ECFDF3', text: palette.approved, border: '#86EFAC' };
  }

  if (normalized === 'cancelled') {
    return { label: 'Cancelled', bg: '#FEF2F2', text: palette.rejected, border: '#FCA5A5' };
  }

  if (normalized === 'completed') {
    return { label: 'Completed', bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' };
  }

  return { label: 'Awaiting Payment', bg: '#FFF7ED', text: palette.underReview, border: '#FDBA74' };
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const fetchJsonWithTimeout = async (url, options = {}) => {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 12000;
  const response = await apiFetch(url, {
    ...options,
    timeoutMs,
  });

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { response, data };
  }

  const rawText = await response.text();
  return {
    response,
    data: {
      success: false,
      message: rawText || 'Unexpected server response',
    },
  };
};

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDateRange = (startDate, endDate) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const start = startDate ? formatter.format(new Date(startDate)) : 'N/A';
  const end = endDate ? formatter.format(new Date(endDate)) : 'N/A';
  return `${start} - ${end}`;
};

const VEHICLE_FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22360%22 viewBox=%220 0 640 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop offset=%220%25%22 stop-color=%22%23d9dfe8%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23eef2f7%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23g)%22 width=%22640%22 height=%22360%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23A87A12%22 font-family=%22Arial%22 font-size=%2230%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ENepRide Vehicle%3C/text%3E%3C/svg%3E';

const resolveVehicleImageSrc = (vehicle) => {
  if (vehicle?.image) return vehicle.image;
  if (!vehicle?._id) return VEHICLE_FALLBACK_IMAGE;
  return `/api/vehicles/image/${vehicle._id}`;
};

const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'overview');
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [nowMs, setNowMs] = useState(Date.now());
  const [message, setMessage] = useState({ text: '', isError: false });
  const [deletingVehicleId, setDeletingVehicleId] = useState('');
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(getStoredVerificationStatus());
  const [serviceAccessAllowed, setServiceAccessAllowed] = useState(getStoredServiceAccessAllowed());

  const serviceLockMessage = 'Your vendor tools are locked until verification is approved.';

  useEffect(() => {
    const nextActiveTab = location.state?.activeTab;
    if (nextActiveTab) {
      setActiveTab(nextActiveTab);
    }
  }, [location.state]);

  const loadVerificationStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/api/user/verification-status', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) return;

      const nextStatus = data?.verification?.verificationStatus || 'NotSubmitted';
      const nextAccessAllowed = Boolean(data?.verification?.isServiceAccessAllowed);

      setVerificationStatus(nextStatus);
      setServiceAccessAllowed(nextAccessAllowed);
      setSessionAuth({
        token: getSessionToken(),
        verificationStatus: nextStatus,
        isServiceAccessAllowed: nextAccessAllowed,
      });
    } catch {
      // Keep fallback local state if the request fails.
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    let failSafeTimerId = null;

    failSafeTimerId = setTimeout(() => {
      setLoading(false);
      setMessage({ text: 'Loading took too long. Please refresh the page.', isError: true });
    }, 15000);

    try {
      const [vehicleResult, bookingResult] = await Promise.allSettled([
        fetchJsonWithTimeout('/api/vehicles/vendor', { method: 'GET', credentials: 'include', timeoutMs: 12000 }),
        fetchJsonWithTimeout('/api/bookings/vendor-bookings', { method: 'GET', credentials: 'include', timeoutMs: 12000 }),
      ]);

      let vehicleError = '';
      let bookingError = '';

      if (vehicleResult.status === 'fulfilled') {
        const { response: vehicleResponse, data: vehicleData } = vehicleResult.value;

        if (!vehicleResponse.ok || !vehicleData.success) {
          vehicleError = vehicleData.message || 'Failed to load vehicles';
        } else {
          setVehicles(Array.isArray(vehicleData.vehicles) ? vehicleData.vehicles : []);
        }
      } else {
        vehicleError = vehicleResult.reason?.message || 'Failed to load vehicles';
      }

      if (bookingResult.status === 'fulfilled') {
        const { response: bookingResponse, data: bookingData } = bookingResult.value;

        if (!bookingResponse.ok || !bookingData.success) {
          bookingError = bookingData.message || 'Failed to load bookings';
        } else {
          setBookings(Array.isArray(bookingData.bookings) ? bookingData.bookings : []);
        }
      } else {
        bookingError = bookingResult.reason?.message || 'Failed to load bookings';
      }

      if (vehicleError && bookingError) {
        setMessage({ text: `${vehicleError}. ${bookingError}.`, isError: true });
      } else if (vehicleError) {
        setMessage({ text: vehicleError, isError: true });
      } else if (bookingError) {
        setMessage({ text: `${bookingError}. Vehicle listings are still available.`, isError: true });
      } else {
        setMessage({ text: '', isError: false });
      }
    } catch (error) {
      setMessage({ text: error.message || 'Unable to load vendor dashboard.', isError: true });
    } finally {
      if (failSafeTimerId) {
        clearTimeout(failSafeTimerId);
      }
      setLoading(false);
    }
  }, []);

  const loadVendorBookingsRealtime = useCallback(async () => {
    try {
      const response = await apiFetch('/api/bookings/vendor-bookings', { method: 'GET', credentials: 'include', timeoutMs: 12000 });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return;
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      // Silently ignore transient polling errors.
    }
  }, []);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const pollId = setInterval(() => {
      loadVendorBookingsRealtime();
    }, 2000);

    return () => clearInterval(pollId);
  }, [loadVendorBookingsRealtime]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadVendorBookingsRealtime();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadVendorBookingsRealtime]);

  const liveBookings = useMemo(() => {
    return bookings.map((booking) => {
      const originalStatus = normalizeBookingStatus(booking.status);
      const expiresAtMs = booking?.expiresAt ? new Date(booking.expiresAt).getTime() : null;
      const hasTimer = originalStatus === 'pending_payment' && Number.isFinite(expiresAtMs);
      const remainingSeconds = hasTimer ? Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000)) : 0;
      const isExpiredPending = hasTimer && remainingSeconds <= 0;
      const normalizedStatus = isExpiredPending ? 'cancelled' : originalStatus;

      return {
        ...booking,
        normalizedStatus,
        remainingSeconds,
        isExpiredPending,
      };
    });
  }, [bookings, nowMs]);

  const stats = useMemo(() => {
    const normalizedBookings = liveBookings;

    const revenue = normalizedBookings.reduce((total, booking) => {
      const isPaid = String(booking.paymentStatus || '').toLowerCase() === 'paid';
      if (isPaid || booking.normalizedStatus === 'confirmed' || booking.normalizedStatus === 'completed') {
        return total + Number(booking.totalPrice || 0);
      }
      return total;
    }, 0);

    const pendingBookings = normalizedBookings.filter((booking) => booking.normalizedStatus === 'pending_payment').length;
    const confirmedBookings = normalizedBookings.filter((booking) => booking.normalizedStatus === 'confirmed').length;
    const completedBookings = normalizedBookings.filter((booking) => booking.normalizedStatus === 'completed').length;
    const cancelledBookings = normalizedBookings.filter((booking) => booking.normalizedStatus === 'cancelled').length;

    const nextBooking = [...normalizedBookings]
      .sort((left, right) => new Date(left.startDate || 0).getTime() - new Date(right.startDate || 0).getTime())
      .find((booking) => booking.normalizedStatus !== 'cancelled');

    return {
      vehicles: vehicles.length,
      bookings: normalizedBookings.length,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      revenue,
      nextBooking,
    };
  }, [liveBookings, vehicles]);

  const filteredBookings = useMemo(() => {
    if (bookingStatusFilter === 'all') {
      return liveBookings;
    }

    return liveBookings.filter((booking) => booking.normalizedStatus === bookingStatusFilter);
  }, [liveBookings, bookingStatusFilter]);

  const ratedBookings = useMemo(() => {
    return liveBookings
      .filter((booking) => Number(booking?.customerRating?.score || 0) > 0)
      .sort((left, right) => {
        const leftTime = new Date(left?.customerRating?.ratedAt || left?.updatedAt || 0).getTime();
        const rightTime = new Date(right?.customerRating?.ratedAt || right?.updatedAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [liveBookings]);

  const vendorRatingSummary = useMemo(() => {
    if (ratedBookings.length === 0) {
      return { count: 0, average: 0 };
    }

    const sum = ratedBookings.reduce((total, booking) => total + Number(booking?.customerRating?.score || 0), 0);
    const average = Number((sum / ratedBookings.length).toFixed(2));
    return { count: ratedBookings.length, average };
  }, [ratedBookings]);

  const verificationLabel = normalizeVerificationStatus(verificationStatus);

  const handleLogout = async () => {
    try {
      const response = await globalThis.fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        clearSessionAuth();
        navigate('/login');
      }
    } catch {
      setMessage({ text: 'Logout failed. Please try again.', isError: true });
    }
  };

  const handleStatCardClick = (key) => {
    if (key === 'vehicles') {
      setActiveTab('vehicles');
      return;
    }

    if (key === 'bookings') {
      setBookingStatusFilter('all');
      setActiveTab('bookings');
      return;
    }

    if (key === 'pending') {
      setBookingStatusFilter('pending_payment');
      setActiveTab('bookings');
      return;
    }

    if (key === 'revenue') {
      setBookingStatusFilter('all');
      setActiveTab('bookings');
    }
  };

  const handleAddVehicle = () => {
    if (!serviceAccessAllowed) {
      setMessage({ text: serviceLockMessage, isError: true });
      return;
    }

    navigate('/vendor-dashboard/add-vehicle');
  };

  const handleGoToVerification = () => {
    navigate('/verification');
  };

  const handleEditVehicle = (vehicle) => {
    if (!serviceAccessAllowed) {
      setMessage({ text: serviceLockMessage, isError: true });
      return;
    }

    navigate('/vendor-dashboard/add-vehicle', {
      state: {
        mode: 'edit',
        vehicle,
      },
    });
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!serviceAccessAllowed) {
      setMessage({ text: serviceLockMessage, isError: true });
      return;
    }

    const shouldDelete = window.confirm('Delete this vehicle listing?');
    if (!shouldDelete) return;

    setDeletingVehicleId(vehicleId);

    try {
      const response = await apiFetch(`/api/vehicles/${vehicleId}`, {
        timeoutMs: 12000,
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete vehicle');
      }

      setVehicles((previous) => previous.filter((vehicle) => vehicle._id !== vehicleId));
      setMessage({ text: 'Vehicle deleted successfully.', isError: false });
    } catch (error) {
      setMessage({ text: error.message || 'Unable to delete vehicle.', isError: true });
    } finally {
      setDeletingVehicleId('');
    }
  };

  const handleBookingStatusUpdate = async (bookingId, status) => {
    if (!serviceAccessAllowed) {
      setMessage({ text: serviceLockMessage, isError: true });
      return;
    }

    setUpdatingBookingId(bookingId);

    try {
      const response = await apiFetch(`/api/bookings/${bookingId}/status`, {
        timeoutMs: 12000,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update booking status');
      }

      setBookings((previous) => previous.map((booking) => (booking._id === bookingId ? data.booking : booking)));
      setMessage({ text: `Booking updated to ${status}.`, isError: false });
    } catch (error) {
      setMessage({ text: error.message || 'Unable to update booking.', isError: true });
    } finally {
      setUpdatingBookingId('');
    }
  };

  const shellStyle = {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, rgba(212,175,55,0.18), transparent 32%), linear-gradient(180deg, #FCFAF5 0%, #F6F1E8 100%)',
    color: palette.text,
  };

  const cardStyle = {
    backgroundColor: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: '18px',
    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)',
  };

  const badgeStyle = (meta) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    borderRadius: '999px',
    border: `1px solid ${meta.border}`,
    backgroundColor: meta.bg,
    color: meta.text,
    padding: '0.35rem 0.7rem',
    fontSize: '0.78rem',
    fontWeight: 700,
  });

  const actionButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    borderRadius: '12px',
    border: `1px solid ${palette.accent}`,
    backgroundColor: palette.accentSoft,
    color: palette.accentDark,
    padding: '0.68rem 1rem',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
  };

  const tabs = [
    { key: 'overview', label: 'Dashboard' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'add_vehicle', label: 'Add Vehicle' },
  ];

  return (
    <div style={shellStyle}>
      <nav
        style={{
          backgroundColor: palette.card,
          borderBottom: `1px solid ${palette.border}`,
          padding: '0.85rem 1.25rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #E9C96A 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#1A1A1A',
                flexShrink: 0,
              }}
            >
              <Car size={17} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', color: palette.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
              NepRide Vendor
            </h1>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            {tabs.map((tab) => {
              const isActionTab = tab.key === 'add_vehicle';
              const isActive = activeTab === tab.key;

              const handleTabClick = () => {
                if (tab.key === 'add_vehicle') {
                  handleAddVehicle();
                  return;
                }

                setActiveTab(tab.key);
              };

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={handleTabClick}
                  disabled={!serviceAccessAllowed && tab.key === 'add_vehicle'}
                  style={{
                    border: isActionTab ? '1px solid #D4AF37' : 'none',
                    borderRadius: '999px',
                    minHeight: '40px',
                    padding: '0.62rem 1rem',
                    backgroundColor: isActive ? palette.accent : isActionTab ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#111111' : isActionTab ? '#A87A12' : '#6B7280',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    cursor: !serviceAccessAllowed && tab.key === 'add_vehicle' ? 'not-allowed' : 'pointer',
                    boxShadow: isActive ? 'inset 0 -2px 0 #b38b1d' : 'none',
                    opacity: !serviceAccessAllowed && tab.key === 'add_vehicle' ? 0.7 : 1,
                    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.38rem',
                  }}
                >
                  {tab.key === 'add_vehicle' ? <Plus size={13} /> : null}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'nowrap' }}>
            <button
              type="button"
              onClick={handleGoToVerification}
              style={{
                border: '1px solid #D8DEE8',
                backgroundColor: '#FFFFFF',
                color: '#2D3748',
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'pointer',
              }}
            >
              <Users size={13} /> Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: '1px solid #F3B0B0',
                backgroundColor: '#FFF7F7',
                color: palette.rejected,
                borderRadius: '999px',
                minHeight: '40px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.38rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem' }}>
        {message.text && activeTab !== 'overview' && (
          <div
            style={{
              ...cardStyle,
              marginBottom: '1rem',
              padding: '0.9rem 1rem',
              border: message.isError ? '1px solid #FCA5A5' : '1px solid #86EFAC',
              backgroundColor: message.isError ? '#FEF2F2' : '#ECFDF3',
              color: message.isError ? palette.rejected : palette.approved,
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        {activeTab === 'overview' && (
        <section
          style={{
            ...cardStyle,
            padding: '1.5rem',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF9EB 100%)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1rem',
              alignItems: 'stretch',
            }}
          >
            <div>
              <div style={{ marginBottom: '0.9rem' }}>
                <span style={badgeStyle({ bg: palette.accentSoft, text: palette.accentDark, border: '#F2D88C' })}>
                  Vendor Workspace
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.15 }}>
                Keep your fleet visible, your bookings moving, and your account ready for service.
              </h2>
              <p style={{ margin: '0.75rem 0 0', color: palette.textSecondary, fontSize: '0.98rem', maxWidth: '58rem' }}>
                Track vehicle listings, review incoming bookings, and update booking states from one focused dashboard.
              </p>

              {message.text && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    border: message.isError ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                    backgroundColor: message.isError ? '#FEF2F2' : '#ECFDF3',
                    color: message.isError ? palette.rejected : palette.approved,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  {message.text}
                </div>
              )}

              {!serviceAccessAllowed && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.95rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid #FDBA74',
                    backgroundColor: '#FFF7ED',
                    color: '#9A3412',
                    fontSize: '0.92rem',
                  }}
                >
                  <strong>Service locked.</strong> {serviceLockMessage} Current status: {verificationLabel}.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleAddVehicle} disabled={!serviceAccessAllowed} style={{ ...actionButtonStyle, opacity: serviceAccessAllowed ? 1 : 0.65, cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed' }}>
                  <Plus size={14} /> Add Vehicle
                </button>
                <button type="button" onClick={() => setActiveTab('vehicles')} style={actionButtonStyle}>
                  <Car size={14} /> View Vehicles
                </button>
                <button type="button" onClick={() => setActiveTab('bookings')} style={actionButtonStyle}>
                  <CalendarDays size={14} /> View Bookings
                </button>
              </div>
            </div>
          </div>
        </section>
        )}

        {loading ? (
          <div style={{ ...cardStyle, padding: '2rem', textAlign: 'center', color: palette.textSecondary }}>Loading dashboard...</div>
        ) : null}

        {!loading && activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.9rem' }}>
              {[
                { key: 'vehicles', label: 'Vehicles', value: stats.vehicles, icon: Car },
                { key: 'bookings', label: 'Bookings', value: stats.bookings, icon: CalendarDays },
                { key: 'pending', label: 'Pending', value: stats.pendingBookings, icon: Package },
                { key: 'revenue', label: 'Revenue', value: formatMoney(stats.revenue), icon: BadgeCheck },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleStatCardClick(item.key)}
                    style={{
                      ...cardStyle,
                      width: '100%',
                      padding: '1rem 1.1rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform = 'translateY(-1px)';
                      event.currentTarget.style.boxShadow = '0 22px 48px rgba(15, 23, 42, 0.08)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = 'translateY(0)';
                      event.currentTarget.style.boxShadow = '0 18px 45px rgba(15, 23, 42, 0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.8rem' }}>{item.label}</p>
                        <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.45rem' }}>{item.value}</h3>
                      </div>
                      <div
                        style={{
                          width: '2.8rem',
                          height: '2.8rem',
                          borderRadius: '14px',
                          backgroundColor: palette.accentSoft,
                          color: palette.accentDark,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
            <div style={{ ...cardStyle, padding: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Recent vehicles</h3>
                  <p style={{ margin: '0.25rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>Your latest published listings.</p>
                </div>
                <button type="button" onClick={() => setActiveTab('vehicles')} style={{ ...actionButtonStyle, padding: '0.55rem 0.8rem' }}>
                  View all
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div style={{ border: `1px dashed ${palette.border}`, borderRadius: '16px', padding: '1.75rem', textAlign: 'center', color: palette.textSecondary }}>
                  <Package size={36} style={{ marginBottom: '0.6rem', color: palette.muted }} />
                  <p style={{ margin: 0 }}>No vehicles listed yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.9rem' }}>
                  {vehicles.slice(0, 3).map((vehicle) => (
                    <div key={vehicle._id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: '0.9rem', padding: '0.85rem', border: `1px solid ${palette.border}`, borderRadius: '16px', backgroundColor: palette.surface, alignItems: 'center' }}>
                      <div style={{ width: '96px', height: '72px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
                        <img
                          src={resolveVehicleImageSrc(vehicle)}
                          alt={vehicle.title || vehicle.name || 'Vehicle'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{vehicle.title || vehicle.name}</h4>
                        <p style={{ margin: '0.35rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>
                          {vehicle.vehicleType || vehicle.type} • {vehicle.fuelType || vehicle.fuel} • {vehicle.seatCapacity ?? vehicle.seats} seats
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: palette.accentDark }}>{formatMoney(vehicle.pricePerDay)} / day</strong>
                        <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleEditVehicle(vehicle)}
                            disabled={!serviceAccessAllowed}
                            style={{
                              ...actionButtonStyle,
                              padding: '0.5rem 0.75rem',
                              opacity: serviceAccessAllowed ? 1 : 0.65,
                              cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Booking health</h3>
              <p style={{ margin: '0.25rem 0 1rem', color: palette.textSecondary, fontSize: '0.85rem' }}>Current distribution of booking states.</p>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[
                  { key: 'confirmed', label: 'Confirmed', value: stats.confirmedBookings, color: palette.approved },
                  { key: 'completed', label: 'Completed', value: stats.completedBookings, color: '#2563EB' },
                  { key: 'pending_payment', label: 'Pending', value: stats.pendingBookings, color: palette.underReview },
                  { key: 'cancelled', label: 'Cancelled', value: stats.cancelledBookings, color: palette.rejected },
                ].map((item) => {
                  const isSelected = bookingStatusFilter === item.key;

                  return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setBookingStatusFilter(item.key);
                      setActiveTab('bookings');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1rem',
                      borderRadius: '14px',
                      border: `1px solid ${isSelected ? item.color : palette.border}`,
                      backgroundColor: isSelected ? '#FFFFFF' : palette.surface,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isSelected ? `0 0 0 2px ${item.color}20 inset` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: isSelected ? palette.text : palette.textSecondary, fontWeight: 700 }}>{item.label}</span>
                      <strong style={{ color: item.color }}>{item.value}</strong>
                    </div>
                  </button>
                  );
                })}
              </div>

              <div style={{ marginTop: '1rem', borderTop: `1px solid ${palette.border}`, paddingTop: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Customer ratings</h3>
                <p style={{ margin: '0.25rem 0 0.85rem', color: palette.textSecondary, fontSize: '0.85rem' }}>
                  {vendorRatingSummary.count > 0
                    ? `${vendorRatingSummary.average}/5 average from ${vendorRatingSummary.count} rating${vendorRatingSummary.count === 1 ? '' : 's'}`
                    : 'No customer ratings submitted yet.'}
                </p>

                {ratedBookings.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.55rem' }}>
                    {ratedBookings.slice(0, 3).map((booking) => (
                      <div
                        key={`rating-${booking._id}`}
                        style={{
                          border: `1px solid ${palette.border}`,
                          borderRadius: '12px',
                          backgroundColor: palette.surface,
                          padding: '0.68rem 0.75rem',
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                          {booking.vehicle?.title || booking.vehicle?.name || 'Vehicle'}
                        </p>
                        <p style={{ margin: '0.28rem 0 0', color: palette.textSecondary, fontSize: '0.82rem' }}>
                          Customer: {booking.customer?.name || 'Unknown'}
                        </p>
                        <p style={{ margin: '0.28rem 0 0', color: palette.accentDark, fontSize: '0.85rem', fontWeight: 700 }}>
                          Rating: {booking.customerRating.score}/5
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'vehicles' && (
          <div style={{ ...cardStyle, padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Vehicle listings</h3>
                <p style={{ margin: '0.25rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>Edit or remove the vehicles you manage.</p>
              </div>

              <button type="button" onClick={handleAddVehicle} disabled={!serviceAccessAllowed} style={{ ...actionButtonStyle, opacity: serviceAccessAllowed ? 1 : 0.65, cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed' }}>
                <Plus size={14} /> Add Vehicle
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div style={{ border: `1px dashed ${palette.border}`, borderRadius: '16px', padding: '2rem', textAlign: 'center', color: palette.textSecondary }}>
                <Package size={40} style={{ marginBottom: '0.75rem', color: palette.muted }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No vehicles listed yet.</p>
                <p style={{ margin: '0.35rem 0 0' }}>Add your first listing to start receiving booking requests.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {vehicles.map((vehicle) => (
                  <article key={vehicle._id} style={{ border: `1px solid ${palette.border}`, borderRadius: '18px', overflow: 'hidden', backgroundColor: palette.card }}>
                    <div style={{ aspectRatio: '16 / 9', backgroundColor: '#E5E7EB' }}>
                      <img
                        src={resolveVehicleImageSrc(vehicle)}
                        alt={vehicle.title || vehicle.name || 'Vehicle'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{vehicle.title || vehicle.name}</h4>
                      <p style={{ margin: '0.35rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>
                        {vehicle.vehicleType || vehicle.type} • {vehicle.fuelType || vehicle.fuel} • {vehicle.seatCapacity ?? vehicle.seats} seats
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.95rem' }}>
                        <div>
                          <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.78rem' }}>Price per day</p>
                          <strong style={{ color: palette.accentDark }}>{formatMoney(vehicle.pricePerDay)}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleEditVehicle(vehicle)}
                            disabled={!serviceAccessAllowed}
                            style={{
                              ...actionButtonStyle,
                              padding: '0.52rem 0.72rem',
                              opacity: serviceAccessAllowed ? 1 : 0.65,
                              cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(vehicle._id)}
                            disabled={deletingVehicleId === vehicle._id || !serviceAccessAllowed}
                            style={{
                              ...actionButtonStyle,
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FEF2F2',
                              color: palette.rejected,
                              padding: '0.52rem 0.72rem',
                              opacity: deletingVehicleId === vehicle._id || !serviceAccessAllowed ? 0.65 : 1,
                              cursor: deletingVehicleId === vehicle._id || !serviceAccessAllowed ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={13} /> {deletingVehicleId === vehicle._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'bookings' && (
          <div style={{ ...cardStyle, padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Booking requests</h3>
                <p style={{ margin: '0.25rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>Review incoming requests and move them through the workflow.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'pending_payment', label: 'Pending' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
              ].map((filter) => {
                const isActive = bookingStatusFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setBookingStatusFilter(filter.key)}
                    style={{
                      borderRadius: '999px',
                      border: `1px solid ${isActive ? palette.accentDark : palette.border}`,
                      backgroundColor: isActive ? palette.accentSoft : palette.card,
                      color: isActive ? palette.accentDark : palette.textSecondary,
                      padding: '0.45rem 0.8rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {filteredBookings.length === 0 ? (
              <div style={{ border: `1px dashed ${palette.border}`, borderRadius: '16px', padding: '2rem', textAlign: 'center', color: palette.textSecondary }}>
                <Package size={40} style={{ marginBottom: '0.75rem', color: palette.muted }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No bookings found for this status.</p>
                <p style={{ margin: '0.35rem 0 0' }}>Try a different filter or choose All.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.95rem' }}>
                {filteredBookings.map((booking) => {
                  const normalizedStatus = booking.normalizedStatus;
                  const meta = bookingStatusMeta(normalizedStatus);
                  const canUpdate = serviceAccessAllowed && updatingBookingId !== booking._id;
                  const ratingScore = Number(booking?.customerRating?.score || 0);
                  const hasCustomerRating = ratingScore > 0;

                  return (
                    <article key={booking._id} style={{ border: `1px solid ${palette.border}`, borderRadius: '18px', padding: '1rem', backgroundColor: palette.surface }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}>{booking.vehicle?.title || booking.vehicle?.name || 'Vehicle booking'}</h4>
                          <p style={{ margin: '0.35rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>
                            Customer: {booking.customer?.name || 'Unknown'} • {booking.customer?.email || 'No email'}
                          </p>
                          <p style={{ margin: '0.25rem 0 0', color: palette.textSecondary, fontSize: '0.85rem' }}>
                            {formatDateRange(booking.startDate, booking.endDate)} • {booking.totalDays || '--'} day(s)
                          </p>
                        </div>

                        <span style={badgeStyle(meta)}>{meta.label}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                        <div style={{ padding: '0.8rem', borderRadius: '14px', border: `1px solid ${palette.border}`, backgroundColor: palette.card }}>
                          <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.78rem' }}>Payment status</p>
                          <strong>{booking.paymentStatus || 'Unpaid'}</strong>
                        </div>
                        <div style={{ padding: '0.8rem', borderRadius: '14px', border: `1px solid ${palette.border}`, backgroundColor: palette.card }}>
                          <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.78rem' }}>Total</p>
                          <strong>{formatMoney(booking.totalPrice)}</strong>
                        </div>
                        <div style={{ padding: '0.8rem', borderRadius: '14px', border: `1px solid ${palette.border}`, backgroundColor: palette.card }}>
                          <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.78rem' }}>Booking state</p>
                          <strong style={{ textTransform: 'capitalize' }}>{normalizedStatus.replace('_', ' ')}</strong>
                        </div>
                        {normalizeBookingStatus(booking.status) === 'pending_payment' && (
                          <div style={{ padding: '0.8rem', borderRadius: '14px', border: `1px solid ${palette.border}`, backgroundColor: palette.card }}>
                            <p style={{ margin: 0, color: palette.textSecondary, fontSize: '0.78rem' }}>Pending payment timer</p>
                            <strong style={{ color: booking.isExpiredPending ? palette.rejected : palette.underReview }}>
                              {booking.isExpiredPending ? 'Expired' : formatCountdown(booking.remainingSeconds)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {hasCustomerRating && (
                        <div
                          style={{
                            marginTop: '0.9rem',
                            border: '1px solid #F2D88C',
                            backgroundColor: '#FFF9E8',
                            borderRadius: '12px',
                            padding: '0.72rem 0.8rem',
                            display: 'grid',
                            gap: '0.25rem',
                          }}
                        >
                          <strong style={{ color: palette.accentDark }}>Customer Rating: {ratingScore}/5</strong>
                          <span style={{ color: '#805B07', fontSize: '0.82rem' }}>
                            Rated by {booking.customer?.name || 'Customer'}
                            {booking?.customerRating?.ratedAt ? ` on ${new Date(booking.customerRating.ratedAt).toLocaleDateString()}` : ''}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        {normalizedStatus === 'pending_payment' && (
                          <button
                            type="button"
                            onClick={() => handleBookingStatusUpdate(booking._id, 'Confirmed')}
                            disabled={!canUpdate}
                            style={{
                              ...actionButtonStyle,
                              padding: '0.55rem 0.78rem',
                              opacity: canUpdate ? 1 : 0.65,
                              cursor: canUpdate ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <BadgeCheck size={13} /> Confirm
                          </button>
                        )}

                        {normalizedStatus === 'confirmed' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleBookingStatusUpdate(booking._id, 'Completed')}
                              disabled={!canUpdate}
                              style={{
                                ...actionButtonStyle,
                                padding: '0.55rem 0.78rem',
                                opacity: canUpdate ? 1 : 0.65,
                                cursor: canUpdate ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <BadgeCheck size={13} /> Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBookingStatusUpdate(booking._id, 'Cancelled')}
                              disabled={!canUpdate}
                              style={{
                                ...actionButtonStyle,
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: palette.rejected,
                                padding: '0.55rem 0.78rem',
                                opacity: canUpdate ? 1 : 0.65,
                                cursor: canUpdate ? 'pointer' : 'not-allowed',
                              }}
                            >
                              <Trash2 size={13} /> Cancel
                            </button>
                          </>
                        )}

                        {(normalizedStatus === 'completed' || normalizedStatus === 'cancelled') && (
                          <span style={{ color: palette.textSecondary, fontSize: '0.85rem', fontWeight: 600 }}>
                            No further actions available.
                          </span>
                        )}

                        {updatingBookingId === booking._id && (
                          <span style={{ color: palette.textSecondary, fontSize: '0.85rem', fontWeight: 600 }}>
                            Updating booking...
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;
