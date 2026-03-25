import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Clock, Users, Gauge, Fuel, ArrowRight, RefreshCcw } from 'lucide-react';
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
    const [activeView, setActiveView] = useState('vehicles');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [vehicleError, setVehicleError] = useState('');
    const [customerBookings, setCustomerBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [bookingsError, setBookingsError] = useState('');
    const [bookingModal, setBookingModal] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [bookingActionLoadingId, setBookingActionLoadingId] = useState('');

    useEffect(() => {
        fetchVehicles();
    }, []);

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
        setBookingModal(vehicle);
    };

    const handleBookingCreated = () => {
        setBookingModal(null);
        setActiveView('bookings');
        fetchCustomerBookings();
    };

    const handleProceedToPayment = (bookingId) => {
        navigate(`/payment/${bookingId}`);
    };

    const handleCancelBooking = async (bookingId) => {
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
        <div className="home-container" style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#ffffff', display: 'block' }}>
            <header className="home-header" style={{ borderBottom: '1px solid #333' }}>
                <div className="logo-placeholder">NepRide <span style={{ fontSize: '0.9rem', color: '#fff', marginLeft: '8px', fontWeight: 'normal' }}>Customer Dashboard</span></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className={activeView === 'vehicles' ? 'btn-primary-accent' : 'btn-secondary-accent'}
                        onClick={handleSwitchToVehicles}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        <Search size={18} /> Listings
                    </button>
                    <button
                        className={activeView === 'bookings' ? 'btn-primary-accent' : 'btn-secondary-accent'}
                        onClick={handleSwitchToBookings}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        <Clock size={18} /> My Bookings
                    </button>
                    <button className="btn-logout" onClick={handleLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            {activeView === 'vehicles' ? (
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
                                                            Rs. {vehicle.pricePerDay}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: '#DBB33B', marginTop: '0.3rem' }}>
                                                            Listed by {vehicle.vendor?.name || vehicle.vendorName || 'NepRide Vendor'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn-reserve"
                                                    onClick={() => handleBookNow(vehicle)}
                                                    style={{ marginTop: '1rem', width: '100%' }}
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
                                        <p style={{ color: '#d4af37', fontWeight: '600', margin: '0.4rem 0 0' }}>
                                            Total: Rs. {booking.totalPrice}
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
                                                        disabled={isExpired || bookingActionLoadingId === booking._id}
                                                        style={{
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            padding: '0.55rem 0.85rem',
                                                            fontWeight: 700,
                                                            backgroundColor: isExpired || bookingActionLoadingId === booking._id ? '#655c42' : '#DBB33B',
                                                            color: '#111',
                                                            cursor: isExpired || bookingActionLoadingId === booking._id ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        Pay Now
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelBooking(booking._id)}
                                                        disabled={bookingActionLoadingId === booking._id}
                                                        style={{
                                                            border: '1px solid #f87171',
                                                            borderRadius: '8px',
                                                            padding: '0.55rem 0.85rem',
                                                            fontWeight: 600,
                                                            backgroundColor: 'transparent',
                                                            color: '#f87171',
                                                            cursor: bookingActionLoadingId === booking._id ? 'not-allowed' : 'pointer',
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
                                                    disabled={bookingActionLoadingId === booking._id}
                                                    style={{
                                                        border: '1px solid #f87171',
                                                        borderRadius: '8px',
                                                        padding: '0.55rem 0.85rem',
                                                        fontWeight: 600,
                                                        backgroundColor: 'transparent',
                                                        color: '#f87171',
                                                        cursor: bookingActionLoadingId === booking._id ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {bookingActionLoadingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                                                </button>
                                            </div>
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
