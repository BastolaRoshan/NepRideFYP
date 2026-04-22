import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () =>
            console.log("MongoDB connected successfully")
        );
        
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        // We do not exit process here so that the app stays up and returns 500s rather than hanging completely, or you can choose to process.exit(1).
    }
};


  export default connectDB;