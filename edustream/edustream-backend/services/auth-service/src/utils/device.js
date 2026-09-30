/**
 * Simple user-agent parser to extract device and browser name
 */
export const parseUserAgent = (userAgent = '') => {
  if (!userAgent) return 'Unknown Device';

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect OS
  if (/windows phone/i.test(userAgent)) os = 'Windows Phone';
  else if (/win(dows|98|nt|95)/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  // Detect Browser
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent) && !/opr|opera/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Safari';
  else if (/opr|opera/i.test(userAgent)) browser = 'Opera';

  return `${browser} on ${os}`;
};

/**
 * Get client IP address supporting reverse proxies (Cloudflare, Nginx, Render)
 */
export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};
