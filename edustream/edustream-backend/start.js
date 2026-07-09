import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All our microservices
const services = [
  { name: 'Gateway', path: 'gateway/src/index.js', port: process.env.PORT || 5000 },
  { name: 'Auth', path: 'services/auth-service/src/index.js', port: 5001 },
  { name: 'User', path: 'services/user-service/src/index.js', port: 5002 },
  { name: 'Course', path: 'services/course-service/src/index.js', port: 5003 },
  { name: 'Media', path: 'services/media-service/src/index.js', port: 5004 },
  { name: 'Payment', path: 'services/payment-service/src/index.js', port: 5005 },
  { name: 'Notification', path: 'services/notification-service/src/index.js', port: 5006 },
  { name: 'Review', path: 'services/review-service/src/index.js', port: 5007 },
  { name: 'Search', path: 'services/search-service/src/index.js', port: 5008 },
];

console.log('🚀 Starting EduStream Microservices cluster for Render...');

services.forEach(service => {
  const servicePath = path.join(__dirname, service.path);
  
  // Inject the specific port for this service, overriding any environment PORT
  // Except for the Gateway, which MUST use Render's provided PORT
  const env = Object.assign({}, process.env);
  
  if (service.name === 'Gateway') {
      env.PORT = process.env.PORT || 5000;
      env.GATEWAY_PORT = env.PORT;
  } else {
      env.PORT = service.port;
      // Also override the service port variables so they listen on the right port
      env[`${service.name.toUpperCase()}_SERVICE_PORT`] = service.port;
  }

  // Force inter-service communication to use 127.0.0.1 since they are all in one container
  // This avoids Node.js IPv6 '::1' resolution issues which can cause 503 connection refused
  env.AUTH_SERVICE_URL = 'http://127.0.0.1:5001';
  env.USER_SERVICE_URL = 'http://127.0.0.1:5002';
  env.COURSE_SERVICE_URL = 'http://127.0.0.1:5003';
  env.MEDIA_SERVICE_URL = 'http://127.0.0.1:5004';
  env.PAYMENT_SERVICE_URL = 'http://127.0.0.1:5005';
  env.NOTIFICATION_SERVICE_URL = 'http://127.0.0.1:5006';
  env.REVIEW_SERVICE_URL = 'http://127.0.0.1:5007';
  env.SEARCH_SERVICE_URL = 'http://127.0.0.1:5008';

  // Pass --max-old-space-size=45 to strictly limit memory per process to 45MB
  // This prevents Railway's 500MB free tier container from OOM crashing
  const child = spawn('node', ['--max-old-space-size=45', servicePath], { env });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${service.name}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${service.name} ERROR] ${data}`);
  });

  child.on('close', (code) => {
    console.log(`❌ [${service.name}] Exited with code ${code}`);
  });
});
