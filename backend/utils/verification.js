const ROLE_REQUIREMENT_KEYS = {
  Customer: ["driving_license", "citizenship_front", "citizenship_back"],
  Vendor: ["bluebook", "citizenship_front", "citizenship_back"],
  Admin: [],
};

const KEY_TO_TITLE = {
  driving_license: "Driving License",
  citizenship_front: "Citizenship / Nagarikta (Front Side)",
  citizenship_back: "Citizenship / Nagarikta (Back Side)",
  bluebook: "Bluebook",
};

const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();

  if (normalized === "customer" || normalized === "costumer") return "Customer";
  if (normalized === "vendor") return "Vendor";
  if (normalized === "admin") return "Admin";

  return "Customer";
};

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

export const normalizeDocumentKey = (title) => {
  const normalized = normalizeText(title);
  const legacyLicensePattern = /drivinglicen[cs]e|licen[cs]e/;

  if (
    normalized.includes("citizenshipfront") ||
    normalized.includes("nagariktafront") ||
    normalized.includes("nagariktafr") ||
    normalized.includes("citizenshipf")
  ) {
    return "citizenship_front";
  }

  if (
    normalized.includes("citizenshipback") ||
    normalized.includes("nagariktaback") ||
    normalized.includes("nagariktab") ||
    normalized.includes("citizenshipb")
  ) {
    return "citizenship_back";
  }

  if (
    legacyLicensePattern.test(normalized) ||
    normalized.includes("license")
  ) {
    return "driving_license";
  }

  if (normalized.includes("bluebook") || normalized.includes("bluebok")) {
    return "bluebook";
  }

  if (
    normalized.includes("citizenship") ||
    normalized.includes("nagarikta") ||
    normalized.includes("nagari")
  ) {
    if (normalized.includes("back") || normalized.includes("rear") || normalized.includes("reverse")) {
      return "citizenship_back";
    }

    if (normalized.includes("front") || normalized.includes("face") || normalized.includes("obverse")) {
      return "citizenship_front";
    }

    return "citizenship_front";
  }

  return "";
};

const getDocumentsByKey = (documents = []) => {
  return documents.reduce((accumulator, doc) => {
    const key = normalizeDocumentKey(doc?.title);
    if (!key) return accumulator;

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(doc);
    return accumulator;
  }, {});
};

export const getRequiredDocumentKeys = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_REQUIREMENT_KEYS[normalizedRole] || ROLE_REQUIREMENT_KEYS.Customer;
};

export const getRequiredDocumentTitles = (role) => {
  return getRequiredDocumentKeys(role).map((key) => KEY_TO_TITLE[key]);
};

export const evaluateUserVerification = (user) => {
  const normalizedRole = normalizeRole(user?.role);
  const requiredKeys = getRequiredDocumentKeys(normalizedRole);

  if (normalizedRole === "Admin" || requiredKeys.length === 0) {
    return {
      role: normalizedRole,
      requiredDocuments: [],
      missingDocuments: [],
      pendingDocuments: [],
      rejectedDocuments: [],
      approvedDocuments: [],
      isApproved: true,
    };
  }

  const docsByKey = getDocumentsByKey(Array.isArray(user?.documents) ? user.documents : []);

  const missingDocuments = [];
  const pendingDocuments = [];
  const rejectedDocuments = [];
  const approvedDocuments = [];

  requiredKeys.forEach((key) => {
    const docs = docsByKey[key] || [];
    const latestDoc = docs[docs.length - 1];

    if (!latestDoc) {
      missingDocuments.push(KEY_TO_TITLE[key]);
      return;
    }

    if (latestDoc.status === "Approved") {
      approvedDocuments.push(KEY_TO_TITLE[key]);
      return;
    }

    if (latestDoc.status === "Rejected") {
      rejectedDocuments.push(KEY_TO_TITLE[key]);
      return;
    }

    pendingDocuments.push(KEY_TO_TITLE[key]);
  });

  const isApproved =
    missingDocuments.length === 0 && pendingDocuments.length === 0 && rejectedDocuments.length === 0;

  return {
    role: normalizedRole,
    requiredDocuments: requiredKeys.map((key) => KEY_TO_TITLE[key]),
    missingDocuments,
    pendingDocuments,
    rejectedDocuments,
    approvedDocuments,
    isApproved,
  };
};

export const getVerificationAccessPayload = (user) => {
  const verification = evaluateUserVerification(user);
  const isAdmin = normalizeRole(user?.role) === "Admin";
  const accountStatus = String(user?.accountStatus || "active").toLowerCase();
  const accountAllowsService = accountStatus !== "suspended" && accountStatus !== "blocked";

  let verificationStatus = "NotSubmitted";

  if (isAdmin || verification.isApproved) {
    verificationStatus = "Approved";
  } else if (verification.rejectedDocuments.length > 0) {
    verificationStatus = "Rejected";
  } else if (verification.missingDocuments.length === verification.requiredDocuments.length) {
    verificationStatus = "NotSubmitted";
  } else {
    verificationStatus = "UnderReview";
  }

  return {
    verificationStatus,
    isServiceAccessAllowed: accountAllowsService && (isAdmin || verification.isApproved),
    verification,
  };
};

export const syncUserVerificationState = (user) => {
  const { verification, isServiceAccessAllowed, verificationStatus } = getVerificationAccessPayload(user);

  if (verificationStatus === "Approved" && isServiceAccessAllowed) {
    user.verificationStatus = "Approved";
    user.isVerified = String(user?.accountStatus || "active").toLowerCase() !== "suspended";
    user.verificationReviewedAt = new Date();
    return;
  }

  if (verification.rejectedDocuments.length > 0) {
    user.verificationStatus = "Rejected";
    user.isVerified = false;
    user.verificationReviewedAt = new Date();
    return;
  }

  if (verification.missingDocuments.length === verification.requiredDocuments.length) {
    user.verificationStatus = "NotSubmitted";
    user.isVerified = false;
    return;
  }

  user.verificationStatus = "UnderReview";
  user.isVerified = false;
};

export { normalizeRole };
