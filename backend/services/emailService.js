import mailer from "../config/mailer.js";
import {
  getDocumentSubmittedEmailTemplate,
  getAccountVerificationOtpTemplate,
  getPasswordResetOtpTemplate,
  getVerificationStatusUpdateEmailTemplate,
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

export const sendDocumentSubmittedEmail = async ({ email, name }) => {
  const template = getDocumentSubmittedEmailTemplate({ name });
  await sendEmail({
    to: email,
    ...template,
  });
};

export const sendVerificationStatusUpdateEmail = async ({ email, name, status, note }) => {
  const template = getVerificationStatusUpdateEmailTemplate({ name, status, note });
  await sendEmail({
    to: email,
    ...template,
  });
};
