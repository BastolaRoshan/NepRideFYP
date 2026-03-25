import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const formatDateTime = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const BookingConfirmed = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/bookings/${bookingId}`, {
                    method: 'GET',
                    credentials: 'include',
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Unable to fetch confirmed booking details.');
                }

                setBooking(data.booking);
            } catch (err) {
                setError(err.message || 'Failed to load booking summary.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    const durationLabel = useMemo(() => {
        if (!booking?.startDate || !booking?.endDate) return '--';
        const start = new Date(booking.startDate).getTime();
        const end = new Date(booking.endDate).getTime();
        const diff = end - start;

        if (diff <= 0) return '--';

        const totalMinutes = Math.floor(diff / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const mins = totalMinutes % 60;

        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (mins) parts.push(`${mins}m`);

        return parts.length ? parts.join(' ') : '0m';
    }, [booking]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading booking confirmation...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', border: '1px solid #333', borderRadius: '14px', background: '#151515', padding: '1.5rem' }}>
                <h1 style={{ margin: 0, color: '#22c55e' }}>Booking Confirmed</h1>
                <p style={{ marginTop: '0.5rem', color: '#a0a0a0' }}>
                    Your vehicle booking is successfully confirmed.
                </p>

                {error && <p style={{ color: '#f87171' }}>{error}</p>}

                {booking && (
                    <div style={{ marginTop: '1rem', border: '1px solid #2f2f2f', borderRadius: '12px', padding: '1rem', backgroundColor: '#101010' }}>
                        <p style={{ margin: '0 0 0.65rem', color: '#DBB33B', fontWeight: 700, fontSize: '1.1rem' }}>
                            Booking ID: {booking._id}
                        </p>
                        <p style={{ margin: '0.3rem 0' }}>Vehicle: {booking.vehicle?.title || booking.vehicle?.name || 'Vehicle'}</p>
                        <p style={{ margin: '0.3rem 0' }}>Customer: {booking.customer?.name || 'Customer'}</p>
                        <p style={{ margin: '0.3rem 0' }}>Status: {booking.status}</p>
                        <p style={{ margin: '0.3rem 0' }}>Payment: {booking.paymentStatus}</p>
                        <p style={{ margin: '0.3rem 0' }}>Start: {formatDateTime(booking.startDate)}</p>
                        <p style={{ margin: '0.3rem 0' }}>End: {formatDateTime(booking.endDate)}</p>
                        <p style={{ margin: '0.3rem 0' }}>Duration: {durationLabel}</p>
                        <p style={{ margin: '0.3rem 0', color: '#DBB33B', fontWeight: 700, fontSize: '1.12rem' }}>
                            Total Paid: Rs. {Number(booking.totalPrice || 0).toLocaleString()}
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => navigate('/customer-dashboard')}
                    style={{
                        marginTop: '1.2rem',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        width: '100%',
                        backgroundColor: '#DBB33B',
                        color: '#111',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
};

export default BookingConfirmed;
