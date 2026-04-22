import bookingModel from "../models/bookingModel.js";
import feedbackModel from "../models/feedbackModel.js";
import userModel from "../models/userModel.js";
import vehicleModel from "../models/vehicleModel.js";
import { sendVerificationStatusUpdateEmail } from "../services/emailService.js";
import {
  getVerificationAccessPayload,
  normalizeRole,
  syncUserVerificationState,
} from "../utils/verification.js";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const normalizePaymentStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "unpaid") return "Unpaid";
  if (normalized === "refunded") return "Refunded";

  return "";
};

const normalizeDocumentStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "pending") return "Pending";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";

  return "";
};

const toSafeUser = (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc;
  const documents = Array.isArray(user?.documents) ? user.documents : [];
  const verificationPayload = getVerificationAccessPayload(user);
  const verificationStatus = verificationPayload.verificationStatus;
  const isServiceAccessAllowed = verificationPayload.isServiceAccessAllowed;
  const verification = verificationPayload.verification;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: normalizeRole(user.role) || "Customer",
    isVerified: Boolean(user.isVerified),
    verificationStatus,
    isServiceAccessAllowed,
    verification,
    verificationNote: user.verificationNote || "",
    verificationSubmittedAt: user.verificationSubmittedAt || null,
    verificationReviewedAt: user.verificationReviewedAt || null,
    documentsCount: documents.length,
    documents,
    accountStatus: user?.accountStatus || "active",
  };
};

const toVehicleResponse = (vehicleDoc) => {
  const vehicle = vehicleDoc?.toObject ? vehicleDoc.toObject() : vehicleDoc;

  return {
    ...vehicle,
    title: vehicle.title || vehicle.name,
    vehicleType: vehicle.vehicleType || vehicle.type,
    fuelType: vehicle.fuelType || vehicle.fuel,
    seatCapacity: vehicle.seatCapacity ?? vehicle.seats,
    vendorName: vehicle.vendor?.name || "",
  };
};

const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffMs = end - start;

  if (!Number.isFinite(start) || !Number.isFinite(end) || diffMs <= 0) return 0;
  return Math.ceil(diffMs / DAY_IN_MS);
};

