import nodemailer from "nodemailer";

/*
========================================
📧 EMAIL SERVICE
Reusable mailer — call sendEmail() from
any controller to send an email.
========================================
*/

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/*
  sendEmail({ to, subject, html })
  - to      : recipient email string
  - subject : email subject
  - html    : HTML body string
*/
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"CampusEventHub" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    // We don't throw — email failure should never break the main flow
  }
};

/*
========================================
🎨 SHARED LAYOUT HELPERS
========================================
*/
const emailHeader = `
  <div style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%);
              padding: 24px;
              text-align: center;
              border-radius: 8px 8px 0 0;">
    
    <img 
      src="https://res.cloudinary.com/drr9jcqaa/image/upload/f_auto,q_auto,w_80,h_80/fav_jqyclu"
      alt="CampusEventHub Logo"
      style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px;"
    />

    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-family: Arial, sans-serif;">
      CampusEventHub
    </h1>

    <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 12px; font-family: Arial, sans-serif;">
      Discover. Celebrate. Connect.
    </p>
  </div>
`;

const emailFooter = `
  <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px; text-align: center;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px; font-family: Arial, sans-serif;">
      © ${new Date().getFullYear()} CampusEventHub · All rights reserved
    </p>
    <p style="margin: 6px 0 0; color: #d1d5db; font-size: 12px; font-family: Arial, sans-serif;">
      You are receiving this email because you are registered on CampusEventHub.
    </p>
  </div>
`;

const emailWrapper = (content) => `
  <div style="background-color: #f3f4f6; padding: 32px 16px; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden;">
      ${emailHeader}
      <div style="padding: 32px;">
        ${content}
        ${emailFooter}
      </div>
    </div>
  </div>
`;

const primaryButton = (label, url) => `
  <a href="${url}"
    style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #1d4ed8, #2563eb); color: #ffffff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(37,99,235,0.35); letter-spacing: 0.3px;">
    ${label}
  </a>
`;

const alertBlock = (message, color, bg, border) => `
  <div style="background: ${bg}; border-left: 4px solid ${border}; padding: 14px 18px; border-radius: 6px; margin: 20px 0; color: ${color}; font-size: 14px; font-family: Arial, sans-serif;">
    ${message}
  </div>
`;

/*
========================================
📧 EMAIL TEMPLATES
========================================
*/
export const emailTemplates = {

  // ✅ Super Admin approves a college admin
  adminApproved: (name) => ({
    subject: "Your Admin Account Has Been Approved",
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}! 👋</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">Great news — your college admin account has been reviewed and <strong style="color: #16a34a;">approved</strong> by the Super Admin.</p>
      ${alertBlock(`✅ You can now log in and start creating and managing events for your college.`, "#15803d", "#f0fdf4", "#16a34a")}
      <p style="color: #475569; font-size: 14px;">Click below to get started:</p>
      ${primaryButton("Login to Dashboard", `${process.env.FRONTEND_URL}/login`)}
    `),
  }),

  // ❌ Super Admin rejects a college admin
  adminRejected: (name) => ({
    subject: "Your Admin Account Request Was Rejected",
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">Unfortunately, your college admin account request has been <strong style="color: #dc2626;">rejected</strong> by the Super Admin.</p>
      ${alertBlock(`❌ If you believe this is a mistake, please contact the platform administrator for further assistance.`, "#b91c1c", "#fef2f2", "#dc2626")}
      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Thank you for your interest in CampusEventHub.</p>
    `),
  }),

  // 📅 New event created — notify all users
  eventCreated: (name, eventTitle, eventId) => ({
    subject: `New Event: ${eventTitle}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}! 👋</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">A new event has just been published on CampusEventHub:</p>
      ${alertBlock(`📅 <strong>${eventTitle}</strong>`, "#1d4ed8", "#eff6ff", "#2563eb")}
      <p style="color: #475569; font-size: 14px;">Don't miss out — view the event details and register before spots fill up!</p>
      ${primaryButton("View Event", `${process.env.FRONTEND_URL}/events/${eventId}`)}
    `),
  }),

  // ✏️ Event updated — notify registered users
  eventUpdated: (name, eventTitle, eventId) => ({
    subject: `Event Updated: ${eventTitle}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}! 👋</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">An event you may be interested in has been updated:</p>
      ${alertBlock(`✏️ <strong>${eventTitle}</strong> — details have changed. Please review the latest information.`, "#92400e", "#fefce8", "#ca8a04")}
      <p style="color: #475569; font-size: 14px;">Click below to see what's new:</p>
      ${primaryButton("View Updated Event", `${process.env.FRONTEND_URL}/events/${eventId}`)}
    `),
  }),

  // 🗑️ Event deleted — notify registered users
  eventDeleted: (name, eventTitle) => ({
    subject: `Event Cancelled: ${eventTitle}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">We're sorry to let you know that the following event has been <strong style="color: #dc2626;">cancelled</strong>:</p>
      ${alertBlock(`🗑️ <strong>${eventTitle}</strong> has been removed from CampusEventHub.`, "#b91c1c", "#fef2f2", "#dc2626")}
      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">We apologize for any inconvenience. Keep an eye out for upcoming events on the platform.</p>
    `),
  }),

  // ✅ Student registration approved by admin
  eventRegistered: (name, eventTitle, eventId, registrationId) => ({
    subject: `Registration Approved - ${eventTitle}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Congratulations, ${name}! 🎉</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your registration for the following event has been <strong style="color: #16a34a;">approved</strong>:</p>
      ${alertBlock(`✅ <strong>${eventTitle}</strong> — You are now a confirmed participant!`, "#15803d", "#f0fdf4", "#16a34a")}
      <p style="color: #475569; font-size: 14px; margin-bottom: 4px;">Your entry ticket is ready. Show it at the venue entrance to get checked in:</p>
      ${primaryButton("🎫 View My Ticket", `${process.env.FRONTEND_URL}/ticket/${registrationId}`)}
      <p style="margin-top: 16px;">
        <a href="${process.env.FRONTEND_URL}/events/${eventId}" style="color: #2563eb; font-size: 13px; font-family: Arial, sans-serif; text-decoration: underline;">
          View event details
        </a>
      </p>
    `),
  }),

  // ❌ Student registration rejected by admin
  registrationRejected: (name, eventTitle, eventId) => ({
    subject: `Registration Rejected - ${eventTitle}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 6px; color: #1e293b; font-size: 20px;">Hello, ${name}</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">Unfortunately, your registration for the following event has been <strong style="color: #dc2626;">rejected</strong>:</p>
      ${alertBlock(`❌ <strong>${eventTitle}</strong> — Your registration was not approved this time.`, "#b91c1c", "#fef2f2", "#dc2626")}
      <p style="color: #475569; font-size: 14px;">If you believe this is a mistake, please contact the event organizer directly.</p>
      ${primaryButton("View Event", `${process.env.FRONTEND_URL}/events/${eventId}`)}
    `),
  }),

};