import mongoose from "mongoose";
import "dotenv/config";
import vehicleModel from "./models/vehicleModel.js";
import userModel from "./models/userModel.js";

const test = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected");

    const vendor = await userModel.findOne({ role: "Vendor" });
    if (!vendor) {
        console.log("No vendor found");
        process.exit(0);
    }
    console.log("Vendor:", vendor._id);

    // Create a new vehicle
    const vehicle = new vehicleModel({
        title: "Test Vehicle to Delete",
        overview: "Overview",
        model: "2024",
        seatCapacity: 4,
        vehicleType: "Car",
        fuelType: "Petrol",
        pricePerDay: 1000,
        image: "data:image/png;base64,...",
        bluebookUrl: "data:image/png;base64,...",
        vendor: vendor._id,
        registrationNumber: "NR-TEST-" + Date.now()
    });
    await vehicle.save();
    console.log("Created vehicle:", vehicle._id);

    // Try finding it using the exact same logic as getVendorVehicles
    const fetched = await vehicleModel
        .find({ vendor: vendor._id })
        .select("title name overview model seatCapacity seats vehicleType type fuelType fuel pricePerDay speed registrationNumber ratingAverage ratingCount ratingSum vendor createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean();
    
    const ourVehicle = fetched.find(v => String(v._id) === String(vehicle._id));
    console.log("Fetched vehicle has _id?", !!ourVehicle?._id);

    // Try deleting via same logic as deleteVehicle
    const deleteTarget = await vehicleModel.findById(vehicle._id);
    if (!deleteTarget) console.log("Not found for delete");
    else if (deleteTarget.vendor.toString() !== vendor._id.toString()) console.log("Vendor mismatch");
    else {
        await deleteTarget.deleteOne();
        console.log("Deleted successfully via Mongoose");
    }

    process.exit(0);
};

test().catch(console.error);
