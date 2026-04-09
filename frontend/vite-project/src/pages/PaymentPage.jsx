import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import { getStoredServiceAccessAllowed, getStoredVerificationStatus, setSessionAuth, getSessionToken } from '../utils/sessionAuth';

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
    const location = useLocation();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageMessage, setPageMessage] = useState('');
    const [verificationStatus, setVerificationStatus] = useState(getStoredVerificationStatus());
    const [serviceAccessAllowed, setServiceAccessAllowed] = useState(getStoredServiceAccessAllowed());
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const hasHandledExpiryRef = useRef(false);
    const hasHandledKhaltiReturnRef = useRef(false);

    const normalizeVerificationStatus = (status) => {
        if (status === 'UnderReview') return 'Under Review';
        if (status === 'NotSubmitted') return 'Not Submitted';
        return status || 'Not Submitted';
    };

    const fetchBooking = useCallback(async () => {
        try {
            setLoading(true);
            setPageMessage('');
            const response = await apiFetch(`/api/bookings/${bookingId}`, {
                method: 'GET',
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

    useEffect(() => {
        const fetchVerificationState = async () => {
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
                });
            } catch {
                // keep local fallback if verification fetch fails
            }
        };

        fetchVerificationState();
    }, []);

    const handleAutoCancel = useCallback(async () => {
        if (hasHandledExpiryRef.current) return;
        hasHandledExpiryRef.current = true;

        try {
            const response = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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
        if (!serviceAccessAllowed) {
            setPageMessage('Services are locked until your account is verified by admin.');
            return;
        }

        try {
            setPaymentLoading(true);
            setPageMessage('');

            const response = await apiFetch(`/api/bookings/${bookingId}/khalti/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to start Khalti payment.');
            }

            if (!data.paymentUrl) {
                throw new Error('Khalti did not return a payment link.');
            }

            window.location.assign(data.paymentUrl);
        } catch (error) {
            setPageMessage(error.message || 'Unable to complete payment.');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleKhaltiReturn = useCallback(async ({ pidx, status }) => {
        if (!pidx) return;

        try {
            setVerificationLoading(true);
            setPageMessage('Verifying Khalti payment...');

            const response = await apiFetch(`/api/bookings/${bookingId}/khalti/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pidx, status }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to verify Khalti payment.');
            }

            setBooking(data.booking);
            navigate(`/booking-confirmed/${bookingId}`);
        } catch (error) {
            setPageMessage(error.message || 'Unable to verify Khalti payment.');
        } finally {
            setVerificationLoading(false);
        }
    }, [bookingId, navigate]);

    useEffect(() => {
        if (!booking) return;

        const query = new URLSearchParams(location.search);
        const pidx = query.get('pidx');
        if (!pidx || hasHandledKhaltiReturnRef.current) {
            return;
        }

        const status = query.get('status') || '';
        hasHandledKhaltiReturnRef.current = true;

        if (status === 'User canceled') {
            setPageMessage('Payment was cancelled on Khalti. You can try again while the booking window is open.');
            return;
        }

        handleKhaltiReturn({ pidx, status });
    }, [booking, handleKhaltiReturn, location.search]);

    const handleManualCancel = async () => {
        if (!serviceAccessAllowed) {
            setPageMessage('Services are locked until your account is verified by admin.');
            return;
        }

        try {
            setPaymentLoading(true);
            const response = await apiFetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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

                {!serviceAccessAllowed && (
                    <div style={{ marginTop: '1rem', border: '1px solid #3a3524', backgroundColor: '#171717', borderRadius: '10px', padding: '0.9rem' }}>
                        <p style={{ margin: 0, color: '#DBB33B', fontWeight: 700 }}>Services are locked until your account is verified by admin.</p>
                        <p style={{ margin: '0.35rem 0 0', color: '#bdbdbd' }}>
                            Current status: {normalizeVerificationStatus(verificationStatus)}
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
                        disabled={paymentLoading || verificationLoading || cancelled || booking?.status !== 'pending_payment' || !serviceAccessAllowed}
                        style={{
                            flex: 1,
                            minWidth: '180px',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            backgroundColor: paymentLoading || verificationLoading || cancelled || booking?.status !== 'pending_payment' || !serviceAccessAllowed ? '#655c42' : '#DBB33B',
                            color: '#111',
                            cursor: paymentLoading || verificationLoading || cancelled || booking?.status !== 'pending_payment' || !serviceAccessAllowed ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {verificationLoading ? 'Verifying...' : paymentLoading ? 'Redirecting...' : 'Pay with Khalti'}
                    </button>

                    <button
                        type="button"
                        onClick={handleManualCancel}
                        disabled={paymentLoading || verificationLoading || cancelled || booking?.status !== 'pending_payment' || !serviceAccessAllowed}
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
                            cursor: paymentLoading || verificationLoading || cancelled || booking?.status !== 'pending_payment' || !serviceAccessAllowed ? 'not-allowed' : 'pointer',
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
