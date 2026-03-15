import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Trash2, Package } from 'lucide-react';

const VendorDashboard = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(false);
    const [actionState, setActionState] = useState({ message: '', isError: false });
    const [deletingVehicleId, setDeletingVehicleId] = useState('');

    useEffect(() => {
        if (activeTab === 'vehicles') {
            fetchVehicles();
        } else {
            fetchBookings();
        }
    }, [activeTab]);

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
        navigate('/vendor-dashboard/add-vehicle');
    };

    const handleEditVehicle = (vehicle) => {
        navigate('/vendor-dashboard/add-vehicle', {
            state: {
                mode: 'edit',
                vehicle,
            },
        });
    };

    const handleDeleteVehicle = async (vehicleId) => {
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
        backgroundColor: '#000',
        borderBottom: '1px solid #333',
        padding: '1rem 1.5rem',
    };

    const navInnerStyle = {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    const tabActiveStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontWeight: '600',
        backgroundColor: '#d4af37',
        color: '#000',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s',
    };

    const tabInactiveStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontWeight: '500',
        backgroundColor: 'transparent',
        color: '#d4af37',
        border: '1px solid #d4af37',
        cursor: 'pointer',
        transition: 'all 0.3s',
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff' }}>
            {/* Top Navbar */}
            <nav style={navStyle}>
                <div style={navInnerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d4af37', margin: 0 }}>NepRide</h1>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 'normal' }}>Vendor Dashboard</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', border: '1px solid #d4af37',
                            color: '#d4af37', borderRadius: '8px', backgroundColor: 'transparent',
                            cursor: 'pointer', fontWeight: '500', transition: 'all 0.3s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#d4af37'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d4af37'; }}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                {/* Toggle Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        style={activeTab === 'vehicles' ? tabActiveStyle : tabInactiveStyle}
                    >
                        My Vehicles
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        style={activeTab === 'bookings' ? tabActiveStyle : tabInactiveStyle}
                    >
                        Booking Requests
                    </button>
                </div>

                {/* Main Section */}
                {activeTab === 'vehicles' ? (
                    <div>
                        {/* Header with Title and Add Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', margin: 0 }}>Manage Vehicles</h2>
                            <button
                                onClick={handleAddVehicle}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.75rem 1.5rem', backgroundColor: '#d4af37',
                                    color: '#000', borderRadius: '8px', border: 'none',
                                    fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s',
                                }}
                            >
                                <Plus size={20} /> Add New Vehicle
                            </button>
                        </div>

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
                                                            Rs. {vehicle.pricePerDay}
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
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #d4af37',
                                                            color: '#d4af37', borderRadius: '8px', backgroundColor: 'transparent',
                                                            cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.3s',
                                                        }}
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVehicle(vehicle._id)}
                                                        disabled={deletingVehicleId === vehicle._id}
                                                        style={{
                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #ef4444',
                                                            color: '#ef4444', borderRadius: '8px', backgroundColor: 'transparent',
                                                            cursor: deletingVehicleId === vehicle._id ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.875rem', transition: 'all 0.3s',
                                                            opacity: deletingVehicleId === vehicle._id ? 0.7 : 1,
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
                                        <p style={{ color: '#d4af37', fontWeight: '600', margin: '0.5rem 0 0' }}>
                                            Total: Rs. {booking.totalPrice}
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
