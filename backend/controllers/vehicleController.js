import vehicleModel from "../models/vehicleModel.js";

const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
};

const toPositiveInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeRegistrationNumber = (value) => {
    if (typeof value !== "string") return "";
    return value.trim().toUpperCase();
};

const getMongoErrorMessage = (error) => {
    if (error?.code === 11000) {
        if (error?.keyPattern?.registrationNumber || error?.message?.includes("registrationNumber_1")) {
            return "Registration number already exists. Please use a unique registration number.";
        }

        return "Duplicate value detected for a unique field.";
    }

    return error?.message || "Something went wrong";
};

const mapVehicleResponse = (vehicleDoc) => {
    const vehicle = vehicleDoc?.toObject ? vehicleDoc.toObject() : vehicleDoc;

    return {
        ...vehicle,
        name: vehicle.name || vehicle.title,
        type: vehicle.type || vehicle.vehicleType,
        seats: vehicle.seats ?? vehicle.seatCapacity,
        fuel: vehicle.fuel || vehicle.fuelType,
        vendorName: vehicle.vendor?.name || vehicle.vendorName || "",
    };
};

export const addVehicle = async (req, res) => {
    try {
        const {
            title,
            overview,
            model,
            seatCapacity,
            vehicleType,
            fuelType,
            image,
            pricePerDay,
            registrationNumber,
            name,
            type,
            seats,
            speed,
            fuel,
        } = req.body;

        const normalizedTitle = (title || name || "").trim();
        const normalizedOverview = (overview || "").trim();
        const normalizedModel = (model || "").trim();
        const normalizedVehicleType = (vehicleType || type || "").trim();
        const normalizedFuelType = (fuelType || fuel || "").trim();
        const normalizedImage = typeof image === "string" ? image.trim() : "";
        const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);

        const normalizedSeatCapacity = toFiniteNumber(seatCapacity ?? seats);
        const normalizedPricePerDay = toFiniteNumber(pricePerDay);
        const normalizedSpeed = speed === undefined || speed === null || speed === "" ? null : toFiniteNumber(speed);

        if (
            !normalizedTitle ||
            !normalizedOverview ||
            !normalizedModel ||
            !normalizedVehicleType ||
            !normalizedFuelType ||
            !normalizedImage ||
            !Number.isFinite(normalizedSeatCapacity) ||
            normalizedSeatCapacity < 1 ||
            !Number.isFinite(normalizedPricePerDay) ||
            normalizedPricePerDay < 0 ||
            (normalizedSpeed !== null && (!Number.isFinite(normalizedSpeed) || normalizedSpeed < 0))
        ) {
            return res.json({ success: false, message: "Please provide valid vehicle details" });
        }

        const vehicle = new vehicleModel({
            title: normalizedTitle,
            overview: normalizedOverview,
            model: normalizedModel,
            seatCapacity: normalizedSeatCapacity,
            vehicleType: normalizedVehicleType,
            fuelType: normalizedFuelType,
            image: normalizedImage,
            pricePerDay: normalizedPricePerDay,
            name: normalizedTitle,
            type: normalizedVehicleType,
            seats: normalizedSeatCapacity,
            fuel: normalizedFuelType,
            speed: normalizedSpeed,
            registrationNumber: normalizedRegistrationNumber || undefined,
            vendor: req.user._id,
        });

        await vehicle.save();
        res.json({
            success: true,
            message: "Vehicle added successfully",
            vehicle: mapVehicleResponse(vehicle),
        });
    } catch (error) {
        res.json({ success: false, message: getMongoErrorMessage(error) });
    }
};

export const getVendorVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleModel.find({ vendor: req.user._id }).sort({ createdAt: -1 });
        res.json({
            success: true,
            count: vehicles.length,
            vehicles: vehicles.map(mapVehicleResponse),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updateVehicle = async (req, res) => {
    try {
        let vehicle = await vehicleModel.findById(req.params.id);

        if (!vehicle) {
            return res.json({ success: false, message: "Vehicle not found" });
        }

        // Checking if the vendor owns the vehicle
        if (vehicle.vendor.toString() !== req.user._id.toString()) {
            return res.json({ success: false, message: "Not authorized to update this vehicle" });
        }

        const updatePayload = { ...req.body };

        if (updatePayload.title && !updatePayload.name) {
            updatePayload.name = updatePayload.title;
        }

        if (updatePayload.name && !updatePayload.title) {
            updatePayload.title = updatePayload.name;
        }

        if (updatePayload.vehicleType && !updatePayload.type) {
            updatePayload.type = updatePayload.vehicleType;
        }

        if (updatePayload.type && !updatePayload.vehicleType) {
            updatePayload.vehicleType = updatePayload.type;
        }

        if (updatePayload.fuelType && !updatePayload.fuel) {
            updatePayload.fuel = updatePayload.fuelType;
        }

        if (updatePayload.fuel && !updatePayload.fuelType) {
            updatePayload.fuelType = updatePayload.fuel;
        }

        if (updatePayload.seatCapacity !== undefined && updatePayload.seats === undefined) {
            updatePayload.seats = updatePayload.seatCapacity;
        }

        if (updatePayload.seats !== undefined && updatePayload.seatCapacity === undefined) {
            updatePayload.seatCapacity = updatePayload.seats;
        }

        if (updatePayload.seatCapacity !== undefined) {
            updatePayload.seatCapacity = toFiniteNumber(updatePayload.seatCapacity);
            updatePayload.seats = updatePayload.seatCapacity;
        }

        if (updatePayload.pricePerDay !== undefined) {
            updatePayload.pricePerDay = toFiniteNumber(updatePayload.pricePerDay);
        }

        if (updatePayload.speed !== undefined && updatePayload.speed !== null && updatePayload.speed !== "") {
            updatePayload.speed = toFiniteNumber(updatePayload.speed);
        }

        if (Object.prototype.hasOwnProperty.call(updatePayload, "registrationNumber")) {
            const normalizedRegistrationNumber = normalizeRegistrationNumber(updatePayload.registrationNumber);

            if (normalizedRegistrationNumber) {
                updatePayload.registrationNumber = normalizedRegistrationNumber;
            } else {
                delete updatePayload.registrationNumber;
            }
        }

        vehicle = await vehicleModel.findByIdAndUpdate(req.params.id, updatePayload, {
            new: true,
            runValidators: true,
        });

        res.json({ success: true, message: "Vehicle updated", vehicle: mapVehicleResponse(vehicle) });
    } catch (error) {
        res.json({ success: false, message: getMongoErrorMessage(error) });
    }
};

export const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await vehicleModel.findById(req.params.id);

        if (!vehicle) {
            return res.json({ success: false, message: "Vehicle not found" });
        }

        if (vehicle.vendor.toString() !== req.user._id.toString()) {
            return res.json({ success: false, message: "Not authorized to delete this vehicle" });
        }

        await vehicle.deleteOne();
        res.json({ success: true, message: "Vehicle deleted" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getAllVehicles = async (req, res) => {
    try {
        const requestedLimit = toPositiveInteger(req.query.limit);

        let query = vehicleModel
            .find()
            .sort({ createdAt: -1 })
            .populate("vendor", "name email");

        if (requestedLimit) {
            query = query.limit(requestedLimit);
        }

        const vehicles = await query;

        res.json({
            success: true,
            count: vehicles.length,
            vehicles: vehicles.map(mapVehicleResponse),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
