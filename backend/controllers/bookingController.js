import bookingModel from "../models/bookingModel.js";
import vehicleModel from "../models/vehicleModel.js";

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

        // Calculate total price based on dates (Simple approach)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        // At least 1 day rental
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        const totalPrice = diffDays * vehicle.pricePerDay;

        const booking = new bookingModel({
            customer: req.user._id,
            vehicle: vehicleId,
            startDate,
            endDate,
            totalPrice,
        });

        await booking.save();
        res.json({ success: true, message: "Booking created successfully", booking });
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

        // Find booking and ensure the vendor owns the connected vehicle
        const booking = await bookingModel.findById(req.params.id).populate("vehicle");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (booking.vehicle.vendor.toString() !== req.user._id.toString()) {
            return res.json({ success: false, message: "Not authorized to update this booking" });
        }

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: "Booking status updated", booking });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