export const getAdminSummary = async (req, res) => {
  try {
    const [usersCount, vehiclesCount, bookingsCount, paidTotals, documentsAggregate] = await Promise.all([
      userModel.countDocuments(),
      vehicleModel.countDocuments(),
      bookingModel.countDocuments(),
      bookingModel.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
      ]),
      userModel.aggregate([
        {
          $project: {
            documentsCount: {
              $cond: [{ $isArray: "$documents" }, { $size: "$documents" }, 0],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: "$documentsCount" },
          },
        },
      ]),
    ]);

    const totalRevenue = paidTotals[0]?.totalRevenue || 0;
    const totalDocuments = documentsAggregate[0]?.totalDocuments || 0;

    return res.json({
      success: true,
      summary: {
        usersCount,
        vehiclesCount,
        bookingsCount,
        totalRevenue,
        totalDocuments,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminReports = async (req, res) => {
  try {
    const now = new Date();
    const monthWindowDefault = 6;

    const selectedStartDate = String(req.query?.startDate || "").trim();
    const selectedEndDate = String(req.query?.endDate || "").trim();

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    let rangeMode = "default";
    let rangeStart = null;
    let rangeEnd = null;

    if (selectedStartDate || selectedEndDate) {
      if (selectedStartDate && !datePattern.test(selectedStartDate)) {
        return res.json({ success: false, message: "Invalid start date format. Use YYYY-MM-DD." });
      }

      if (selectedEndDate && !datePattern.test(selectedEndDate)) {
        return res.json({ success: false, message: "Invalid end date format. Use YYYY-MM-DD." });
      }

      const effectiveStart = selectedStartDate || selectedEndDate;
      const effectiveEnd = selectedEndDate || selectedStartDate;

      rangeStart = new Date(`${effectiveStart}T00:00:00.000Z`);
      rangeEnd = new Date(`${effectiveEnd}T23:59:59.999Z`);

      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return res.json({ success: false, message: "Invalid date range." });
      }

      if (rangeStart.getTime() > rangeEnd.getTime()) {
        return res.json({ success: false, message: "Start date must be before end date." });
      }

      rangeMode = "custom";
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthWindowDefault - 1), 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const bookingDateMatch = {
      createdAt: {
        $gte: rangeStart,
        $lte: rangeEnd,
      },
    };

    const monthSpan = (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12 + (rangeEnd.getMonth() - rangeStart.getMonth()) + 1;
    const monthWindow = Math.max(1, Math.min(monthSpan, 24));

    const [
      bookingStatusRaw,
      paymentStatusRaw,
      userRolesRaw,
      accountStatusRaw,
      paidRevenueByMonthRaw,
      recentPaidBookings,
    ] = await Promise.all([
      bookingModel.aggregate([
        { $match: bookingDateMatch },
        {
          $project: {
            normalizedStatus: { $toLower: "$status" },
          },
        },
        {
          $group: {
            _id: "$normalizedStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      bookingModel.aggregate([
        { $match: bookingDateMatch },
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      userModel.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),
      userModel.aggregate([
        {
          $group: {
            _id: "$accountStatus",
            count: { $sum: 1 },
          },
        },
      ]),
      bookingModel.aggregate([
        {
          $match: {
            ...bookingDateMatch,
            paymentStatus: "Paid",
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: "$totalPrice" },
            paidBookings: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),
      bookingModel
        .find({
          paymentStatus: "Paid",
          ...bookingDateMatch,
        })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("customer", "name")
        .populate("vehicle", "title name"),
    ]);

    const bookingStatus = {
      pendingPayment: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      pending: 0,
    };

    bookingStatusRaw.forEach((item) => {
      const status = String(item?._id || "").toLowerCase();
      const count = Number(item?.count || 0);

      if (status === "pending_payment") bookingStatus.pendingPayment += count;
      else if (status === "confirmed") bookingStatus.confirmed += count;
      else if (status === "cancelled") bookingStatus.cancelled += count;
      else if (status === "completed") bookingStatus.completed += count;
      else if (status === "pending") bookingStatus.pending += count;
    });

    const paymentStatus = {
      paid: 0,
      unpaid: 0,
      refunded: 0,
    };

    paymentStatusRaw.forEach((item) => {
      const status = String(item?._id || "").toLowerCase();
      const count = Number(item?.count || 0);

      if (status === "paid") paymentStatus.paid += count;
      else if (status === "unpaid") paymentStatus.unpaid += count;
      else if (status === "refunded") paymentStatus.refunded += count;
    });

    const usersByRole = {
      Customer: 0,
      Vendor: 0,
      Admin: 0,
    };

    userRolesRaw.forEach((item) => {
      const role = normalizeRole(item?._id);
      if (role && usersByRole[role] !== undefined) {
        usersByRole[role] = Number(item?.count || 0);
      }
    });

    const usersByAccountStatus = {
      active: 0,
      suspended: 0,
      blocked: 0,
    };

    accountStatusRaw.forEach((item) => {
      const status = String(item?._id || "").toLowerCase();
      if (usersByAccountStatus[status] !== undefined) {
        usersByAccountStatus[status] = Number(item?.count || 0);
      }
    });

    const paidRevenueByMonth = [];
    for (let i = 0; i < monthWindow; i += 1) {
      const monthDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;

      const found = paidRevenueByMonthRaw.find(
        (item) => Number(item?._id?.year) === year && Number(item?._id?.month) === month
      );

      paidRevenueByMonth.push({
        key: `${year}-${String(month).padStart(2, "0")}`,
        label: monthDate.toLocaleString("en-US", { month: "short" }),
        totalRevenue: Number(found?.totalRevenue || 0),
        paidBookings: Number(found?.paidBookings || 0),
      });
    }

    const latestPaidPayments = recentPaidBookings.map((booking) => ({
      bookingId: booking._id,
      customerName: booking.customer?.name || "Unknown",
      vehicleTitle: booking.vehicle?.title || booking.vehicle?.name || "Vehicle",
      amount: Number(booking.totalPrice || 0),
      paidAt: booking.createdAt,
      paymentMethod: booking.paymentMethod || "",
    }));

    return res.json({
      success: true,
      reports: {
        generatedAt: now,
        reportRange: {
          mode: rangeMode,
          startDate: rangeStart,
          endDate: rangeEnd,
        },
        bookingStatus,
        paymentStatus,
        usersByRole,
        usersByAccountStatus,
        paidRevenueByMonth,
        latestPaidPayments,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select("-password -verifyOtp -resetOtp")
      .sort({ _id: -1 });

    return res.json({
      success: true,
      count: users.length,
      users: users.map(toSafeUser),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { name, phone, role, verificationNote } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();

    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        return res.json({ success: false, message: "Invalid user role" });
      }
      updates.role = normalizedRole;
    }

    if (verificationNote !== undefined) {
      updates.verificationNote = String(verificationNote || "").trim();
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
      .select("-password -verifyOtp -resetOtp");

    if (!updatedUser) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "User updated", user: toSafeUser(updatedUser) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (String(req.user?._id) === String(userId)) {
      return res.json({ success: false, message: "Admin cannot delete own account" });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const vendorVehicles = await vehicleModel.find({ vendor: userId }).select("_id");
    const vendorVehicleIds = vendorVehicles.map((vehicle) => vehicle._id);

    if (vendorVehicleIds.length > 0) {
      await bookingModel.deleteMany({ vehicle: { $in: vendorVehicleIds } });
      await vehicleModel.deleteMany({ vendor: userId });
    }

    await bookingModel.deleteMany({ customer: userId });
    await user.deleteOne();

    return res.json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminVehicles = async (req, res) => {
  try {
    const vehicles = await vehicleModel
      .find()
      .select("title name model seatCapacity seats vehicleType type fuelType fuel pricePerDay speed registrationNumber ratingAverage ratingCount vendor createdAt updatedAt")
      .sort({ createdAt: -1 })
      .populate("vendor", "name email phone role")
      .lean();

    return res.json({
      success: true,
      count: vehicles.length,
      vehicles: vehicles.map(toVehicleResponse),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const deleteAdminVehicle = async (req, res) => {
  try {
    const vehicle = await vehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.json({ success: false, message: "Vehicle not found" });
    }

    await bookingModel.deleteMany({ vehicle: vehicle._id });
    await vehicle.deleteOne();

    return res.json({ success: true, message: "Vehicle deleted" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminPayments = async (req, res) => {
  try {
    const bookings = await bookingModel
      .find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email phone")
      .populate({
        path: "vehicle",
        select: "title name vendor pricePerDay",
        populate: { path: "vendor", select: "name email" },
      });

    const payments = bookings.map((booking) => {
      const paymentStatus = normalizePaymentStatus(booking.paymentStatus) || "Unpaid";
      const vehicleTitle = booking.vehicle?.title || booking.vehicle?.name || "Unknown Vehicle";
      const totalDays = Number(booking.totalDays) > 0
        ? Number(booking.totalDays)
        : calculateTotalDays(booking.startDate, booking.endDate);

      return {
        _id: booking._id,
        bookingId: booking._id,
        bookingStatus: booking.status,
        paymentStatus,
        paymentMethod: booking.paymentMethod || "",
        amount: booking.totalPrice,
        totalDays,
        startDate: booking.startDate,
        endDate: booking.endDate,
        customer: booking.customer,
        vehicle: {
          _id: booking.vehicle?._id,
          title: vehicleTitle,
          pricePerDay: booking.vehicle?.pricePerDay || 0,
          vendor: booking.vehicle?.vendor || null,
        },
      };
    });

    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateAdminPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;

    const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
    if (!normalizedPaymentStatus) {
      return res.json({ success: false, message: "Invalid payment status" });
    }

    const updates = {
      paymentStatus: normalizedPaymentStatus,
    };

    if (paymentMethod !== undefined) {
      updates.paymentMethod = String(paymentMethod || "").trim();
    }

    const booking = await bookingModel.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    return res.json({
      success: true,
      message: "Payment status updated",
      payment: {
        _id: booking._id,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminDocuments = async (req, res) => {
  try {
    const users = await userModel
      .find({ "documents.0": { $exists: true } })
      .select("name email phone documents")
      .sort({ _id: -1 });

    const documents = users.flatMap((user) =>
      (user.documents || []).map((document) => ({
        _id: document._id,
        title: document.title,
        url: document.url,
        status: document.status,
        note: document.note || "",
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      }))
    );

    return res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const addAdminUserDocument = async (req, res) => {
  try {
    const { title, url, status, note } = req.body;

    const normalizedTitle = String(title || "").trim();
    const normalizedUrl = String(url || "").trim();
    const normalizedStatus = status ? normalizeDocumentStatus(status) : "Pending";

    if (!normalizedTitle || !normalizedUrl) {
      return res.json({ success: false, message: "Document title and url are required" });
    }

    if (status && !normalizedStatus) {
      return res.json({ success: false, message: "Invalid document status" });
    }

    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    user.documents.push({
      title: normalizedTitle,
      url: normalizedUrl,
      status: normalizedStatus,
      note: String(note || "").trim(),
    });

    syncUserVerificationState(user);
    user.verificationReviewedAt = normalizedStatus === "Pending" ? null : new Date();

    await user.save();

    const document = user.documents[user.documents.length - 1];

    return res.json({
      success: true,
      message: "Document added",
      document,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateAdminUserDocument = async (req, res) => {
  try {
    const { userId, documentId } = req.params;
    const { title, url, status, note } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const document = user.documents.id(documentId);
    if (!document) {
      return res.json({ success: false, message: "Document not found" });
    }

    if (title !== undefined) {
      document.title = String(title || "").trim() || document.title;
    }

    if (url !== undefined) {
      document.url = String(url || "").trim() || document.url;
    }

    if (status !== undefined) {
      const normalizedStatus = normalizeDocumentStatus(status);
      if (!normalizedStatus) {
        return res.json({ success: false, message: "Invalid document status" });
      }
      document.status = normalizedStatus;
    }

    if (note !== undefined) {
      document.note = String(note || "").trim();
    }

    syncUserVerificationState(user);
    user.verificationNote = document.note || user.verificationNote || "";
    user.verificationReviewedAt = document.status === "Pending" ? null : new Date();

    await user.save();

    return res.json({ success: true, message: "Document updated", document });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateUserVerification = async (req, res) => {
  try {
    const { verificationStatus, verificationNote, shouldAllowAccess } = req.body;
    const userId = req.params.id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Validate verification status
    const validStatuses = ["UnderReview", "Approved", "Rejected"];
    if (verificationStatus && !validStatuses.includes(verificationStatus)) {
      return res.json({ success: false, message: "Invalid verification status" });
    }

    // When admin explicitly sets a status, preserve it (don't auto-sync)
    if (verificationStatus !== undefined) {
      user.verificationStatus = verificationStatus;
      user.verificationReviewedAt = new Date();
      
      // Set isVerified based on the explicit status
      if (verificationStatus === "Approved") {
        user.isVerified = true;
      } else {
        user.isVerified = false;
      }
    }

    if (verificationNote !== undefined) {
      user.verificationNote = String(verificationNote || "").trim();
    }

    // Handle service access control
    // If shouldAllowAccess is false, block access regardless of verification status
    // If shouldAllowAccess is true, only allow if verification is Approved
    if (shouldAllowAccess === false) {
      user.isVerified = false;
    } else if (shouldAllowAccess === true && verificationStatus === "Approved") {
      user.isVerified = true;
    }

    // DO NOT call syncUserVerificationState - preserve admin's explicit choice
    await user.save();

    if (verificationStatus === "Approved" || verificationStatus === "Rejected") {
      try {
        await sendVerificationStatusUpdateEmail({
          email: user.email,
          name: user.name,
          status: verificationStatus,
          note: user.verificationNote || "",
        });
      } catch (emailError) {
        console.error("[verification-email] Failed to send status update email:", emailError.message);
      }
    }

    const updatedUser = await userModel.findById(userId).select("-password -verifyOtp -resetOtp");

    return res.json({
      success: true,
      message: "User verification updated",
      user: toSafeUser(updatedUser),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateUserAccountStatus = async (req, res) => {
  try {
    const accountStatus = String(req.body?.accountStatus || "").trim().toLowerCase();
    const userId = req.params.id;

    const validStatuses = ["active", "suspended", "blocked"];
    if (!validStatuses.includes(accountStatus)) {
      return res.json({ success: false, message: "Invalid account status" });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    user.accountStatus = accountStatus;

    if (accountStatus === "blocked" || accountStatus === "suspended") {
      user.isVerified = false;
    } else if (user.verificationStatus === "Approved") {
      user.isVerified = true;
    }

    await user.save();

    const updatedUser = await userModel.findById(userId).select("-password -verifyOtp -resetOtp");

    return res.json({
      success: true,
      message: "User account status updated",
      user: toSafeUser(updatedUser),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAdminFeedbackMessages = async (req, res) => {
  try {
    const feedback = await feedbackModel
      .find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email phone role");

    return res.json({
      success: true,
      count: feedback.length,
      feedback: feedback.map((item) => ({
        _id: item._id,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        subject: item.subject,
        message: item.message,
        createdAt: item.createdAt,
        customer: item.customer || null,
      })),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};