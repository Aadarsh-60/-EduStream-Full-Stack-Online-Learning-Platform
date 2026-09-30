import { publishEvent } from '../../../../shared/utils/rabbitmq.js';

export const sendVerificationEmail = async (email, name, otp) => {
  await publishEvent('notification_events', 'email.send', {
    type: 'VERIFICATION_EMAIL',
    data: { email, name, otp }
  });
};

export const sendPasswordResetEmail = async (email, name, otp) => {
  await publishEvent('notification_events', 'email.send', {
    type: 'PASSWORD_RESET_EMAIL',
    data: { email, name, otp }
  });
};

export const sendContactAdminEmail = async (name, email, subject, message) => {
  await publishEvent('notification_events', 'email.send', {
    type: 'CONTACT_ADMIN_EMAIL',
    data: { name, email, subject, message }
  });
};

export const sendSecurityAlertEmail = async (email, name, alertData) => {
  await publishEvent('notification_events', 'email.send', {
    type: 'SECURITY_ALERT_EMAIL',
    data: { email, name, ...alertData }
  });
};

export const sendSessionRevocationEmail = async (email, name, otp) => {
  await publishEvent('notification_events', 'email.send', {
    type: 'SESSION_REVOKE_EMAIL',
    data: { email, name, otp }
  });
};

