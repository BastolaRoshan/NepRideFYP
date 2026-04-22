import vehicleModel from "../models/vehicleModel.js";
import userModel from "../models/userModel.js";
import { normalizeRole } from "../utils/verification.js";

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

const syncVendorOverallRating = async (vendorId) => {
    if (!vendorId) return;

    const aggregate = await vehicleModel.aggregate([
        { $match: { vendor: vendorId } },
        {
            $group: {
                _id: '$vendor',
                totalRatingCount: { $sum: '$ratingCount' },
                totalRatingSum: { $sum: '$ratingSum' },
            },
        },
    ]);

    const totalRatingCount = Number(aggregate[0]?.totalRatingCount || 0);
    const totalRatingSum = Number(aggregate[0]?.totalRatingSum || 0);
    const vendorRatingAverage = totalRatingCount > 0
        ? Number((totalRatingSum / totalRatingCount).toFixed(2))
        : 0;

    await userModel.findByIdAndUpdate(vendorId, {
        vendorRatingAverage,
        vendorRatingCount: totalRatingCount,
    });
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
        ratingAverage: Number(vehicle.ratingAverage || 0),
        ratingCount: Number(vehicle.ratingCount || 0),
        vendorRatingAverage: Number(vehicle.vendor?.vendorRatingAverage || 0),
        vendorRatingCount: Number(vehicle.vendor?.vendorRatingCount || 0),
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
            bluebookUrl,
        } = req.body;

        const normalizedTitle = (title || name || "").trim();
        const normalizedOverview = (overview || "").trim();
        const normalizedModel = (model || "").trim();
        const normalizedVehicleType = (vehicleType || type || "").trim();
        const normalizedFuelType = (fuelType || fuel || "").trim();
        const normalizedImage = typeof image === "string" ? image.trim() : "";
        const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);
        const normalizedBluebookUrl = typeof bluebookUrl === "string" ? bluebookUrl.trim() : "";

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
            bluebookUrl: normalizedBluebookUrl,
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
        const vehicles = await vehicleModel
            .find({ vendor: req.user._id })
            .select("title name overview model seatCapacity seats vehicleType type fuelType fuel pricePerDay speed registrationNumber ratingAverage ratingCount ratingSum vendor createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean();

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

        const vendorId = vehicle.vendor;
        await vehicle.deleteOne();
        await syncVendorOverallRating(vendorId);
        res.json({ success: true, message: "Vehicle deleted" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getAllVehicles = async (req, res) => {
    try {
        const requestedLimit = toPositiveInteger(req.query.limit);

        const approvedVendors = await userModel
            .find({
                role: "Vendor",
                verificationStatus: "Approved",
                accountStatus: { $nin: ["suspended", "blocked"] },
            })
            .select("name vendorRatingAverage vendorRatingCount")
            .lean();

        const approvedVendorIds = approvedVendors.map((vendor) => vendor._id);

        if (approvedVendorIds.length === 0) {
            return res.json({
                success: true,
                count: 0,
                vehicles: [],
            });
        }

        const vendorById = new Map(
            approvedVendors.map((vendor) => [String(vendor._id), vendor])
        );

        const vehicles = await vehicleModel
            .find({ vendor: { $in: approvedVendorIds } })
            .select("title name model seatCapacity seats vehicleType type fuelType fuel pricePerDay speed registrationNumber ratingAverage ratingCount vendor createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean();

        const hydratedVehicles = vehicles
            .map((vehicle) => ({
                ...vehicle,
                vendor: vendorById.get(String(vehicle.vendor)) || null,
            }))
            .filter((vehicle) => Boolean(vehicle.vendor));

        const limitedVehicles = requestedLimit ? hydratedVehicles.slice(0, requestedLimit) : hydratedVehicles;

        res.json({
            success: true,
            count: limitedVehicles.length,
            vehicles: limitedVehicles.map(mapVehicleResponse),
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getVehicleImageById = async (req, res) => {
    try {
        const vehicle = await vehicleModel
            .findById(req.params.id)
            .select("image vendor")
            .lean();

        if (!vehicle) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        const vendor = await userModel
            .findById(vehicle.vendor)
            .select("role accountStatus verificationStatus")
            .lean();

        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        if (normalizeRole(vendor.role) !== "Vendor") {
            return res.status(403).json({ success: false, message: "Image not available" });
        }

        const accountStatus = String(vendor.accountStatus || "active").toLowerCase();
        const isAccountActive = accountStatus !== "suspended" && accountStatus !== "blocked";
        const isApproved = String(vendor.verificationStatus || "").trim() === "Approved";

        if (!isAccountActive || !isApproved) {
            return res.status(403).json({ success: false, message: "Image not available" });
        }

        const imageValue = String(vehicle.image || "").trim();

        if (!imageValue) {
            return res.status(404).json({ success: false, message: "Image not found" });
        }

        if (/^https?:\/\//i.test(imageValue) || imageValue.startsWith("/uploads/")) {
            return res.redirect(imageValue);
        }

        const dataUriMatch = imageValue.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUriMatch) {
            const mimeType = dataUriMatch[1] || "application/octet-stream";
            const base64Payload = dataUriMatch[2] || "";
            const imageBuffer = Buffer.from(base64Payload, "base64");

            res.setHeader("Content-Type", mimeType);
            res.setHeader("Cache-Control", "public, max-age=300");
            return res.status(200).send(imageBuffer);
        }

        return res.status(400).json({ success: false, message: "Unsupported image format" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
