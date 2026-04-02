import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Trash2, Package, BadgeCheck, Car } from 'lucide-react';

const VendorDashboard = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(false);
    const [actionState, setActionState] = useState({ message: '', isError: false });
    const [deletingVehicleId, setDeletingVehicleId] = useState('');
    const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('verificationStatus') || 'NotSubmitted');
    const [serviceAccessAllowed, setServiceAccessAllowed] = useState(localStorage.getItem('isServiceAccessAllowed') === 'true');

    const serviceLockMessage = 'Services are locked until admin approval.';

    const normalizeVerificationStatus = (status) => {
        if (status === 'UnderReview') return 'Under Review';
        if (status === 'NotSubmitted') return 'Not Submitted';
        return status || 'Not Submitted';
    };

    const isVerified = ['verified', 'approved'].includes(String(verificationStatus).toLowerCase());
    const verificationLabel = normalizeVerificationStatus(verificationStatus);

    useEffect(() => {
        if (activeTab === 'vehicles') {
            fetchVehicles();
        } else {
            fetchBookings();
        }
    }, [activeTab]);

    useEffect(() => {
        fetchVerificationStatus();
    }, []);

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
        } catch {
            // keep fallback local state if API request fails
        }
    };

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/vehicles/vendor', {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setVehicles(data.vehicles);
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/bookings/vendor-bookings', {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
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

    const handleAddVehicle = () => {
        if (!serviceAccessAllowed) {
            setActionState({ message: serviceLockMessage, isError: true });
            return;
        }

        navigate('/vendor-dashboard/add-vehicle');
    };

    const handleGoToVerification = () => {
        navigate('/verification');
    };

    const handleEditVehicle = (vehicle) => {
        if (!serviceAccessAllowed) {
            setActionState({ message: serviceLockMessage, isError: true });
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
            setActionState({ message: serviceLockMessage, isError: true });
            return;
        }

        const shouldDelete = window.confirm('Are you sure you want to delete this vehicle listing?');
        if (!shouldDelete) {
            return;
        }

        try {
            setDeletingVehicleId(vehicleId);
            setActionState({ message: '', isError: false });

            const response = await fetch(`/api/vehicles/${vehicleId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete vehicle');
            }

            setVehicles((prevVehicles) => prevVehicles.filter((vehicle) => vehicle._id !== vehicleId));
            setActionState({ message: 'Vehicle deleted successfully.', isError: false });
        } catch (error) {
            setActionState({ message: error.message || 'Unable to delete vehicle.', isError: true });
        } finally {
            setDeletingVehicleId('');
        }
    };

    const navStyle = {
        backgroundColor: '#111111',
        borderBottom: '1px solid #D4AF37',
        padding: '1rem 1.5rem 0.9rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '1rem',
    };

    const navInnerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff' }}>
            {/* Top Navbar */}
            <nav style={navStyle}>
                <div style={navInnerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <Car size={20} color="#D4AF37" />
                        <span style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.02em' }}>NepRide</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'My Vehicles', tab: 'vehicles' },
                        { label: 'Booking Requests', tab: 'bookings' },
                    ].map(({ label, tab }) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            style={{
                                border: 'none',
                                borderRadius: '999px',
                                padding: '0.72rem 1.05rem',
                                backgroundColor: activeTab === tab ? '#D4AF37' : 'transparent',
                                color: activeTab === tab ? '#111111' : '#d9d9d9',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                letterSpacing: '0.01em',
                                cursor: 'pointer',
                                boxShadow: activeTab === tab ? 'inset 0 -2px 0 #b38b1d' : 'none',
                                transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', flexWrap: 'wrap' }}>
                    {activeTab === 'vehicles' && (
                        <button
                            onClick={handleAddVehicle}
                            disabled={!serviceAccessAllowed}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.56rem 1rem',
                                backgroundColor: serviceAccessAllowed ? '#D4AF37' : '#7f6a22',
                                color: '#111111',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                                opacity: serviceAccessAllowed ? 1 : 0.7,
                            }}
                        >
                            <Plus size={16} /> Add Vehicle
                        </button>
                    )}
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
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                {!serviceAccessAllowed && (
                    <section style={{ margin: '0 0 1rem 0', border: '1px solid #3a3524', backgroundColor: '#171717', color: '#e5e5e5', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                        <strong style={{ color: '#D4AF37' }}>Service Access Locked.</strong>
                        <span style={{ marginLeft: '0.5rem' }}>{serviceLockMessage}</span>
                        <span style={{ marginLeft: '0.65rem', color: '#9a9a9a' }}>Current status: {verificationLabel}.</span>
                    </section>
                )}

                {/* Main Section */}
                {activeTab === 'vehicles' ? (
                    <div>
                        {/* Header with Title */}
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: '0 0 1.5rem 0' }}>Manage Vehicles</h2>

                        {actionState.message && (
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    border: actionState.isError ? '1px solid #ef444460' : '1px solid #16a34a60',
                                    backgroundColor: actionState.isError ? '#ef444415' : '#16a34a15',
                                    color: actionState.isError ? '#f87171' : '#4ade80',
                                }}
                            >
                                {actionState.message}
                            </div>
                        )}

                        {/* Empty State or Vehicle List */}
                        {loading ? (
                            <div style={{ border: '2px dashed #444', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>Loading vehicles...</p>
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div style={{ border: '2px dashed #444', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <Package size={48} style={{ margin: '0 auto 1rem', color: '#555', display: 'block' }} />
                                <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>You haven't added any vehicles yet.</p>
                                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Click "Add New Vehicle" to get started</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {vehicles.map((vehicle) => {
                                    const title = vehicle.title || vehicle.name;
                                    const type = vehicle.vehicleType || vehicle.type;
                                    const seats = vehicle.seatCapacity ?? vehicle.seats;
                                    const fuel = vehicle.fuelType || vehicle.fuel;

                                    return (
                                        <div
                                            key={vehicle._id}
                                            style={{
                                                backgroundColor: '#000', border: '1px solid #333',
                                                borderRadius: '12px', overflow: 'hidden',
                                                transition: 'border-color 0.3s',
                                            }}
                                        >
                                            <div style={{ aspectRatio: '16/9', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
                                                <img
                                                    src={vehicle.image}
                                                    alt={title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div style={{ padding: '1rem' }}>
                                                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>
                                                    {title}
                                                </h3>
                                                <p style={{ color: '#a0a0a0', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{type}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <p style={{ color: '#888', fontSize: '0.75rem' }}>Price per day</p>
                                                        <p style={{ color: '#d4af37', fontSize: '1.25rem', fontWeight: '700' }}>
                                                            Rs. {Number(vehicle.pricePerDay || 0).toLocaleString()} / day
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
                                                            {seats} seats • {fuel}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleEditVehicle(vehicle)}
                                                        disabled={!serviceAccessAllowed}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #d4af37',
                                                            color: '#d4af37', borderRadius: '8px', backgroundColor: 'transparent',
                                                            cursor: serviceAccessAllowed ? 'pointer' : 'not-allowed', fontSize: '0.875rem', transition: 'all 0.3s',
                                                            opacity: serviceAccessAllowed ? 1 : 0.65,
                                                        }}
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVehicle(vehicle._id)}
                                                        disabled={deletingVehicleId === vehicle._id || !serviceAccessAllowed}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #ef4444',
                                                            color: '#ef4444', borderRadius: '8px', backgroundColor: 'transparent',
                                                            cursor: deletingVehicleId === vehicle._id || !serviceAccessAllowed ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.875rem', transition: 'all 0.3s',
                                                            opacity: deletingVehicleId === vehicle._id || !serviceAccessAllowed ? 0.7 : 1,
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> {deletingVehicleId === vehicle._id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* Bookings Header */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>Customer Bookings</h2>
                        </div>

                        {/* Empty State or Booking List */}
                        {loading ? (
                            <div style={{ border: '2px dashed #444', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>Loading bookings...</p>
                            </div>
                        ) : bookings.length === 0 ? (
                            <div style={{ border: '2px dashed #444', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <Package size={48} style={{ margin: '0 auto 1rem', color: '#555', display: 'block' }} />
                                <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>No booking requests yet.</p>
                                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Customers will see your vehicles and can request bookings
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {bookings.map((booking) => (
                                    <div
                                        key={booking._id}
                                        style={{
                                            backgroundColor: '#000', border: '1px solid #333',
                                            borderRadius: '12px', padding: '1.5rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 style={{ color: '#fff', fontWeight: '600', margin: 0 }}>
                                                {booking.vehicle?.title || booking.vehicle?.name}
                                            </h3>
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600',
                                                backgroundColor: booking.status === 'Confirmed' ? '#16a34a33' : booking.status === 'Cancelled' ? '#dc262633' : '#d4af3733',
                                                color: booking.status === 'Confirmed' ? '#4ade80' : booking.status === 'Cancelled' ? '#f87171' : '#d4af37',
                                            }}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            Customer: {booking.customer?.name} ({booking.customer?.email})
                                        </p>
                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            From: {new Date(booking.startDate).toLocaleDateString()} —
                                            To: {new Date(booking.endDate).toLocaleDateString()}
                                        </p>
                                        <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            Days: {Number(booking.totalDays || 0) || '--'}
                                        </p>
                                        <p style={{ color: '#d4af37', fontWeight: '600', margin: '0.5rem 0 0' }}>
                                            Total: Rs. {Number(booking.totalPrice || 0).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorDashboard;
