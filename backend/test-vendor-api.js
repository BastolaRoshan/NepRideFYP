import mongoose from "mongoose";
import "dotenv/config";
import jwt from "jsonwebtoken";
import userModel from "./models/userModel.js";
import vehicleModel from "./models/vehicleModel.js";

const test = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  
  const vendor = await userModel.findOne({ role: "Vendor" });
  if (!vendor) {
    console.log("No vendor found");
    process.exit(0);
  }
  
  console.log("Vendor ID:", vendor._id);
  
  const vehicles = await vehicleModel.find({ vendor: vendor._id }).lean();
  console.log("Vehicles:", vehicles.length);
  process.exit(0);
};

test().catch(console.error);
