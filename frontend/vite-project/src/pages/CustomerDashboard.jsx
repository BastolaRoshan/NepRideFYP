import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Clock, Users, Gauge, Fuel, ArrowRight, X, RefreshCcw } from 'lucide-react';
import '../styles/Home.css';

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
    const [bookingDates, setBookingDates] = useState({ startDate: '', endDate: '' });
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingMessage, setBookingMessage] = useState(null);

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
        setBookingDates({ startDate: '', endDate: '' });
        setBookingMessage(null);
    };

    const handleConfirmBooking = async () => {
        const { startDate, endDate } = bookingDates;
        if (!startDate || !endDate) {
            setBookingMessage({ type: 'error', text: 'Please select both start and end dates.' });
            return;
        }
        if (new Date(endDate) <= new Date(startDate)) {
            setBookingMessage({ type: 'error', text: 'End date must be after start date.' });
            return;
        }
        try {
            setBookingLoading(true);
            const response = await fetch('/api/bookings/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ vehicleId: bookingModal._id, startDate, endDate }),
            });
            const data = await response.json();
            if (data.success) {
                setBookingMessage({ type: 'success', text: 'Booking confirmed! You will be contacted shortly.' });
                fetchCustomerBookings();
                setTimeout(() => setBookingModal(null), 2000);
            } else {
                setBookingMessage({ type: 'error', text: data.message || 'Booking failed. Please try again.' });
            }
        } catch {
            setBookingMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setBookingLoading(false);
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
                                placeholder="Search vehicles e.g. SUV, Bike..."
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
                                const status = booking.status || 'Pending';
                                const badgeBackground = status === 'Confirmed'
                                    ? '#16a34a33'
                                    : status === 'Cancelled'
                                        ? '#dc262633'
                                        : status === 'Completed'
                                            ? '#2563eb33'
                                            : '#d4af3733';
                                const badgeColor = status === 'Confirmed'
                                    ? '#4ade80'
                                    : status === 'Cancelled'
                                        ? '#f87171'
                                        : status === 'Completed'
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
                                            From: {new Date(booking.startDate).toLocaleDateString()} — To: {new Date(booking.endDate).toLocaleDateString()}
                                        </p>
                                        <p style={{ color: '#d4af37', fontWeight: '600', margin: '0.4rem 0 0' }}>
                                            Total: Rs. {booking.totalPrice}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Booking Modal */}
            {bookingModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
                        padding: '2rem', width: '100%', maxWidth: '460px', position: 'relative'
                    }}>
                        <button onClick={() => setBookingModal(null)} style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer'
                        }}><X size={20} /></button>
                        <h2 style={{ color: '#fff', marginBottom: '0.25rem' }}>Book Vehicle</h2>
                        <p style={{ color: '#a0a0a0', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {bookingModal.title || bookingModal.name} — Rs. {bookingModal.pricePerDay}/day
                        </p>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Start Date</label>
                            <input type="date" value={bookingDates.startDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setBookingDates(d => ({ ...d, startDate: e.target.value }))}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '6px',
                                    border: '1px solid #444', backgroundColor: '#0f0f0f',
                                    color: '#fff', fontSize: '1rem', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.4rem', fontSize: '0.9rem' }}>End Date</label>
                            <input type="date" value={bookingDates.endDate}
                                min={bookingDates.startDate || new Date().toISOString().split('T')[0]}
                                onChange={e => setBookingDates(d => ({ ...d, endDate: e.target.value }))}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '6px',
                                    border: '1px solid #444', backgroundColor: '#0f0f0f',
                                    color: '#fff', fontSize: '1rem', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        {bookingMessage && (
                            <p style={{ color: bookingMessage.type === 'success' ? '#4ade80' : '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                {bookingMessage.text}
                            </p>
                        )}
                        <button onClick={handleConfirmBooking} disabled={bookingLoading}
                            className="btn-primary-accent"
                            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
                        >
                            {bookingLoading ? 'Confirming...' : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
