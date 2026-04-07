import bookingModel from "../models/bookingModel.js";
import vehicleModel from "../models/vehicleModel.js";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const PAYMENT_WINDOW_MS = 10 * 60 * 1000;
const ACTIVE_BLOCKING_STATUSES = ['active', 'Active', 'confirmed', 'Confirmed'];

const normalizeStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'pending' || normalized === 'pending_payment') return 'pending_payment';
    if (normalized === 'confirmed') return 'confirmed';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    if (normalized === 'completed') return 'completed';

    return '';
};

const isBookingBlocking = (booking, referenceTime = new Date()) => {
    const normalizedStatus = normalizeStatus(booking?.status);

    if (ACTIVE_BLOCKING_STATUSES.includes(booking?.status)) {
        return true;
    }

    if (normalizedStatus === 'confirmed') {
        return true;
    }

    if (normalizedStatus === 'pending_payment') {
        return !booking?.expiresAt || new Date(booking.expiresAt).getTime() > referenceTime.getTime();
    }

    return false;
};

const getBlockingBookings = async ({ vehicleId, sinceDate, excludeBookingId = null }) => {
    const now = new Date();

    const query = {
        vehicle: vehicleId,
        endDate: { $gt: sinceDate },
        $or: [
            { status: { $in: ACTIVE_BLOCKING_STATUSES } },
            { status: 'pending_payment', expiresAt: { $gt: now } },
            { status: 'Pending', expiresAt: { $gt: now } },
        ],
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    return bookingModel
        .find(query)
        .select('_id status startDate endDate expiresAt')
        .sort({ startDate: 1, endDate: 1 });
};

const intervalsOverlap = (firstStart, firstEnd, secondStart, secondEnd) => {
    return firstStart.getTime() < secondEnd.getTime() && firstEnd.getTime() > secondStart.getTime();
};

const mergeBlockingIntervals = (bookings) => {
    const orderedIntervals = bookings
        .map((booking) => ({
            start: new Date(booking.startDate),
            end: new Date(booking.endDate),
        }))
        .filter((interval) => !Number.isNaN(interval.start.getTime()) && !Number.isNaN(interval.end.getTime()))
        .sort((first, second) => first.start.getTime() - second.start.getTime());

    const mergedIntervals = [];

    for (const interval of orderedIntervals) {
        const lastInterval = mergedIntervals[mergedIntervals.length - 1];

        if (!lastInterval || interval.start.getTime() > lastInterval.end.getTime()) {
            mergedIntervals.push({ ...interval });
            continue;
        }

        if (interval.end.getTime() > lastInterval.end.getTime()) {
            lastInterval.end = interval.end;
        }
    }

    return mergedIntervals;
};

const getNextAvailableSlot = (bookings, requestedStart, requestedEnd) => {
    const requestedDurationMs = requestedEnd.getTime() - requestedStart.getTime();
    const mergedIntervals = mergeBlockingIntervals(bookings);
    let candidateStart = new Date(requestedStart);

    for (const interval of mergedIntervals) {
        const candidateEndTime = candidateStart.getTime() + requestedDurationMs;

        if (candidateEndTime <= interval.start.getTime()) {
            return {
                nextAvailableStart: candidateStart,
                nextAvailableEnd: new Date(candidateEndTime),
            };
        }

        if (candidateStart.getTime() < interval.end.getTime()) {
            candidateStart = new Date(interval.end.getTime());
        }
    }

    return {
        nextAvailableStart: candidateStart,
        nextAvailableEnd: new Date(candidateStart.getTime() + requestedDurationMs),
    };
};

const formatAvailabilitySuggestion = (suggestion) => {
    if (!suggestion?.nextAvailableStart || !suggestion?.nextAvailableEnd) {
        return null;
    }

    return {
        nextAvailableStart: suggestion.nextAvailableStart.toISOString(),
        nextAvailableEnd: suggestion.nextAvailableEnd.toISOString(),
    };
};

const canAccessBooking = async (booking, user) => {
    if (!booking || !user) return false;
    if (String(user.role).toLowerCase() === 'admin') return true;
    const bookingCustomerId = booking?.customer?._id || booking?.customer;
    if (String(bookingCustomerId) === String(user._id)) return true;

    const bookingVehicleId = booking?.vehicle?._id || booking?.vehicle;
    const vehicle = await vehicleModel.findById(bookingVehicleId).select('vendor');
    if (!vehicle) return false;
    return String(vehicle.vendor) === String(user._id);
};

const calculateTotalDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;

    return Math.ceil(diffMs / DAY_IN_MS);
};

