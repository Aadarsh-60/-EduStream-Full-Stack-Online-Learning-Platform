import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"EduStream" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (email, name, otp) => {
  await sendEmail({
    to: email,
    subject: 'Verify your EduStream account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to EduStream, ${name}!</h2>
        <p>Your email verification code is:</p>
        <div style="background:#f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <strong style="font-size: 32px; letter-spacing: 4px; color: #4f46e5;">${otp}</strong>
        </div>
        <p>Enter this code on the verification page to activate your account.</p>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email, name, otp) => {
  await sendEmail({
    to: email,
    subject: 'Reset your EduStream password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${name}, reset your password</h2>
        <p>Your password reset code is:</p>
        <div style="background:#f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <strong style="font-size: 32px; letter-spacing: 4px; color: #ef4444;">${otp}</strong>
        </div>
        <p>Enter this code on the reset page to set a new password.</p>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
      </div>
    `,
  });
};

export const sendContactAdminEmail = async (name, email, subject, message) => {
  const adminEmail = process.env.SMTP_USER; // Send to the admin's configured email
  
  await sendEmail({
    to: adminEmail,
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">New Contact Request</h2>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">From:</strong> <span style="color: #4b5563;">${name}</span>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Email:</strong> <a href="mailto:${email}" style="color: #4f46e5;">${email}</a>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Subject:</strong> <span style="color: #4b5563;">${subject}</span>
        </div>
        
        <div style="margin-top: 24px;">
          <strong style="color: #374151;">Message:</strong>
          <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 8px; color: #4b5563; white-space: pre-wrap; font-family: inherit;">${message}</div>
        </div>
      </div>
    `,
  });
};
