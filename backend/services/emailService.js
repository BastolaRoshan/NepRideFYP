import mailer from "../config/mailer.js";
import {
  getAccountVerificationOtpTemplate,
  getPasswordResetOtpTemplate,
  getWelcomeEmailTemplate,
} from "../utils/mailTemplates.js";

export const sendEmail = async ({ to, subject, text, html }) => {
  await mailer.sendMail({
    from: process.env.SENDER_EMAIL,
    to,
    subject,
    text,
    html,
  });
};

export const sendWelcomeEmail = async ({ email, name }) => {
  const template = getWelcomeEmailTemplate({ name, email });
  await sendEmail({
    to: email,
    ...template,
  });
};

export const sendVerificationOtpEmail = async ({ email, otp }) => {
  const template = getAccountVerificationOtpTemplate({ otp });
  await sendEmail({
    to: email,
    ...template,
  });
};

export const sendPasswordResetOtpEmail = async ({ email, otp }) => {
  const template = getPasswordResetOtpTemplate({ otp });
  await sendEmail({
    to: email,
    ...template,
  });
};
