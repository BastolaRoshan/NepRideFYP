import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Trash2, Package, BadgeCheck, Car } from 'lucide-react';

const palette = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E5E7EB',
    accent: '#D4AF37',
    text: '#111827',
    textSecondary: '#6B7280',
    approved: '#22C55E',
    underReview: '#F59E0B',
    rejected: '#EF4444',
    notSubmitted: '#9CA3AF',
};

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
        backgroundColor: palette.card,
        borderBottom: `1px solid ${palette.border}`,
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
        <div style={{ minHeight: '100vh', backgroundColor: palette.bg, color: palette.text }}>
            {/* Top Navbar */}
            <nav style={navStyle}>
                <div style={navInnerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <Car size={20} color={palette.accent} />
                        <span style={{ color: palette.accent, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.02em' }}>NepRide</span>
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
                                borderRadius: '999px',
                                padding: '0.72rem 1.05rem',
                                backgroundColor: activeTab === tab ? palette.accent : palette.card,
                                color: palette.text,
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                letterSpacing: '0.01em',
                                cursor: 'pointer',
                                border: `1px solid ${activeTab === tab ? palette.accent : palette.border}`,
                                boxShadow: 'none',
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
                                backgroundColor: serviceAccessAllowed ? palette.accent : '#E5D2A0',
                                color: palette.text,
                                borderRadius: '8px',
                                border: `1px solid ${palette.accent}`,
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
                            border: `1px solid ${palette.border}`,
                            backgroundColor: palette.card,
                            color: palette.text,
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
                            <span style={{ color: palette.textSecondary, fontWeight: 600 }}>
                                {verificationLabel === 'Not Submitted' ? 'Verify' : verificationLabel}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                            border: `1px solid ${palette.rejected}`,
                            backgroundColor: '#FEF2F2',
                            color: palette.rejected,
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
                    <section style={{ margin: '0 0 1rem 0', border: `1px solid ${palette.border}`, backgroundColor: palette.card, color: palette.text, borderRadius: '12px', padding: '0.9rem 1rem' }}>
                        <strong style={{ color: palette.accent }}>Service Access Locked.</strong>
                        <span style={{ marginLeft: '0.5rem' }}>{serviceLockMessage}</span>
                        <span style={{ marginLeft: '0.65rem', color: palette.textSecondary }}>Current status: {verificationLabel}.</span>
                    </section>
                )}

                {/* Main Section */}
                {activeTab === 'vehicles' ? (
                    <div>
                        {/* Header with Title */}
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: palette.text, margin: '0 0 1.5rem 0' }}>Manage Vehicles</h2>

                        {actionState.message && (
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    border: actionState.isError ? `1px solid ${palette.rejected}60` : `1px solid ${palette.approved}60`,
                                    backgroundColor: actionState.isError ? '#ef444415' : '#16a34a15',
                                    color: actionState.isError ? palette.rejected : palette.approved,
                                }}
                            >
                                {actionState.message}
                            </div>
                        )}

                        {/* Empty State or Vehicle List */}
                        {loading ? (
                            <div style={{ border: `2px dashed ${palette.border}`, backgroundColor: palette.card, borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <p style={{ color: palette.textSecondary, fontSize: '1.1rem' }}>Loading vehicles...</p>
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div style={{ border: `2px dashed ${palette.border}`, backgroundColor: palette.card, borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <Package size={48} style={{ margin: '0 auto 1rem', color: palette.notSubmitted, display: 'block' }} />
                                <p style={{ color: palette.textSecondary, fontSize: '1.1rem' }}>You haven't added any vehicles yet.</p>
                                <p style={{ color: palette.textSecondary, fontSize: '0.9rem', marginTop: '0.5rem' }}>Click "Add New Vehicle" to get started</p>
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
                                                backgroundColor: palette.card, border: `1px solid ${palette.border}`,
                                                borderRadius: '12px', overflow: 'hidden',
                                                transition: 'border-color 0.3s',
                                            }}
                                        >
                                            <div style={{ aspectRatio: '16/9', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                                                <img
                                                    src={vehicle.image}
                                                    alt={title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div style={{ padding: '1rem' }}>
                                                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: palette.text, marginBottom: '0.25rem' }}>
                                                    {title}
                                                </h3>
                                                <p style={{ color: palette.textSecondary, fontSize: '0.875rem', marginBottom: '0.75rem' }}>{type}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <p style={{ color: palette.textSecondary, fontSize: '0.75rem' }}>Price per day</p>
                                                        <p style={{ color: palette.accent, fontSize: '1.25rem', fontWeight: '700' }}>
                                                            Rs. {Number(vehicle.pricePerDay || 0).toLocaleString()} / day
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ color: palette.textSecondary, fontSize: '0.875rem' }}>
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
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: `1px solid ${palette.accent}`,
                                                            color: '#A16207', borderRadius: '8px', backgroundColor: '#FFF8E1',
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
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: `1px solid ${palette.rejected}`,
                                                            color: palette.rejected, borderRadius: '8px', backgroundColor: '#FEF2F2',
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
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: palette.text, margin: 0 }}>Customer Bookings</h2>
                        </div>

                        {/* Empty State or Booking List */}
                        {loading ? (
                            <div style={{ border: `2px dashed ${palette.border}`, backgroundColor: palette.card, borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <p style={{ color: palette.textSecondary, fontSize: '1.1rem' }}>Loading bookings...</p>
                            </div>
                        ) : bookings.length === 0 ? (
                            <div style={{ border: `2px dashed ${palette.border}`, backgroundColor: palette.card, borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
                                <Package size={48} style={{ margin: '0 auto 1rem', color: palette.notSubmitted, display: 'block' }} />
                                <p style={{ color: palette.textSecondary, fontSize: '1.1rem' }}>No booking requests yet.</p>
                                <p style={{ color: palette.textSecondary, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Customers will see your vehicles and can request bookings
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {bookings.map((booking) => (
                                    <div
                                        key={booking._id}
                                        style={{
                                            backgroundColor: palette.card, border: `1px solid ${palette.border}`,
                                            borderRadius: '12px', padding: '1.5rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 style={{ color: palette.text, fontWeight: '600', margin: 0 }}>
                                                {booking.vehicle?.title || booking.vehicle?.name}
                                            </h3>
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600',
                                                backgroundColor: booking.status === 'Confirmed' ? '#22C55E1A' : booking.status === 'Cancelled' ? '#EF44441A' : '#F59E0B1A',
                                                color: booking.status === 'Confirmed' ? palette.approved : booking.status === 'Cancelled' ? palette.rejected : palette.underReview,
                                            }}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <p style={{ color: palette.textSecondary, fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            Customer: {booking.customer?.name} ({booking.customer?.email})
                                        </p>
                                        <p style={{ color: palette.textSecondary, fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            From: {new Date(booking.startDate).toLocaleDateString()} —
                                            To: {new Date(booking.endDate).toLocaleDateString()}
                                        </p>
                                        <p style={{ color: palette.textSecondary, fontSize: '0.875rem', margin: '0.25rem 0' }}>
                                            Days: {Number(booking.totalDays || 0) || '--'}
                                        </p>
                                        <p style={{ color: palette.accent, fontWeight: '600', margin: '0.5rem 0 0' }}>
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
