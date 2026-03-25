import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 15, 30, 45];

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const pad = (value) => String(value).padStart(2, '0');

const formatDateField = (date) => {
    if (!date) return 'dd/mm/yyyy';
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatTimeField = (time) => `${pad(time.hour)}:${pad(time.minute)}`;

const combineDateAndTime = (date, time) => {
    if (!date || !time) return null;
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Number(time.hour),
        Number(time.minute),
        0,
        0
    );
};

const BookingModal = ({ vehicle, onClose, onBookingCreated }) => {
    const today = useMemo(() => toStartOfDay(new Date()), []);
    const initialMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [startTime, setStartTime] = useState({ hour: 10, minute: 0 });
    const [endTime, setEndTime] = useState({ hour: 10, minute: 0 });
    const [calendarTarget, setCalendarTarget] = useState(null);
    const [timeTarget, setTimeTarget] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(initialMonth);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState('');

    const startDateTime = useMemo(() => combineDateAndTime(startDate, startTime), [startDate, startTime]);
    const endDateTime = useMemo(() => combineDateAndTime(endDate, endTime), [endDate, endTime]);

    const durationMs = useMemo(() => {
        if (!startDateTime || !endDateTime) return 0;
        return endDateTime - startDateTime;
    }, [startDateTime, endDateTime]);

    const validationError = useMemo(() => {
        if (!startDateTime || !endDateTime) return '';
        if (durationMs <= 0) return 'End date & time must be after start date & time.';
        return '';
    }, [startDateTime, endDateTime, durationMs]);

    const totalPrice = useMemo(() => {
        if (!startDateTime || !endDateTime || durationMs <= 0) return 0;
        const days = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) || 1;
        return days * Number(vehicle?.pricePerDay || 0);
    }, [durationMs, endDateTime, startDateTime, vehicle?.pricePerDay]);

    const durationLabel = useMemo(() => {
        if (!startDateTime || !endDateTime || durationMs <= 0) return '--';
        const totalMinutes = Math.floor(durationMs / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (!parts.length) parts.push('0m');

        return parts.join(' ');
    }, [durationMs, endDateTime, startDateTime]);

    const isFormValid = Boolean(startDateTime && endDateTime && !validationError);

    const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const leadingBlankCount = startOfMonth.getDay();

    const calendarCells = [
        ...Array.from({ length: leadingBlankCount }, (_, index) => ({ key: `blank-${index}`, date: null })),
        ...Array.from({ length: endOfMonth.getDate() }, (_, dayOffset) => {
            const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayOffset + 1);
            return { key: date.toISOString(), date };
        }),
    ];

    const isSameDay = (first, second) => {
        if (!first || !second) return false;
        return first.getFullYear() === second.getFullYear()
            && first.getMonth() === second.getMonth()
            && first.getDate() === second.getDate();
    };

    const isPastDate = (date) => toStartOfDay(date) < today;

    const inRange = (date) => {
        if (!startDate || !endDate) return false;
        const normalized = toStartOfDay(date).getTime();
        const rangeStart = toStartOfDay(startDate).getTime();
        const rangeEnd = toStartOfDay(endDate).getTime();
        return normalized > rangeStart && normalized < rangeEnd;
    };

    const handleSelectDate = (date) => {
        if (!date || isPastDate(date)) return;

        if (calendarTarget === 'start') {
            setStartDate(date);
            if (endDate && toStartOfDay(endDate) < toStartOfDay(date)) {
                setEndDate(date);
            }
        }

        if (calendarTarget === 'end') {
            if (startDate && toStartOfDay(date) < toStartOfDay(startDate)) {
                setBookingError('End date cannot be before start date.');
                return;
            }
            setEndDate(date);
        }

        setBookingError('');
        setCalendarTarget(null);
    };

    const handleTimePick = (target, timePart, value) => {
        const setter = target === 'start' ? setStartTime : setEndTime;
        setter((current) => ({ ...current, [timePart]: value }));
        setBookingError('');
    };

    const handleOpenCalendar = (target) => {
        const anchorDate = target === 'start' ? startDate : endDate;
        const monthDate = anchorDate || startDate || today;
        setCalendarMonth(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
        setCalendarTarget(target);
        setTimeTarget(null);
    };

    const handleOpenTimePicker = (target) => {
        setTimeTarget(target);
        setCalendarTarget(null);
    };

    const handleConfirmBooking = async () => {
        if (!isFormValid || !vehicle?._id) return;

        try {
            setBookingLoading(true);
            setBookingError('');

            const response = await fetch('/api/bookings/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    vehicleId: vehicle._id,
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Booking failed. Please try again.');
            }

            if (onBookingCreated) {
                onBookingCreated(data.booking);
            }
        } catch (error) {
            setBookingError(error.message || 'Network error while creating booking.');
        } finally {
            setBookingLoading(false);
        }
    };

    const vehicleTitle = vehicle?.title || vehicle?.name || 'Creta';
    const pricePerDay = Number(vehicle?.pricePerDay || 7000);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '620px',
                borderRadius: '14px',
                border: '1px solid #333',
                backgroundColor: '#161616',
                color: '#fff',
                padding: '1.8rem',
                position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '1rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#a0a0a0',
                        cursor: 'pointer',
                    }}
                >
                    <X size={22} />
                </button>

                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Book Vehicle</h2>
                <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', color: '#a0a0a0', fontSize: '1.2rem', fontWeight: 600 }}>
                    {vehicleTitle} — Rs. {pricePerDay.toLocaleString()}/day
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', color: '#c9c9c9', marginBottom: '0.4rem', fontWeight: 600 }}>Start Date</label>
                        <button
                            onClick={() => handleOpenCalendar('start')}
                            type="button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.9rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid #3a3a3a',
                                backgroundColor: '#0d0d0d',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{formatDateField(startDate)}</span>
                            <CalendarDays size={18} />
                        </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', color: '#c9c9c9', marginBottom: '0.4rem', fontWeight: 600 }}>Start Time</label>
                        <button
                            onClick={() => handleOpenTimePicker('start')}
                            type="button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.9rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid #3a3a3a',
                                backgroundColor: '#0d0d0d',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{formatTimeField(startTime)}</span>
                            <Clock3 size={18} />
                        </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', color: '#c9c9c9', marginBottom: '0.4rem', fontWeight: 600 }}>End Date</label>
                        <button
                            onClick={() => handleOpenCalendar('end')}
                            type="button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.9rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid #3a3a3a',
                                backgroundColor: '#0d0d0d',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{formatDateField(endDate)}</span>
                            <CalendarDays size={18} />
                        </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', color: '#c9c9c9', marginBottom: '0.4rem', fontWeight: 600 }}>End Time</label>
                        <button
                            onClick={() => handleOpenTimePicker('end')}
                            type="button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.9rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid #3a3a3a',
                                backgroundColor: '#0d0d0d',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{formatTimeField(endTime)}</span>
                            <Clock3 size={18} />
                        </button>
                    </div>
                </div>

                {calendarTarget && (
                    <div style={{
                        border: '1px solid #333',
                        borderRadius: '12px',
                        backgroundColor: '#111',
                        padding: '0.8rem',
                        marginBottom: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                style={{ border: '1px solid #333', background: '#0a0a0a', color: '#fff', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <p style={{ margin: 0, color: '#DBB33B', fontWeight: 600 }}>
                                {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
                            </p>
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                style={{ border: '1px solid #333', background: '#0a0a0a', color: '#fff', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                            {dayNames.map((dayName) => (
                                <div key={dayName} style={{ textAlign: 'center', color: '#8d8d8d', fontSize: '0.8rem', paddingBottom: '0.25rem' }}>
                                    {dayName}
                                </div>
                            ))}

                            {calendarCells.map((cell) => {
                                if (!cell.date) {
                                    return <div key={cell.key} />;
                                }

                                const date = cell.date;
                                const disabled = isPastDate(date);
                                const selectedStart = isSameDay(date, startDate);
                                const selectedEnd = isSameDay(date, endDate);
                                const isToday = isSameDay(date, today);
                                const highlightedRange = inRange(date);

                                let backgroundColor = '#0f0f0f';
                                let borderColor = '#222';
                                let color = '#e8e8e8';

                                if (highlightedRange) {
                                    backgroundColor = 'rgba(219,179,59,0.18)';
                                    borderColor = 'rgba(219,179,59,0.35)';
                                }

                                if (selectedStart || selectedEnd) {
                                    backgroundColor = '#DBB33B';
                                    borderColor = '#DBB33B';
                                    color = '#0f0f0f';
                                }

                                if (disabled) {
                                    color = '#4f4f4f';
                                    backgroundColor = '#0b0b0b';
                                    borderColor = '#161616';
                                }

                                if (isToday && !selectedStart && !selectedEnd) {
                                    borderColor = '#DBB33B';
                                }

                                return (
                                    <button
                                        type="button"
                                        key={cell.key}
                                        disabled={disabled}
                                        onClick={() => handleSelectDate(date)}
                                        style={{
                                            border: `1px solid ${borderColor}`,
                                            backgroundColor,
                                            color,
                                            borderRadius: '8px',
                                            height: '36px',
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {timeTarget && (
                    <div style={{
                        border: '1px solid #333',
                        borderRadius: '12px',
                        backgroundColor: '#111',
                        padding: '0.8rem',
                        marginBottom: '1rem',
                    }}>
                        <p style={{ margin: '0 0 0.6rem', color: '#c9c9c9', fontWeight: 600 }}>
                            Select {timeTarget === 'start' ? 'start' : 'end'} time (24-hour)
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ border: '1px solid #2a2a2a', borderRadius: '10px', maxHeight: '155px', overflowY: 'auto', padding: '0.4rem' }}>
                                {HOURS.map((hour) => {
                                    const selectedHour = (timeTarget === 'start' ? startTime.hour : endTime.hour) === hour;
                                    return (
                                        <button
                                            key={`hour-${hour}`}
                                            type="button"
                                            onClick={() => handleTimePick(timeTarget, 'hour', hour)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                marginBottom: '0.25rem',
                                                borderRadius: '8px',
                                                padding: '0.45rem 0.5rem',
                                                backgroundColor: selectedHour ? '#DBB33B' : '#151515',
                                                color: selectedHour ? '#111' : '#e5e5e5',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {pad(hour)}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ border: '1px solid #2a2a2a', borderRadius: '10px', maxHeight: '155px', overflowY: 'auto', padding: '0.4rem' }}>
                                {MINUTES.map((minute) => {
                                    const selectedMinute = (timeTarget === 'start' ? startTime.minute : endTime.minute) === minute;
                                    return (
                                        <button
                                            key={`minute-${minute}`}
                                            type="button"
                                            onClick={() => handleTimePick(timeTarget, 'minute', minute)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                marginBottom: '0.25rem',
                                                borderRadius: '8px',
                                                padding: '0.45rem 0.5rem',
                                                backgroundColor: selectedMinute ? '#DBB33B' : '#151515',
                                                color: selectedMinute ? '#111' : '#e5e5e5',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {pad(minute)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ border: '1px solid #2f2f2f', borderRadius: '10px', padding: '0.9rem', marginBottom: '1rem', backgroundColor: '#101010' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#d1d1d1' }}>
                        <span>Duration</span>
                        <strong>{durationLabel}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DBB33B' }}>
                        <span>Total Cost</span>
                        <strong>Rs. {totalPrice.toLocaleString()}</strong>
                    </div>
                </div>

                {(bookingError || validationError) && (
                    <p style={{ color: '#f87171', marginBottom: '1rem' }}>{bookingError || validationError}</p>
                )}

                <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={!isFormValid || bookingLoading}
                    style={{
                        width: '100%',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.95rem 1rem',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        backgroundColor: !isFormValid || bookingLoading ? '#6d6141' : '#DBB33B',
                        color: '#111',
                        cursor: !isFormValid || bookingLoading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {bookingLoading ? 'Creating booking...' : 'Confirm Booking'}
                </button>
            </div>
        </div>
    );
};

export default BookingModal;
