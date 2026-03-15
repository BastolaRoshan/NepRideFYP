import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    overview: {
        type: String,
        required: true,
        trim: true,
    },
    model: {
        type: String,
        required: true,
        trim: true,
    },
    seatCapacity: {
        type: Number,
        required: true,
        min: 1,
    },
    vehicleType: {
        type: String,
        required: true,
        trim: true,
    },
    fuelType: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: true,
    },
    pricePerDay: {
        type: Number,
        required: true,
        min: 0,
    },
    name: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        trim: true,
    },
    seats: {
        type: Number,
        min: 1,
    },
    speed: {
        type: Number,
        min: 0,
    },
    fuel: {
        type: String,
        trim: true,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
}, { timestamps: true });

vehicleSchema.pre('validate', function syncLegacyFields() {
    if (!this.name && this.title) this.name = this.title;
    if (!this.title && this.name) this.title = this.name;

    if (!this.type && this.vehicleType) this.type = this.vehicleType;
    if (!this.vehicleType && this.type) this.vehicleType = this.type;

    if (!this.fuel && this.fuelType) this.fuel = this.fuelType;
    if (!this.fuelType && this.fuel) this.fuelType = this.fuel;

    if ((this.seats === undefined || this.seats === null) && this.seatCapacity !== undefined && this.seatCapacity !== null) {
        this.seats = this.seatCapacity;
    }

    if ((this.seatCapacity === undefined || this.seatCapacity === null) && this.seats !== undefined && this.seats !== null) {
        this.seatCapacity = this.seats;
    }
});

const vehicleModel = mongoose.models.vehicle || mongoose.model('vehicle', vehicleSchema);

export default vehicleModel;
