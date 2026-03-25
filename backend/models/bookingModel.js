import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vehicle',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'pending_payment', 'confirmed', 'cancelled', 'completed'],
        default: 'pending_payment',
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid', 'Refunded'],
        default: 'Unpaid',
    },
    paymentMethod: {
        type: String,
        trim: true,
        default: '',
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    cancellationReason: {
        type: String,
        trim: true,
        default: '',
    },
}, { timestamps: true });

const bookingModel = mongoose.models.booking || mongoose.model('booking', bookingSchema);

export default bookingModel;
