import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import path from "path";
import connectDB from "./config/mongodb.js"; // Default import
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoute.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { cancelExpiredPendingBookings } from "./controllers/bookingController.js";

const app = express();
const port = process.env.PORT || 5001;
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://localhost:5178",
    ],
    credentials: true,
  })
);
connectDB(); // ✅ ok (but see async version below)

app.get("/", (req, res) => res.send("NepRide backend is running"));

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

const runBookingExpirySweep = async () => {
  try {
    const cancelledCount = await cancelExpiredPendingBookings();
    if (cancelledCount > 0) {
      console.log(`[booking-expiry-job] Cancelled ${cancelledCount} expired booking(s)`);
    }
  } catch (error) {
    console.error('[booking-expiry-job] Failed:', error.message);
  }
};

setInterval(runBookingExpirySweep, 60 * 1000);
runBookingExpirySweep();

app.listen(port, () => console.log(`Server is running on port ${port}`));

export default app;
