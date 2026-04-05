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
