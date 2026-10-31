const base = process.env.BASE_URL || 'http://localhost:5000';
const services = [
  `${base}/health`,                        // Gateway / Monolith
  `${base}/api/auth/health`,               // Auth Service
  `${base}/api/users/health`,              // User Service
  `${base}/api/courses/health`,            // Course Service
  `${base}/api/media/health`,              // Media Service
  `${base}/api/payments/health`,           // Payment Service
  `${base}/api/notifications/health`,      // Notification Service
  `${base}/api/reviews/health`,            // Review Service
  `${base}/api/search/health`,             // Search Service
];

async function checkHealth() {
  console.log('Checking health endpoints...');
  for (const url of services) {
    try {
      const res = await fetch(url);
      console.log(`✅ ${url}: ${res.status} OK`);
    } catch (err) {
      console.log(`❌ ${url}: ERROR - ${err.message}`);
    }
  }
}

checkHealth();
