import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

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

const formatTimer = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const normalizeUiErrorMessage = (message) => {
    const text = String(message || '').trim().toLowerCase();
    if (!text) return 'Unable to load booking details.';
    if (text.includes('not authorized to view this booking')) {
        return 'Unable to load booking details.';
    }
    return message;
};

const PaymentPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageMessage, setPageMessage] = useState('');
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const hasHandledExpiryRef = useRef(false);

    const fetchBooking = useCallback(async () => {
        try {
            setLoading(true);
            setPageMessage('');
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to fetch booking details.');
            }
            setBooking(data.booking);
        } catch (error) {
            setPageMessage(normalizeUiErrorMessage(error.message || 'Failed to load booking details.'));
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        fetchBooking();
    }, [fetchBooking]);

    const handleAutoCancel = useCallback(async () => {
        if (hasHandledExpiryRef.current) return;
        hasHandledExpiryRef.current = true;

        try {
            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: 'Payment timeout - auto cancelled' }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Booking expired.');
            }
            setCancelled(true);
            setBooking(data.booking);
            setPageMessage('Booking Cancelled: payment was not completed within 10 minutes. Redirecting...');
        } catch (error) {
            setPageMessage(error.message || 'Booking payment window expired. Redirecting...');
        } finally {
            setTimeout(() => navigate('/customer-dashboard'), 2500);
        }
    }, [bookingId, navigate]);

    useEffect(() => {
        if (!booking) return;

        if (booking?.status === 'cancelled') {
            setCancelled(true);
            setPageMessage('Booking Cancelled. Redirecting to dashboard...');
            setTimeout(() => navigate('/customer-dashboard'), 2500);
            return;
        }

        if (booking.status !== 'pending_payment') {
            setRemainingSeconds(0);
            return;
        }

        const expiresAtMs = booking.expiresAt ? new Date(booking.expiresAt).getTime() : NaN;
        const createdAtMs = booking.createdAt ? new Date(booking.createdAt).getTime() : NaN;
        const fallbackExpiryMs = Number.isNaN(createdAtMs) ? NaN : createdAtMs + PAYMENT_WINDOW_MS;
        const effectiveExpiryMs = Number.isNaN(expiresAtMs) ? fallbackExpiryMs : expiresAtMs;

        if (Number.isNaN(effectiveExpiryMs)) {
            setRemainingSeconds(0);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const remaining = Math.floor((effectiveExpiryMs - now) / 1000);

            if (remaining <= 0) {
                setRemainingSeconds(0);
                handleAutoCancel();
                return;
            }

            setRemainingSeconds(remaining);
        };

        tick();
        const timerId = setInterval(tick, 1000);

        return () => clearInterval(timerId);
    }, [booking, handleAutoCancel, navigate]);

    const durationLabel = useMemo(() => {
        if (!booking?.startDate || !booking?.endDate) return '--';
        const start = new Date(booking.startDate).getTime();
        const end = new Date(booking.endDate).getTime();
        const diff = end - start;
        if (diff <= 0) return '--';

        const minutes = Math.floor(diff / (1000 * 60));
        const days = Math.floor(minutes / (60 * 24));
        const hours = Math.floor((minutes % (60 * 24)) / 60);
        const mins = minutes % 60;

        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (mins) parts.push(`${mins}m`);

        return parts.length ? parts.join(' ') : '0m';
    }, [booking]);

    const handlePayNow = async () => {
        try {
            setPaymentLoading(true);
            setPageMessage('');

            const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ paymentMethod: 'Online' }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Payment confirmation failed.');
            }

            navigate(`/booking-confirmed/${bookingId}`);
        } catch (error) {
            setPageMessage(error.message || 'Unable to complete payment.');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleManualCancel = async () => {
        try {
            setPaymentLoading(true);
            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: 'Cancelled from payment page' }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to cancel booking.');
            }

            setCancelled(true);
            setBooking(data.booking);
            setPageMessage('Booking Cancelled. Redirecting to dashboard...');
            setTimeout(() => navigate('/customer-dashboard'), 2500);
        } catch (error) {
            setPageMessage(error.message || 'Unable to cancel booking right now.');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading payment details...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', border: '1px solid #333', borderRadius: '14px', background: '#151515', padding: '1.5rem' }}>
                <h1 style={{ margin: 0, color: '#DBB33B' }}>Payment Page</h1>
                <p style={{ color: '#a0a0a0', marginTop: '0.55rem' }}>Complete payment within 10 minutes to confirm your booking.</p>

                {booking && (
                    <div style={{ border: '1px solid #2f2f2f', borderRadius: '12px', padding: '1rem', backgroundColor: '#101010' }}>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>
                            Price: Rs. {Number(booking.vehicle?.pricePerDay || 0).toLocaleString()} / day
                        </p>
                        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1.1rem' }}>
                            {booking.vehicle?.title || booking.vehicle?.name || 'Vehicle'}
                        </p>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>Status: {booking.status}</p>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>From: {formatDateTime(booking.startDate)}</p>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>To: {formatDateTime(booking.endDate)}</p>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>Duration: {durationLabel}</p>
                        <p style={{ margin: '0.25rem 0', color: '#c9c9c9' }}>Days: {Number(booking.totalDays || 0) || '--'}</p>
                        <p style={{ margin: '0.25rem 0', color: '#DBB33B', fontWeight: 700, fontSize: '1.15rem' }}>
                            Pending Payment: Rs. {Number(booking.totalPrice || 0).toLocaleString()}
                        </p>
                    </div>
                )}

                <div style={{ marginTop: '1.25rem', border: '1px solid rgba(219,179,59,0.4)', background: 'rgba(219,179,59,0.1)', borderRadius: '10px', padding: '0.9rem' }}>
                    <p style={{ margin: 0, color: '#DBB33B', fontWeight: 700, fontSize: '1.2rem' }}>
                        Time Left: {formatTimer(remainingSeconds)}
                    </p>
                </div>

                {pageMessage && (
                    <p style={{ marginTop: '1rem', color: cancelled ? '#f87171' : '#fbbf24' }}>
                        {pageMessage}
                    </p>
                )}

                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={paymentLoading || cancelled || booking?.status !== 'pending_payment'}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            backgroundColor: paymentLoading || cancelled || booking?.status !== 'pending_payment' ? '#655c42' : '#DBB33B',
                            color: '#111',
                            cursor: paymentLoading || cancelled || booking?.status !== 'pending_payment' ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {paymentLoading ? 'Processing...' : 'Pay Now'}
                    </button>

                    <button
                        type="button"
                        onClick={handleManualCancel}
                        disabled={paymentLoading || cancelled || booking?.status !== 'pending_payment'}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            border: '1px solid #f87171',
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            backgroundColor: 'transparent',
                            color: '#f87171',
                            cursor: paymentLoading || cancelled || booking?.status !== 'pending_payment' ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
