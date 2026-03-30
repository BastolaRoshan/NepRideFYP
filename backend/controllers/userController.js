import userModel from "../models/userModel.js";
import {
  getRequiredDocumentTitles,
  getVerificationAccessPayload,
  normalizeRole,
  normalizeDocumentKey,
  syncUserVerificationState,
} from "../utils/verification.js";

const REQUIRED_TITLES_BY_KEY = {
  driving_licence: "Driving Licence",
  citizenship_front: "Citizenship / Nagarikta (Front Side)",
  citizenship_back: "Citizenship / Nagarikta (Back Side)",
  bluebook: "Bluebook",
};

const extractSubmissionEntries = (body = {}) => {
  const entries = [];

  const add = (title, url) => {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) return;
    entries.push({ title, url: normalizedUrl });
  };

  add("Driving Licence", body.drivingLicenceUrl || body.drivingLicenseUrl);
  add(
    "Citizenship / Nagarikta (Front Side)",
    body.citizenshipFrontUrl ||
      body.nagariktaFrontUrl ||
      body.citizenshipUrl ||
      body.nagariktaUrl ||
      body.nagariUrl
  );
  add("Citizenship / Nagarikta (Back Side)", body.citizenshipBackUrl || body.nagariktaBackUrl);
  add("Bluebook", body.bluebookUrl);

  if (Array.isArray(body.documents)) {
    body.documents.forEach((document) => {
      const title = String(document?.title || "").trim();
      const url = String(document?.url || "").trim();
      if (!title || !url) return;
      entries.push({ title, url });
    });
  }

  return entries;
};

const extractUploadedEntries = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return files
    .map((file) => {
      const key = normalizeDocumentKey(file?.fieldname);
      if (!key) return null;

      const relativeUrl = `/uploads/verification/${file.filename}`;

      return {
        title: REQUIRED_TITLES_BY_KEY[key] || file.fieldname,
        url: relativeUrl,
      };
    })
    .filter(Boolean);
};

const keepLatestRequiredDocuments = (documents = [], role) => {
  const requiredTitles = getRequiredDocumentTitles(role);

  const requiredByKey = requiredTitles.reduce((accumulator, title) => {
    const key = normalizeDocumentKey(title);
    if (key) accumulator[key] = title;
    return accumulator;
  }, {});

  const latestByKey = {};
  const preserved = [];

  documents.forEach((document) => {
    const key = normalizeDocumentKey(document?.title);
    if (!key || !requiredByKey[key]) {
      preserved.push(document);
      return;
    }

    latestByKey[key] = {
      title: requiredByKey[key],
      url: document.url,
      status: document.status || "Pending",
      note: document.note || "",
    };
  });

  Object.keys(requiredByKey).forEach((key) => {
    if (!latestByKey[key]) return;
    preserved.push(latestByKey[key]);
  });

  return preserved;
};

const buildVerificationResponse = (user) => {
  const { verification, verificationStatus, isServiceAccessAllowed } = getVerificationAccessPayload(user);

  return {
    role: normalizeRole(user.role),
    verificationStatus,
    isServiceAccessAllowed,
    requiredDocuments: verification.requiredDocuments,
    missingDocuments: verification.missingDocuments,
    pendingDocuments: verification.pendingDocuments,
    rejectedDocuments: verification.rejectedDocuments,
    approvedDocuments: verification.approvedDocuments,
    documents: user.documents || [],
    verificationNote: user.verificationNote || "",
    verificationSubmittedAt: user.verificationSubmittedAt,
    verificationReviewedAt: user.verificationReviewedAt,
  };
};

export const getAllUser = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.body?.userId;
    const user = await userModel.findById(userId).select(
      "name email phone role isVerified verificationStatus verificationNote verificationSubmittedAt verificationReviewedAt documents"
    );
    if (!user) {
      return res.json({
        success: false,
        message: "user not found",
      });
    }

    const verificationState = buildVerificationResponse(user);

    res.json({
      success: true,
      getAllUser: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: normalizeRole(user.role),
        isVerified: user.isVerified,
        ...verificationState,
      },
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.body?.userId;
    const user = await userModel.findById(userId).select(
      "role documents verificationStatus verificationNote verificationSubmittedAt verificationReviewedAt isVerified"
    );

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      verification: buildVerificationResponse(user),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const submitVerificationDocuments = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.body?.userId;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const role = normalizeRole(user.role);
    if (role === "Admin") {
      return res.json({ success: false, message: "Admin account does not require document verification" });
    }

    const uploadedEntries = extractUploadedEntries(req.files);
    const submittedUrlEntries = extractSubmissionEntries(req.body);
    const incomingEntries = [...submittedUrlEntries, ...uploadedEntries];

    if (incomingEntries.length === 0) {
      return res.json({ success: false, message: "Please upload required document files" });
    }

    const requiredTitles = getRequiredDocumentTitles(role);
    const allowedKeys = requiredTitles
      .map((title) => normalizeDocumentKey(title))
      .filter(Boolean);

    const nextDocuments = [];

    incomingEntries.forEach((entry) => {
      const key = normalizeDocumentKey(entry.title);
      if (!key || !allowedKeys.includes(key)) return;

      nextDocuments.push({
        title: REQUIRED_TITLES_BY_KEY[key] || entry.title,
        url: entry.url,
        status: "Pending",
        note: "",
      });
    });

    if (nextDocuments.length === 0) {
      return res.json({
        success: false,
        message: `Submitted documents do not match required ${role} documents`,
      });
    }

    const mergedDocuments = keepLatestRequiredDocuments([...(user.documents || []), ...nextDocuments], role);

    const mergedRequiredKeys = mergedDocuments
      .map((document) => normalizeDocumentKey(document?.title))
      .filter(Boolean);

    const missingRequiredTitles = requiredTitles.filter((title) => {
      const requiredKey = normalizeDocumentKey(title);
      return requiredKey && !mergedRequiredKeys.includes(requiredKey);
    });

    if (missingRequiredTitles.length > 0) {
      return res.json({
        success: false,
        message: `Please upload all required documents: ${missingRequiredTitles.join(", ")}`,
      });
    }

    user.documents = mergedDocuments;
    user.verificationSubmittedAt = new Date();
    user.verificationReviewedAt = null;
    user.verificationNote = "";
    user.verificationStatus = "UnderReview";
    user.isVerified = false;

    syncUserVerificationState(user);
    await user.save();

    return res.json({
      success: true,
      message: "Verification documents submitted successfully",
      verification: buildVerificationResponse(user),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