const mapBookingWithComputedFields = (bookingDoc) => {
    const booking = bookingDoc?.toObject ? bookingDoc.toObject() : bookingDoc;
    const computedDays = calculateTotalDays(booking.startDate, booking.endDate);

    return {
        ...booking,
        totalDays: Number(booking.totalDays) > 0 ? booking.totalDays : computedDays,
    };
};

export const createBooking = async (req, res) => {
    try {
        const { vehicleId, startDate, endDate } = req.body;

        if (!vehicleId || !startDate || !endDate) {
            return res.json({ success: false, message: "Please provide all booking details" });
        }

        const vehicle = await vehicleModel.findById(vehicleId);
        if (!vehicle) {
            return res.json({ success: false, message: "Vehicle not found" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.json({ success: false, message: "Invalid booking date/time provided" });
        }

        if (end <= start) {
            return res.json({ success: false, message: "End date/time must be after start date/time" });
        }

        const blockingBookings = await getBlockingBookings({
            vehicleId,
            sinceDate: start,
        });

        const overlappingBooking = blockingBookings.find((booking) =>
            isBookingBlocking(booking) && intervalsOverlap(
                new Date(booking.startDate),
                new Date(booking.endDate),
                start,
                end
            )
        );

        if (overlappingBooking) {
            const availabilitySuggestion = formatAvailabilitySuggestion(
                getNextAvailableSlot(blockingBookings, start, end)
            );

            return res.json({
                success: false,
                message: 'Vehicle is not available for the selected time range.',
                availability: availabilitySuggestion,
            });
        }

        const totalDays = calculateTotalDays(start, end);

        if (totalDays < 1) {
            return res.json({ success: false, message: 'Minimum booking duration is 1 day.' });
        }

        const totalPrice = totalDays * vehicle.pricePerDay;
        const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);

        const booking = new bookingModel({
            customer: req.user._id,
            vehicle: vehicleId,
            startDate: start,
            endDate: end,
            totalDays,
            status: 'pending_payment',
            totalPrice,
            expiresAt,
            paymentStatus: 'Unpaid',
        });

        await booking.save();
        res.json({
            success: true,
            message: "Booking created successfully",
            booking: mapBookingWithComputedFields(booking),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getCustomerBookings = async (req, res) => {
    try {
        const bookings = await bookingModel
            .find({ customer: req.user._id })
            .populate("vehicle");
        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings.map(mapBookingWithComputedFields),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getVendorBookings = async (req, res) => {
    try {
        // Find all vehicles owned by this vendor
        const vehicles = await vehicleModel.find({ vendor: req.user._id }).select("_id");
        const vehicleIds = vehicles.map(v => v._id);

        // Find bookings for these vehicles
        const bookings = await bookingModel
            .find({ vehicle: { $in: vehicleIds } })
            .populate("vehicle")
            .populate("customer", "name email phone");

        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings.map(mapBookingWithComputedFields),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'Confirmed', 'Cancelled', 'Completed'
        const normalizedStatus = normalizeStatus(status);

        if (!normalizedStatus) {
            return res.json({ success: false, message: "Invalid booking status" });
        }

        // Find booking and ensure the vendor owns the connected vehicle
        const booking = await bookingModel.findById(req.params.id).populate("vehicle");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (booking.vehicle.vendor.toString() !== req.user._id.toString()) {
            return res.json({ success: false, message: "Not authorized to update this booking" });
        }

        booking.status = normalizedStatus;
        if (normalizedStatus === 'confirmed') {
            const blockingBookings = await getBlockingBookings({
                vehicleId: booking.vehicle._id,
                excludeBookingId: booking._id,
            });

            const overlappingBooking = blockingBookings.find((blockingBooking) =>
                isBookingBlocking(blockingBooking) && intervalsOverlap(
                    new Date(blockingBooking.startDate),
                    new Date(blockingBooking.endDate),
                    new Date(booking.startDate),
                    new Date(booking.endDate)
                )
            );

            if (overlappingBooking) {
                return res.json({
                    success: false,
                    message: 'Cannot confirm this booking because the vehicle is already booked for overlapping time.',
                });
            }

            booking.paymentStatus = 'Paid';
            booking.expiresAt = null;
        }

        if (normalizedStatus === 'cancelled') {
            booking.cancelledAt = new Date();
            booking.expiresAt = null;
        }

        await booking.save();

        res.json({ success: true, message: "Booking status updated", booking: mapBookingWithComputedFields(booking) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getBookingById = async (req, res) => {
    try {
        const booking = await bookingModel
            .findById(req.params.id)
            .populate('vehicle')
            .populate('customer', 'name email phone role');

        if (!booking) {
            return res.json({ success: false, message: 'Booking not found' });
        }

        const access = await canAccessBooking(booking, req.user);
        if (!access) {
            return res.json({ success: false, message: 'Not authorized to view this booking' });
        }

        return res.json({ success: true, booking: mapBookingWithComputedFields(booking) });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const confirmBookingPayment = async (req, res) => {
    try {
        const booking = await bookingModel.findById(req.params.id);

        if (!booking) {
            return res.json({ success: false, message: 'Booking not found' });
        }

        const access = await canAccessBooking(booking, req.user);
        if (!access) {
            return res.json({ success: false, message: 'Not authorized to confirm this booking' });
        }

        if (booking.status === 'cancelled') {
            return res.json({ success: false, message: 'Booking is already cancelled' });
        }

        if (booking.status === 'confirmed') {
            return res.json({ success: true, message: 'Booking already confirmed', booking: mapBookingWithComputedFields(booking) });
        }

        if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
            booking.status = 'cancelled';
            booking.cancelledAt = new Date();
            booking.cancellationReason = 'Payment session expired';
            booking.expiresAt = null;
            await booking.save();
            return res.json({ success: false, message: 'Booking payment window has expired', booking: mapBookingWithComputedFields(booking) });
        }

        const blockingBookings = await getBlockingBookings({
            vehicleId: booking.vehicle,
            excludeBookingId: booking._id,
        });

        const overlappingBooking = blockingBookings.find((blockingBooking) =>
            isBookingBlocking(blockingBooking) && intervalsOverlap(
                new Date(blockingBooking.startDate),
                new Date(blockingBooking.endDate),
                new Date(booking.startDate),
                new Date(booking.endDate)
            )
        );

        if (overlappingBooking) {
            return res.json({
                success: false,
                message: 'Vehicle is already booked for an overlapping time range.',
            });
        }

        booking.status = 'confirmed';
        booking.paymentStatus = 'Paid';
        booking.expiresAt = null;
        booking.paymentMethod = req.body?.paymentMethod || booking.paymentMethod || 'Online';

        await booking.save();

        return res.json({ success: true, message: 'Booking confirmed successfully', booking: mapBookingWithComputedFields(booking) });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const { reason } = req.body || {};

        const booking = await bookingModel.findById(req.params.id);

        if (!booking) {
            return res.json({ success: false, message: 'Booking not found' });
        }

        const access = await canAccessBooking(booking, req.user);
        if (!access) {
            return res.json({ success: false, message: 'Not authorized to cancel this booking' });
        }

        if (booking.status === 'cancelled') {
            return res.json({ success: true, message: 'Booking already cancelled', booking: mapBookingWithComputedFields(booking) });
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = String(reason || 'Cancelled by user');
        booking.expiresAt = null;

        await booking.save();

        return res.json({ success: true, message: 'Booking cancelled successfully', booking: mapBookingWithComputedFields(booking) });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const cancelExpiredPendingBookings = async () => {
    const now = new Date();
    const result = await bookingModel.updateMany(
        {
            status: 'pending_payment',
            expiresAt: { $lt: now },
        },
        {
            $set: {
                status: 'cancelled',
                cancelledAt: now,
                cancellationReason: 'Payment window expired',
                expiresAt: null,
            },
        }
    );

    return result.modifiedCount || 0;
};
