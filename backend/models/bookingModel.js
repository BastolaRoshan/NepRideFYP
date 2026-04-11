import mongoose from 'mongoose';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const customerRatingSchema = new mongoose.Schema({
    score: {
        type: Number,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
        default: '',
    },
    ratedAt: {
        type: Date,
        default: null,
    },
}, { _id: false });

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
        validate: {
            validator(value) {
                if (!this.startDate || !value) return true;
                return new Date(value).getTime() > new Date(this.startDate).getTime();
            },
            message: 'End date must be after start date.',
        },
    },
    totalDays: {
        type: Number,
        required: true,
        min: 1,
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
    paymentProvider: {
        type: String,
        trim: true,
        default: '',
    },
    khaltiPidx: {
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
    customerRating: {
        type: customerRatingSchema,
        default: null,
    },
}, { timestamps: true });

bookingSchema.pre('validate', function syncTotalDays() {
    if (Number(this.totalDays) >= 1) {
        this.totalDays = Number(this.totalDays);
        return;
    }

    if (!this.startDate || !this.endDate) return;

    const start = new Date(this.startDate).getTime();
    const end = new Date(this.endDate).getTime();
    const diffMs = end - start;

    if (diffMs > 0) {
        this.totalDays = Math.ceil(diffMs / DAY_IN_MS);
    }
});

const bookingModel = mongoose.models.booking || mongoose.model('booking', bookingSchema);

export default bookingModel;
