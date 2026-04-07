export const getWelcomeEmailTemplate = ({ name, email }) => ({
  subject: "Welcome to NepRide",
  text: `Hello ${name}, welcome to NepRide! Your account with ${email} has been created successfully.`,
  html: `<p>Hello <strong>${name}</strong>,</p><p>Welcome to NepRide. Your account with <strong>${email}</strong> has been created successfully.</p>`,
});

export const getAccountVerificationOtpTemplate = ({ otp }) => ({
  subject: "NepRide Account Verification OTP",
  text: `Your account verification OTP is ${otp}. It will expire in 1 hour.`,
  html: `<p>Your account verification OTP is <strong>${otp}</strong>.</p><p>This OTP will expire in 1 hour.</p>`,
});

export const getPasswordResetOtpTemplate = ({ otp }) => ({
  subject: "NepRide Password Reset OTP",
  text: `Your password reset OTP is ${otp}. It will expire in 15 minutes.`,
  html: `<p>Your password reset OTP is <strong>${otp}</strong>.</p><p>This OTP will expire in 15 minutes.</p>`,
});

export const getDocumentSubmittedEmailTemplate = ({ name }) => ({
  subject: "Document Submitted Successfully",
  text: `Hello ${name || "there"}, your documents have been received and are currently under review. Status: Under Review. Next steps: our admin team will verify your documents soon and notify you once verification is completed.`,
  html: `<p>Hello <strong>${name || "there"}</strong>,</p><p>Your documents have been received and are currently under review.</p><p><strong>Status:</strong> Under Review</p><p><strong>Next steps:</strong> Our admin team will verify your documents soon and notify you once verification is completed.</p>`,
});

export const getVerificationStatusUpdateEmailTemplate = ({ name, status, note }) => {
  const normalizedStatus = status === "Approved" ? "Approved" : "Rejected";
  const subject = `Verification ${normalizedStatus}`;
  const nextSteps =
    normalizedStatus === "Approved"
      ? "Your verification has been approved. You can continue using the service with full access."
      : "Your verification was not approved. Please review the feedback and submit updated documents if needed.";

  return {
    subject,
    text: `Hello ${name || "there"}, your verification status has been updated to ${normalizedStatus}. ${nextSteps}${note ? ` Admin note: ${note}` : ""}`,
    html: `<p>Hello <strong>${name || "there"}</strong>,</p><p>Your verification status has been updated to <strong>${normalizedStatus}</strong>.</p><p>${nextSteps}</p>${note ? `<p><strong>Admin note:</strong> ${note}</p>` : ""}`,
  };
};
