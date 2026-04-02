import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Clock, Users, Gauge, Fuel, ArrowRight, RefreshCcw, BadgeCheck, Car } from 'lucide-react';
import '../styles/Home.css';
import BookingModal from '../components/BookingModal';

const formatCountdown = (remainingSeconds) => {
    const safeSeconds = Math.max(0, remainingSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [activeView, setActiveView] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [vehicleError, setVehicleError] = useState('');
    const [customerBookings, setCustomerBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [bookingsError, setBookingsError] = useState('');
    const [bookingModal, setBookingModal] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [bookingActionLoadingId, setBookingActionLoadingId] = useState('');
    const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('verificationStatus') || 'NotSubmitted');
    const [serviceAccessAllowed, setServiceAccessAllowed] = useState(localStorage.getItem('isServiceAccessAllowed') === 'true');
    const [serviceNotice, setServiceNotice] = useState('');
    const [userName] = useState(localStorage.getItem('userName') || 'Customer');

    useEffect(() => {
        fetchVehicles();
        fetchCustomerBookings();
        fetchVerificationStatus();
    }, []);

    const normalizeVerificationStatus = (status) => {
        if (status === 'UnderReview') return 'Under Review';
        if (status === 'NotSubmitted') return 'Not Submitted';
        return status || 'Not Submitted';
    };

    const fetchVerificationStatus = async () => {
        try {
            const response = await fetch('/api/user/verification-status', {
                method: 'GET',
                credentials: 'include',
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                return;
            }

            const nextStatus = data?.verification?.verificationStatus || 'NotSubmitted';
            const nextAccessAllowed = Boolean(data?.verification?.isServiceAccessAllowed);
            setVerificationStatus(nextStatus);
            setServiceAccessAllowed(nextAccessAllowed);
            localStorage.setItem('verificationStatus', nextStatus);
            localStorage.setItem('isServiceAccessAllowed', nextAccessAllowed ? 'true' : 'false');

            if (!nextAccessAllowed) {
                setServiceNotice('Services are locked until your account is verified by admin.');
            } else {
                setServiceNotice('');
            }
        } catch {
            // keep fallback local state if API request fails
        }
    };

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

            const response = await fetch('/api/vehicles/', {
                method: 'GET',
                credentials: 'include'
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

            const response = await fetch('/api/bookings/my-bookings', {
                method: 'GET',
                credentials: 'include',
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

    const handleSwitchToVehicles = () => {
        setActiveView('vehicles');
    };

    const handleSwitchToBookings = () => {
        setActiveView('bookings');
        fetchCustomerBookings();
    };

    const handleSwitchToDashboard = () => {
        setActiveView('dashboard');
        fetchCustomerBookings();
    };

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

    const navTabs = [
        { label: 'Dashboard', view: 'dashboard' },
        { label: 'Vehicle', view: 'vehicles' },
        { label: 'My Bookings', view: 'bookings' },
    ];

    const isVerified = ['verified', 'approved'].includes(String(verificationStatus).toLowerCase());
    const verificationLabel = normalizeVerificationStatus(verificationStatus);
    const isServiceLocked = !serviceAccessAllowed;

    const handleGoToVerification = () => {
        navigate('/verification');
    };

    const handleLockedAction = () => {
        setServiceNotice(serviceLockMessage);
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
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('userRole');
                localStorage.removeItem('isAuthenticated');
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

            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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

    return (
        <div className="home-container" style={{ minHeight: '100vh', backgroundColor: '#111111', color: '#ffffff', display: 'block' }}>
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
                    {navTabs.map((tab) => {
                        const isActive = activeView === tab.view;
                        return (
                            <button
                                key={tab.view}
                                type="button"
                                onClick={
                                    tab.view === 'dashboard'
                                        ? handleSwitchToDashboard
                                        : tab.view === 'vehicles'
                                            ? handleSwitchToVehicles
                                            : handleSwitchToBookings
                                }
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
                        onClick={handleGoToVerification}
                        style={{
                            border: '1px solid #3a3524',
                            backgroundColor: '#171717',
                            color: '#e5e5e5',
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1rem' }} aria-hidden="true">
                            {isVerified ? '✔️' : ''}
                        </span>
                        <span>Profile</span>
                        {!isVerified && (
                            <span style={{ color: '#8f8f8f', fontWeight: 600 }}>
                                {verificationLabel === 'Not Submitted' ? 'Verify' : verificationLabel}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
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
                            gap: '0.42rem',
                            cursor: 'pointer',
                        }}
                    >
                        <LogOut size={15} />
                        Logout
                    </button>
                </div>
            </header>

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
            ) : (
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
            )}

            {/* Booking Modal */}
            {bookingModal && (
                <BookingModal
                    vehicle={bookingModal}
                    onClose={() => setBookingModal(null)}
                    onBookingCreated={handleBookingCreated}
                />
            )}
        </div>
    );
};

export default CustomerDashboard;
