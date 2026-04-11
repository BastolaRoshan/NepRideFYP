import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Search, Clock, Clock3, Users, Gauge, Fuel, Wallet, ArrowRight, RefreshCcw, ShieldCheck, BadgeCheck, Send, Mail, Phone } from 'lucide-react';
import '../styles/Home.css';
import BookingModal from '../components/BookingModal';
import CustomerPortalHeader from '../components/CustomerPortalHeader';
import { apiFetch } from '../utils/apiFetch';
import { clearSessionAuth, getSessionToken, getStoredServiceAccessAllowed, getStoredUserName, getStoredVerificationStatus, setSessionAuth } from '../utils/sessionAuth';

const formatCountdown = (remainingSeconds) => {
    const safeSeconds = Math.max(0, remainingSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const resolveActiveView = (pathname, stateView) => {
        const allowed = ['dashboard', 'vehicles', 'bookings', 'about', 'contact', 'profile'];
        if (allowed.includes(stateView)) return stateView;
        if (String(pathname || '').endsWith('/about')) return 'about';
        if (String(pathname || '').endsWith('/contact')) return 'contact';
        if (String(pathname || '').endsWith('/profile')) return 'profile';
        return 'dashboard';
    };

    const [vehicles, setVehicles] = useState([]);
    const [activeView, setActiveView] = useState(resolveActiveView(location.pathname, location.state?.activeView));
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [vehicleError, setVehicleError] = useState('');
    const [customerBookings, setCustomerBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [bookingsError, setBookingsError] = useState('');
    const [bookingModal, setBookingModal] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [bookingActionLoadingId, setBookingActionLoadingId] = useState('');
    const [ratingDrafts, setRatingDrafts] = useState({});
    const [ratingSubmittingId, setRatingSubmittingId] = useState('');
    const [ratingErrors, setRatingErrors] = useState({});
    const [verificationStatus, setVerificationStatus] = useState(getStoredVerificationStatus());
    const [serviceAccessAllowed, setServiceAccessAllowed] = useState(getStoredServiceAccessAllowed());
    const [serviceNotice, setServiceNotice] = useState('');
    const [userName] = useState(getStoredUserName() || 'Customer');
    const [contactForm, setContactForm] = useState({ fullName: '', email: '', phone: '', subject: '', message: '' });
    const [contactErrors, setContactErrors] = useState({});
    const [contactStatus, setContactStatus] = useState({ type: '', message: '' });
    const [submittingContact, setSubmittingContact] = useState(false);

    const normalizeVerificationStatus = (status) => {
        if (status === 'UnderReview') return 'Under Review';
        if (status === 'NotSubmitted') return 'Not Submitted';
        return status || 'Not Submitted';
    };

    const fetchVerificationStatus = useCallback(async () => {
        try {
            const response = await apiFetch('/api/user/verification-status', {
                method: 'GET',
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                return;
            }

            const nextStatus = data?.verification?.verificationStatus || 'NotSubmitted';
            const nextAccessAllowed = Boolean(data?.verification?.isServiceAccessAllowed);
            setVerificationStatus(nextStatus);
            setServiceAccessAllowed(nextAccessAllowed);
            setSessionAuth({
                token: getSessionToken(),
                verificationStatus: nextStatus,
                isServiceAccessAllowed: nextAccessAllowed,
                userName,
            });

            if (!nextAccessAllowed) {
                setServiceNotice('Services are locked until your account is verified by admin.');
            } else {
                setServiceNotice('');
            }
        } catch {
            // keep fallback local state if API request fails
        }
    }, [userName]);

    useEffect(() => {
        fetchVehicles();
        fetchCustomerBookings();
        fetchVerificationStatus();
    }, [fetchVerificationStatus]);

    const filteredVehicles = useMemo(() => {
        if (!searchQuery.trim()) {
            return vehicles;
        }

        const normalizedQuery = searchQuery.toLowerCase();
        return vehicles.filter((vehicle) =>
            (vehicle.title || vehicle.name || '').toLowerCase().includes(normalizedQuery) ||
            (vehicle.vehicleType || vehicle.type || '').toLowerCase().includes(normalizedQuery) ||
            (vehicle.fuelType || vehicle.fuel || '').toLowerCase().includes(normalizedQuery)
        );
    }, [searchQuery, vehicles]);

    const fetchVehicles = async () => {
        try {
            setLoadingVehicles(true);
            setVehicleError('');

            const response = await apiFetch('/api/vehicles/', {
                method: 'GET',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch vehicles');
            }

            const vehicleList = Array.isArray(data.vehicles) ? data.vehicles : [];
            setVehicles(vehicleList);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
            setVehicleError(err.message || 'Unable to load vehicles. Please try again later.');
        } finally {
            setLoadingVehicles(false);
        }
    };

    const fetchCustomerBookings = async () => {
        try {
            setLoadingBookings(true);
            setBookingsError('');

            const response = await apiFetch('/api/bookings/my-bookings', {
                method: 'GET',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch your bookings');
            }

            setCustomerBookings(Array.isArray(data.bookings) ? data.bookings : []);
        } catch (error) {
            setBookingsError(error.message || 'Unable to load your bookings right now.');
        } finally {
            setLoadingBookings(false);
        }
    };

    useEffect(() => {
        setActiveView(resolveActiveView(location.pathname, location.state?.activeView));
    }, [location.pathname, location.state]);

    const calculateBookingStats = () => {
        const stats = {
            total: customerBookings.length,
            active: 0,
            completed: 0,
            pending: 0,
        };

        customerBookings.forEach((booking) => {
            const normalizedStatus = String(booking.status || '').toLowerCase();
            if (normalizedStatus === 'completed') {
                stats.completed += 1;
            } else if (normalizedStatus === 'cancelled') {
                // Don't count cancelled bookings in any category
            } else if (normalizedStatus === 'confirmed') {
                stats.active += 1;
            } else if (normalizedStatus === 'pending_payment') {
                stats.pending += 1;
            }
        });

        return stats;
    };

    const serviceLockMessage = 'Services are locked until your account is verified by admin.';

    const verificationLabel = normalizeVerificationStatus(verificationStatus);
    const isServiceLocked = !serviceAccessAllowed;

    const handleGoToVerification = () => {
        setActiveView('profile');
        navigate('/customer-dashboard/profile', { state: { activeView: 'profile' } });
    };

    const handleLockedAction = () => {
        setServiceNotice(serviceLockMessage);
    };

    const handleContactChange = (event) => {
        const { name, value } = event.target;
        setContactForm((prev) => ({ ...prev, [name]: value }));
        setContactErrors((prev) => ({ ...prev, [name]: '' }));
        setContactStatus({ type: '', message: '' });
    };

    const validateContactForm = (values) => {
        const nextErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;

        if (!values.fullName.trim()) nextErrors.fullName = 'Full name is required.';
        if (!values.email.trim()) nextErrors.email = 'Email is required.';
        else if (!emailRegex.test(values.email.trim())) nextErrors.email = 'Enter a valid email address.';

        const phoneValue = values.phone.replace(/\D/g, '');
        if (!phoneValue) nextErrors.phone = 'Phone number is required.';
        else if (!phoneRegex.test(phoneValue)) nextErrors.phone = 'Phone number must be 10 digits.';

        if (!values.subject.trim()) nextErrors.subject = 'Subject is required.';
        if (!values.message.trim()) nextErrors.message = 'Message is required.';
        else if (values.message.trim().length < 15) nextErrors.message = 'Message should be at least 15 characters.';

        return nextErrors;
    };

    const handleContactSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = validateContactForm(contactForm);

        if (Object.keys(validationErrors).length > 0) {
            setContactErrors(validationErrors);
            setContactStatus({ type: 'error', message: 'Please fix the highlighted fields and try again.' });
            return;
        }

        try {
            setSubmittingContact(true);
            const payload = {
                fullName: contactForm.fullName.trim(),
                email: contactForm.email.trim(),
                phone: contactForm.phone.replace(/\D/g, ''),
                subject: contactForm.subject.trim(),
                message: contactForm.message.trim(),
            };

            const response = await apiFetch('/api/user/contact-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to send your message. Please try again.');
            }

            setContactStatus({ type: 'success', message: 'Message sent successfully.' });
            setContactForm({ fullName: '', email: '', phone: '', subject: '', message: '' });
            setContactErrors({});
        } catch (error) {
            setContactStatus({ type: 'error', message: error.message || 'Failed to send your message. Please try again.' });
        } finally {
            setSubmittingContact(false);
        }
    };

    useEffect(() => {
        if (activeView !== 'bookings') return undefined;

        const timerId = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timerId);
    }, [activeView]);

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
        } catch (err) {
            console.error('Logout Error:', err);
        }
    };

    const handleBookNow = (vehicle) => {
        if (isServiceLocked) {
            handleLockedAction();
            return;
        }

        setBookingModal(vehicle);
    };

    const handleBookingCreated = () => {
        setBookingModal(null);
        setActiveView('bookings');
        fetchCustomerBookings();
    };

    const handleProceedToPayment = (bookingId) => {
        if (isServiceLocked) {
            handleLockedAction();
            return;
        }

        navigate(`/payment/${bookingId}`);
    };

    const handleCancelBooking = async (bookingId) => {
        if (isServiceLocked) {
            handleLockedAction();
            return;
        }

        try {
            setBookingActionLoadingId(bookingId);

            const response = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Cancelled from my bookings page' }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to cancel booking.');
            }

            fetchCustomerBookings();
        } catch (error) {
            setBookingsError(error.message || 'Unable to cancel booking right now.');
        } finally {
            setBookingActionLoadingId('');
        }
    };

    const handleRatingDraftChange = (bookingId, value) => {
        setRatingDrafts((prev) => ({
            ...prev,
            [bookingId]: value,
        }));

        setRatingErrors((prev) => {
            const next = { ...prev };
            delete next[bookingId];
            return next;
        });
    };

    const handleSubmitRating = async (bookingId) => {
        const score = Number(ratingDrafts[bookingId]);

        if (!Number.isFinite(score) || score < 1 || score > 5) {
            setRatingErrors((prev) => ({
                ...prev,
                [bookingId]: 'Please select a rating between 1 and 5.',
            }));
            return;
        }

        try {
            setRatingSubmittingId(bookingId);
            setRatingErrors((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });

            const response = await apiFetch(`/api/bookings/${bookingId}/rating`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to submit rating right now.');
            }

            setRatingDrafts((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });

            setRatingErrors((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });

            fetchCustomerBookings();
            fetchVehicles();
        } catch (error) {
            setRatingErrors((prev) => ({
                ...prev,
                [bookingId]: error.message || 'Unable to submit rating right now.',
            }));
        } finally {
            setRatingSubmittingId('');
        }
    };

    const customerActiveTab = activeView === 'dashboard' || activeView === 'vehicles' || activeView === 'bookings' || activeView === 'about' || activeView === 'contact' ? activeView : '';

    return (
        <div className="home-container" style={{ minHeight: '100vh', backgroundColor: '#111111', color: '#ffffff', display: 'block' }}>
            <CustomerPortalHeader
                activeTab={customerActiveTab}
                activeProfile={activeView === 'profile'}
                onTabChange={setActiveView}
                onProfile={handleGoToVerification}
                onLogout={handleLogout}
            />

            {isServiceLocked && (
                <section style={{ margin: '1rem 1.5rem 0', border: '1px solid #3a3524', backgroundColor: '#171717', color: '#e5e5e5', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                    <strong style={{ color: '#D4AF37' }}>Service Access Locked.</strong>
                    <span style={{ marginLeft: '0.5rem' }}>{serviceNotice || serviceLockMessage}</span>
                    <span style={{ marginLeft: '0.65rem', color: '#9a9a9a' }}>Current status: {verificationLabel}.</span>
                </section>
            )}

            {activeView === 'dashboard' ? (
                <>
                    <section className="hero-section" style={{ padding: '4rem 2rem 2rem' }}>
                        <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                            Welcome back, <span className="text-accent">{userName}</span>!
                        </h1>
                        <p style={{ fontSize: '1rem', color: '#a0a0a0', marginBottom: '2rem' }}>
                            Here's your rental activity summary
                        </p>
                    </section>

                    <section className="fleet-section">
                        <div className="fleet-header">
                            <div className="fleet-title-container">
                                <h2 className="fleet-title">
                                    Dashboard <span className="text-accent">Overview</span>
                                </h2>
                            </div>
                        </div>

                        {loadingBookings ? (
                            <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#a0a0a0' }}>
                                <p>Loading your dashboard...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                {(() => {
                                    const stats = calculateBookingStats();
                                    return [
                                        { label: 'Total Bookings', value: stats.total, color: '#DBB33B', icon: Clock },
                                        { label: 'Active Bookings', value: stats.active, color: '#4ade80', icon: Gauge },
                                        { label: 'Pending Payment', value: stats.pending, color: '#f97316', icon: Users },
                                        { label: 'Completed', value: stats.completed, color: '#60a5fa', icon: Users },
                                    ].map((stat, index) => {
                                        const IconComponent = stat.icon;
                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    backgroundColor: '#000',
                                                    border: '1px solid #333',
                                                    borderRadius: '12px',
                                                    padding: '1.5rem',
                                                    textAlign: 'center',
                                                    transition: 'all 0.3s ease',
                                                    cursor: 'pointer',
                                                    ':hover': {
                                                        borderColor: stat.color,
                                                        transform: 'translateY(-4px)',
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = stat.color;
                                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                                    e.currentTarget.style.boxShadow = `0 0 20px ${stat.color}33`;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = '#333';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <IconComponent size={28} style={{ color: stat.color, marginBottom: '0.75rem' }} />
                                                <p style={{ fontSize: '0.85rem', color: '#a0a0a0', margin: '0.5rem 0 0.75rem 0' }}>
                                                    {stat.label}
                                                </p>
                                                <p style={{ fontSize: '2.5rem', fontWeight: '700', color: stat.color, margin: '0' }}>
                                                    {stat.value}
                                                </p>
                                            </div>
                                        );
                                    });
                                    })()}
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn-primary-accent"
                                onClick={() => setActiveView('vehicles')}
                                style={{ padding: '0.75rem 1.5rem' }}
                            >
                                <Search size={16} /> Browse Vehicles
                            </button>
                            <button
                                className="btn-secondary-accent"
                                onClick={() => setActiveView('bookings')}
                                style={{ padding: '0.75rem 1.5rem' }}
                            >
                                <Clock size={16} /> View My Bookings
                            </button>
                        </div>
                    </section>
                </>
            ) : activeView === 'vehicles' ? (
                <>
                    <section className="hero-section" style={{ padding: '4rem 2rem 2rem' }}>
                        <h1 className="hero-title" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
                            Find Your <span className="text-accent">Perfect Ride</span>
                        </h1>
                        <div style={{ display: 'flex', gap: '1rem', maxWidth: '600px' }}>
                            <input
                                type="text"
                                placeholder="Search vehicles e.g. Car, Bike..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '1rem', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#fff' }}
                            />
                            <button className="btn-primary-accent" style={{ padding: '1rem' }} onClick={fetchVehicles}>
                                <RefreshCcw size={20} /> Refresh
                            </button>
                        </div>
                    </section>

                    <section className="fleet-section">
                        <div className="fleet-header">
                            <div className="fleet-title-container">
                                <h2 className="fleet-title">
                                    Available <span className="text-accent">Vehicles</span>
                                </h2>
                                <p className="fleet-subtitle">
                                    {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} available for booking
                                </p>
                            </div>
                        </div>

                        {loadingVehicles ? (
                            <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#a0a0a0' }}>
                                <p>Loading available vehicles...</p>
                            </div>
                        ) : vehicleError ? (
                            <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#ff6b6b' }}>
                                <p>{vehicleError}</p>
                                <button className="btn-primary-accent" onClick={fetchVehicles} style={{ marginTop: '1rem' }}>
                                    Try Again
                                </button>
                            </div>
                        ) : filteredVehicles.length === 0 ? (
                            <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#a0a0a0' }}>
                                <p>{searchQuery ? 'No vehicles found matching your search.' : 'No vehicles available at the moment.'}</p>
                            </div>
                        ) : (
                            <div className="fleet-grid">
                                {filteredVehicles.map((vehicle, index) => {
                                    const title = vehicle.title || vehicle.name;
                                    const type = vehicle.vehicleType || vehicle.type;
                                    const seats = vehicle.seatCapacity ?? vehicle.seats;
                                    const fuel = vehicle.fuelType || vehicle.fuel;
                                    const speedOrModel = vehicle.speed ? `${vehicle.speed} kmph` : vehicle.model || 'N/A';

                                    return (
                                        <div key={vehicle._id || `${title}-${index}`} className="vehicle-card">
                                            <div className="vehicle-image-container">
                                                <img src={vehicle.image} alt={title} />
                                            </div>

                                            <div className="vehicle-info">
                                                <h3 className="vehicle-name">{title}</h3>
                                                <p style={{ fontSize: '0.9rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>
                                                    {type}
                                                </p>

                                                <div className="vehicle-specs">
                                                    <div className="spec-item">
                                                        <Users />
                                                        <span>{seats} Seats</span>
                                                    </div>
                                                    <div className="spec-divider"></div>
                                                    <div className="spec-item">
                                                        <Gauge />
                                                        <span>{speedOrModel}</span>
                                                    </div>
                                                    <div className="spec-divider"></div>
                                                    <div className="spec-item">
                                                        <Fuel />
                                                        <span>{fuel}</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                    <div>
                                                        <p style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>Price per day</p>
                                                        <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff' }}>
                                                            Rs. {Number(vehicle.pricePerDay || 0).toLocaleString()} / day
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: '#DBB33B', marginTop: '0.3rem' }}>
                                                            Listed by {vehicle.vendor?.name || vehicle.vendorName || 'NepRide Vendor'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn-reserve"
                                                    onClick={() => handleBookNow(vehicle)}
                                                    disabled={isServiceLocked}
                                                    style={{
                                                        marginTop: '1rem',
                                                        width: '100%',
                                                        backgroundColor: isServiceLocked ? '#554616' : undefined,
                                                        cursor: isServiceLocked ? 'not-allowed' : 'pointer',
                                                        opacity: isServiceLocked ? 0.75 : 1,
                                                    }}
                                                >
                                                    Reserve Now <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            ) : activeView === 'bookings' ? (
                <section className="fleet-section" style={{ paddingTop: '2.5rem' }}>
                    <div className="fleet-header">
                        <div className="fleet-title-container">
                            <h2 className="fleet-title">
                                My <span className="text-accent">Bookings</span>
                            </h2>
                            <p className="fleet-subtitle">
                                Track your booking status and rental dates here.
                            </p>
                        </div>
                        <button className="btn-secondary-accent" onClick={fetchCustomerBookings} style={{ padding: '0.6rem 1rem' }}>
                            <RefreshCcw size={16} /> Refresh
                        </button>
                    </div>

                    {loadingBookings ? (
                        <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#a0a0a0' }}>
                            Loading your bookings...
                        </div>
                    ) : bookingsError ? (
                        <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#ff6b6b' }}>
                            <p>{bookingsError}</p>
                            <button className="btn-primary-accent" onClick={fetchCustomerBookings} style={{ marginTop: '1rem' }}>
                                Try Again
                            </button>
                        </div>
                    ) : customerBookings.length === 0 ? (
                        <div style={{ padding: '3rem', border: '1px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#a0a0a0' }}>
                            You have not made any bookings yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {customerBookings.map((booking) => {
                                const normalizedStatus = String(booking.status || '').toLowerCase();
                                const isPendingPayment = normalizedStatus === 'pending_payment';
                                const canCancelBooking = normalizedStatus !== 'cancelled' && normalizedStatus !== 'completed' && !isPendingPayment;
                                const expiresAtMs = booking.expiresAt ? new Date(booking.expiresAt).getTime() : 0;
                                const createdAtMs = booking.createdAt ? new Date(booking.createdAt).getTime() : 0;
                                const fallbackExpiryMs = createdAtMs ? createdAtMs + (10 * 60 * 1000) : 0;
                                const effectiveExpiryMs = expiresAtMs || fallbackExpiryMs;
                                const remainingSeconds = effectiveExpiryMs ? Math.floor((effectiveExpiryMs - currentTime) / 1000) : 0;
                                const isExpired = isPendingPayment && Boolean(effectiveExpiryMs) && remainingSeconds <= 0;
                                const status = normalizedStatus === 'pending_payment'
                                    ? 'Pending Payment'
                                    : normalizedStatus === 'confirmed'
                                        ? 'Confirmed'
                                        : normalizedStatus === 'cancelled'
                                            ? 'Cancelled'
                                            : normalizedStatus === 'completed'
                                                ? 'Completed'
                                                : booking.status || 'Pending';
                                const totalDays = Number(booking.totalDays || 0);

                                const badgeBackground = normalizedStatus === 'confirmed'
                                    ? '#16a34a33'
                                    : normalizedStatus === 'cancelled'
                                        ? '#dc262633'
                                        : normalizedStatus === 'completed'
                                            ? '#2563eb33'
                                            : '#d4af3733';
                                const badgeColor = normalizedStatus === 'confirmed'
                                    ? '#4ade80'
                                    : normalizedStatus === 'cancelled'
                                        ? '#f87171'
                                        : normalizedStatus === 'completed'
                                            ? '#60a5fa'
                                            : '#d4af37';

                                return (
                                    <div
                                        key={booking._id}
                                        style={{
                                            backgroundColor: '#000',
                                            border: '1px solid #333',
                                            borderRadius: '12px',
                                            padding: '1.25rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 style={{ color: '#fff', fontWeight: '600', margin: 0 }}>
                                                {booking.vehicle?.title || booking.vehicle?.name || 'Vehicle'}
                                            </h3>
                                            <span
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    backgroundColor: badgeBackground,
                                                    color: badgeColor,
                                                }}
                                            >
                                                {status}
                                            </span>
                                        </div>

                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            From: {new Date(booking.startDate).toLocaleString([], { hour12: false })} — To: {new Date(booking.endDate).toLocaleString([], { hour12: false })}
                                        </p>
                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            Days: {totalDays || '--'}
                                        </p>
                                        <p style={{ color: '#d4af37', fontWeight: '600', margin: '0.4rem 0 0' }}>
                                            Total: Rs. {Number(booking.totalPrice || 0).toLocaleString()}
                                        </p>

                                        {isPendingPayment && (
                                            <div style={{ marginTop: '0.85rem' }}>
                                                <p style={{ margin: '0 0 0.7rem', color: isExpired ? '#f87171' : '#d4af37', fontWeight: '600' }}>
                                                    {isExpired
                                                        ? 'Payment window expired'
                                                        : `Time left: ${formatCountdown(remainingSeconds)}`}
                                                </p>

                                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleProceedToPayment(booking._id)}
                                                        disabled={isExpired || bookingActionLoadingId === booking._id || isServiceLocked}
                                                        style={{
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            padding: '0.55rem 0.85rem',
                                                            fontWeight: 700,
                                                            backgroundColor: isExpired || bookingActionLoadingId === booking._id || isServiceLocked ? '#655c42' : '#DBB33B',
                                                            color: '#111',
                                                            cursor: isExpired || bookingActionLoadingId === booking._id || isServiceLocked ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        Pay Now
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelBooking(booking._id)}
                                                        disabled={bookingActionLoadingId === booking._id || isServiceLocked}
                                                        style={{
                                                            border: '1px solid #f87171',
                                                            borderRadius: '8px',
                                                            padding: '0.55rem 0.85rem',
                                                            fontWeight: 600,
                                                            backgroundColor: 'transparent',
                                                            color: '#f87171',
                                                            cursor: bookingActionLoadingId === booking._id || isServiceLocked ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {bookingActionLoadingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {canCancelBooking && (
                                            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelBooking(booking._id)}
                                                    disabled={bookingActionLoadingId === booking._id || isServiceLocked}
                                                    style={{
                                                        border: '1px solid #f87171',
                                                        borderRadius: '8px',
                                                        padding: '0.55rem 0.85rem',
                                                        fontWeight: 600,
                                                        backgroundColor: 'transparent',
                                                        color: '#f87171',
                                                        cursor: bookingActionLoadingId === booking._id || isServiceLocked ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {bookingActionLoadingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                                </button>
                                            </div>
                                        )}

                                        {normalizedStatus === 'completed' && (
                                            <div style={{ marginTop: '0.9rem', padding: '0.8rem', borderRadius: '10px', border: '1px solid #2f2f2f', backgroundColor: '#111111' }}>
                                                {Number(booking?.customerRating?.score || 0) > 0 ? (
                                                    <p style={{ margin: 0, color: '#DBB33B', fontWeight: 700 }}>
                                                        Your rating: {booking.customerRating.score}/5
                                                    </p>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                        <label htmlFor={`rating-${booking._id}`} style={{ color: '#d2d2d2', fontSize: '0.88rem' }}>
                                                            Rate this vehicle
                                                        </label>
                                                        <select
                                                            id={`rating-${booking._id}`}
                                                            value={ratingDrafts[booking._id] || ''}
                                                            onChange={(event) => handleRatingDraftChange(booking._id, event.target.value)}
                                                            style={{
                                                                border: '1px solid #3a3a3a',
                                                                borderRadius: '8px',
                                                                backgroundColor: '#0f0f0f',
                                                                color: '#ffffff',
                                                                padding: '0.45rem 0.55rem',
                                                                minWidth: '95px',
                                                            }}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                            <option value="4">4</option>
                                                            <option value="5">5</option>
                                                        </select>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubmitRating(booking._id)}
                                                            disabled={ratingSubmittingId === booking._id || isServiceLocked}
                                                            style={{
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '0.5rem 0.8rem',
                                                                backgroundColor: ratingSubmittingId === booking._id || isServiceLocked ? '#655c42' : '#DBB33B',
                                                                color: '#111111',
                                                                fontWeight: 700,
                                                                cursor: ratingSubmittingId === booking._id || isServiceLocked ? 'not-allowed' : 'pointer',
                                                            }}
                                                        >
                                                            {ratingSubmittingId === booking._id ? 'Submitting...' : 'Submit Rating'}
                                                        </button>

                                                        {ratingErrors[booking._id] && (
                                                            <p style={{ margin: 0, color: '#f87171', fontSize: '0.85rem', width: '100%' }}>
                                                                {ratingErrors[booking._id]}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isServiceLocked && (
                                            <p style={{ marginTop: '0.75rem', color: '#fbbf24', fontSize: '0.88rem' }}>
                                                {serviceLockMessage}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            ) : activeView === 'about' ? (
                <section className="fleet-section" style={{ paddingTop: '2.5rem' }}>
                    <div
                        style={{
                            border: '1px solid #2f2f2f',
                            borderRadius: '18px',
                            background: 'linear-gradient(180deg, #0d0f14 0%, #0a0b0e 100%)',
                            boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '1rem',
                                padding: '1.35rem',
                                alignItems: 'stretch',
                            }}
                        >
                            <div>
                                <h2 style={{ margin: 0, color: '#f6f6f6', fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}>
                                    Smart, simple, and trusted <span style={{ color: '#DBB33B' }}>vehicle booking</span>
                                </h2>

                                <p style={{ margin: '0.85rem 0 0', color: '#c7c7c7', lineHeight: 1.7, maxWidth: '44rem' }}>
                                    NepRide helps customers find and book verified vehicles across Nepal. Our platform is built to make booking simple, secure, and fast.
                                </p>

                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveView('vehicles')}
                                        style={{
                                            border: '1px solid #D4AF37',
                                            borderRadius: '10px',
                                            backgroundColor: '#DBB33B',
                                            color: '#111111',
                                            fontWeight: 800,
                                            padding: '0.72rem 1.05rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Explore Vehicles <ArrowRight size={15} />
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div style={{ padding: '0 1.35rem 1.35rem' }}>
                            <h3 style={{ margin: '0.25rem 0 0.75rem', color: '#f4f4f4', textAlign: 'center', fontSize: '1.55rem', letterSpacing: '-0.02em' }}>
                                Why Choose <span style={{ color: '#DBB33B' }}>NepRide</span>
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                {[
                                    { icon: ShieldCheck, title: 'Verified Vendors', copy: 'All vendors are verified to ensure safety and trust.' },
                                    { icon: BadgeCheck, title: 'Easy Booking', copy: 'Book your vehicle in just a few simple steps.' },
                                    { icon: Wallet, title: 'Secure Payment', copy: 'Safe and reliable payments with full protection.' },
                                    { icon: Clock3, title: 'Real-time Availability', copy: 'Check vehicle availability instantly.' },
                                    { icon: Gauge, title: 'Transparent Pricing', copy: 'No hidden charges. What you see is what you pay.' },
                                    { icon: Users, title: 'Customer Support', copy: 'Our support team is here to help you 24/7.' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <article key={item.title} style={{ border: '1px solid #2f2f2f', borderRadius: '14px', backgroundColor: '#111214', padding: '0.9rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '999px', backgroundColor: 'rgba(219,179,59,0.12)', color: '#DBB33B', display: 'grid', placeItems: 'center' }}>
                                                    <Icon size={14} />
                                                </div>
                                                <h4 style={{ margin: 0, color: '#f2f2f2', fontSize: '0.98rem' }}>{item.title}</h4>
                                            </div>
                                            <p style={{ margin: 0, color: '#b9b9b9', lineHeight: 1.55, fontSize: '0.86rem' }}>{item.copy}</p>
                                        </article>
                                    );
                                })}
                            </div>

                            <section
                                style={{
                                    marginTop: '1rem',
                                    border: '1px solid #2f2f2f',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #141518 0%, #111214 70%)',
                                    padding: '1rem',
                                    display: 'block',
                                }}
                            >
                                <div>
                                    <p style={{ margin: 0, color: '#DBB33B', fontSize: '0.72rem', fontWeight: 800 }}>OUR MISSION</p>
                                    <p style={{ margin: '0.45rem 0 0', color: '#e1e1e1', lineHeight: 1.7 }}>
                                        To provide a trusted and easy vehicle rental platform where customers can book with confidence and vendors can manage services easily.
                                    </p>
                                </div>
                            </section>

                            <section
                                style={{
                                    marginTop: '1rem',
                                    border: '1px solid rgba(219,179,59,0.45)',
                                    borderRadius: '14px',
                                    backgroundColor: '#131416',
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, color: '#f6f6f6', fontSize: '1.45rem' }}>Ready to start your journey with NepRide?</h4>
                                    <p style={{ margin: '0.4rem 0 0', color: '#bdbdbd' }}>Book your next ride and experience the difference.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveView('vehicles')}
                                        style={{
                                            border: '1px solid #D4AF37',
                                            borderRadius: '10px',
                                            backgroundColor: '#DBB33B',
                                            color: '#111111',
                                            fontWeight: 800,
                                            padding: '0.7rem 1.1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Book Now <ArrowRight size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveView('dashboard')}
                                        style={{
                                            border: '1px solid #343434',
                                            borderRadius: '10px',
                                            backgroundColor: '#111111',
                                            color: '#e9e9e9',
                                            fontWeight: 700,
                                            padding: '0.7rem 1.1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Back to Dashboard <RefreshCcw size={14} />
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </section>
            ) : activeView === 'profile' ? (
                <section className="fleet-section" style={{ paddingTop: '2.5rem' }}>
                    <div className="fleet-header">
                        <div className="fleet-title-container">
                            <h2 className="fleet-title">My <span className="text-accent">Profile</span></h2>
                            <p className="fleet-subtitle">View your account and verification status in one place.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>
                        <article style={{ backgroundColor: '#0f0f0f', border: '1px solid #2f2f2f', borderRadius: '14px', padding: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#DBB33B' }}>Account</h3>
                            <p style={{ margin: '0.65rem 0 0', color: '#d7d7d7' }}>
                                Name: <strong>{userName}</strong>
                            </p>
                            <p style={{ margin: '0.35rem 0 0', color: '#d7d7d7' }}>
                                Role: <strong>Customer</strong>
                            </p>
                        </article>

                        <article style={{ backgroundColor: '#0f0f0f', border: '1px solid #2f2f2f', borderRadius: '14px', padding: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#DBB33B' }}>Verification</h3>
                            <p style={{ margin: '0.65rem 0 0', color: '#d7d7d7' }}>
                                Current status: <strong>{verificationLabel}</strong>
                            </p>
                            {!serviceAccessAllowed && (
                                <p style={{ margin: '0.45rem 0 0', color: '#fbbf24' }}>
                                    Services are locked until your account is verified by admin.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => navigate('/verification')}
                                style={{
                                    marginTop: '0.85rem',
                                    border: '1px solid #3a3524',
                                    backgroundColor: '#171717',
                                    color: '#DBB33B',
                                    borderRadius: '8px',
                                    padding: '0.55rem 0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Open Full Verification Form
                            </button>
                        </article>
                    </div>
                </section>
            ) : (
                <section className="fleet-section" style={{ paddingTop: '2.5rem' }}>
                    <div className="fleet-header">
                        <div className="fleet-title-container">
                            <h2 className="fleet-title">Contact <span className="text-accent">Us</span></h2>
                            <p className="fleet-subtitle">Get help quickly with your booking or account.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1rem' }}>
                        <section style={{ backgroundColor: '#0f0f0f', border: '1px solid #2f2f2f', borderRadius: '14px', padding: '1rem' }}>
                            <h3 style={{ margin: '0 0 1rem', color: '#DBB33B' }}>Send a Message</h3>

                            {contactStatus.message && (
                                <div style={{ marginBottom: '0.9rem', borderRadius: '10px', padding: '0.75rem 0.85rem', border: contactStatus.type === 'success' ? '1px solid #166534' : '1px solid #7f1d1d', backgroundColor: contactStatus.type === 'success' ? '#052e16' : '#3f1010', color: contactStatus.type === 'success' ? '#bbf7d0' : '#fecaca' }}>
                                    {contactStatus.message}
                                </div>
                            )}

                            <form onSubmit={handleContactSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
                                <div>
                                    <label htmlFor="fullName" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Full Name</label>
                                    <input id="fullName" name="fullName" value={contactForm.fullName} onChange={handleContactChange} style={{ width: '100%', borderRadius: '10px', border: '1px solid #353535', backgroundColor: '#141414', color: '#f4f4f4', padding: '0.78rem 0.85rem', fontSize: '0.95rem', outline: 'none' }} />
                                    {contactErrors.fullName && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{contactErrors.fullName}</p>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Email</label>
                                        <input id="email" name="email" type="email" value={contactForm.email} onChange={handleContactChange} style={{ width: '100%', borderRadius: '10px', border: '1px solid #353535', backgroundColor: '#141414', color: '#f4f4f4', padding: '0.78rem 0.85rem', fontSize: '0.95rem', outline: 'none' }} />
                                        {contactErrors.email && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{contactErrors.email}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Phone Number</label>
                                        <input id="phone" name="phone" value={contactForm.phone} onChange={handleContactChange} style={{ width: '100%', borderRadius: '10px', border: '1px solid #353535', backgroundColor: '#141414', color: '#f4f4f4', padding: '0.78rem 0.85rem', fontSize: '0.95rem', outline: 'none' }} />
                                        {contactErrors.phone && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{contactErrors.phone}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Subject</label>
                                    <input id="subject" name="subject" value={contactForm.subject} onChange={handleContactChange} style={{ width: '100%', borderRadius: '10px', border: '1px solid #353535', backgroundColor: '#141414', color: '#f4f4f4', padding: '0.78rem 0.85rem', fontSize: '0.95rem', outline: 'none' }} />
                                    {contactErrors.subject && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{contactErrors.subject}</p>}
                                </div>

                                <div>
                                    <label htmlFor="message" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Message</label>
                                    <textarea id="message" name="message" rows={6} value={contactForm.message} onChange={handleContactChange} style={{ width: '100%', borderRadius: '10px', border: '1px solid #353535', backgroundColor: '#141414', color: '#f4f4f4', padding: '0.78rem 0.85rem', fontSize: '0.95rem', outline: 'none', resize: 'vertical', minHeight: '140px' }} />
                                    {contactErrors.message && <p style={{ color: '#fca5a5', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>{contactErrors.message}</p>}
                                </div>

                                <button type="submit" disabled={submittingContact} style={{ border: 'none', borderRadius: '10px', backgroundColor: submittingContact ? '#6b5c2b' : '#DBB33B', color: '#111111', fontWeight: 800, padding: '0.8rem 1rem', cursor: submittingContact ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Send size={16} /> {submittingContact ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        </section>

                        <aside style={{ backgroundColor: '#0f0f0f', border: '1px solid #2f2f2f', borderRadius: '14px', padding: '1rem', height: 'fit-content' }}>
                            <h3 style={{ margin: '0 0 1rem', color: '#DBB33B' }}>Contact Information</h3>
                            <p style={{ margin: '0 0 1rem', color: '#b2b2b2' }}>Our support team will respond as soon as possible.</p>

                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div style={{ border: '1px solid #2f2a1f', backgroundColor: '#17140d', borderRadius: '10px', padding: '0.8rem' }}>
                                    <p style={{ margin: '0 0 0.35rem', color: '#d6d6d6', fontWeight: 700 }}>Support Email</p>
                                    <a href="mailto:roshanbastola02@gmail.com" style={{ color: '#DBB33B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <Mail size={15} /> roshanbastola02@gmail.com
                                    </a>
                                </div>

                                <div style={{ border: '1px solid #2f2a1f', backgroundColor: '#17140d', borderRadius: '10px', padding: '0.8rem' }}>
                                    <p style={{ margin: '0 0 0.35rem', color: '#d6d6d6', fontWeight: 700 }}>Support Phone</p>
                                    <a href="tel:9816622940" style={{ color: '#DBB33B', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <Phone size={15} /> 9816622940
                                    </a>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>
            )}

            {/* Booking Modal */}
            {bookingModal && (
                <BookingModal
                    vehicle={bookingModal}
                    isServiceAccessAllowed={serviceAccessAllowed}
                    onClose={() => setBookingModal(null)}
                    onBookingCreated={handleBookingCreated}
                />
            )}
        </div>
    );
};

export default CustomerDashboard;
