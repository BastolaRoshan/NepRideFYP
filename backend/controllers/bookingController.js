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

const findOverlappingActiveBooking = async ({ vehicleId, startDate, endDate, excludeBookingId = null }) => {
    const now = new Date();

    const query = {
        vehicle: vehicleId,
        startDate: { $lt: endDate },
        endDate: { $gt: now },
        $or: [
            { status: { $in: ACTIVE_BLOCKING_STATUSES } },
            {
                status: 'pending_payment',
                expiresAt: { $gt: now },
            },
            {
                status: 'Pending',
                expiresAt: { $gt: now },
            },
        ],
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    return bookingModel.findOne(query).select('_id status startDate endDate');
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

        const overlappingBooking = await findOverlappingActiveBooking({
            vehicleId,
            startDate: start,
            endDate: end,
        });

        if (overlappingBooking) {
            return res.json({
                success: false,
                message: 'Vehicle is not available for the selected time range.',
            });
        }

        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / DAY_IN_MS) || 1;

        const totalPrice = diffDays * vehicle.pricePerDay;
        const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);

        const booking = new bookingModel({
            customer: req.user._id,
            vehicle: vehicleId,
            startDate: start,
            endDate: end,
            status: 'pending_payment',
            totalPrice,
            expiresAt,
            paymentStatus: 'Unpaid',
        });

        await booking.save();
        res.json({
            success: true,
            message: "Booking created successfully",
            booking,
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
        res.json({ success: true, count: bookings.length, bookings });
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

        res.json({ success: true, count: bookings.length, bookings });
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
            const overlappingBooking = await findOverlappingActiveBooking({
                vehicleId: booking.vehicle._id,
                startDate: booking.startDate,
                endDate: booking.endDate,
                excludeBookingId: booking._id,
            });

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

        res.json({ success: true, message: "Booking status updated", booking });
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

        return res.json({ success: true, booking });
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
            return res.json({ success: true, message: 'Booking already confirmed', booking });
        }

        if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
            booking.status = 'cancelled';
            booking.cancelledAt = new Date();
            booking.cancellationReason = 'Payment session expired';
            booking.expiresAt = null;
            await booking.save();
            return res.json({ success: false, message: 'Booking payment window has expired', booking });
        }

        const overlappingBooking = await findOverlappingActiveBooking({
            vehicleId: booking.vehicle,
            startDate: booking.startDate,
            endDate: booking.endDate,
            excludeBookingId: booking._id,
        });

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

        return res.json({ success: true, message: 'Booking confirmed successfully', booking });
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
            return res.json({ success: true, message: 'Booking already cancelled', booking });
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = String(reason || 'Cancelled by user');
        booking.expiresAt = null;

        await booking.save();

        return res.json({ success: true, message: 'Booking cancelled successfully', booking });
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
