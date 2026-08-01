const services = [
  'http://localhost:5000/health', // Gateway
  'http://localhost:5001/api/auth/health', // Auth
  'http://localhost:5002/api/users/health', // User
  'http://localhost:5003/api/courses/health', // Course
  'http://localhost:5004/api/media/health', // Media
  'http://localhost:5005/api/payments/health', // Payment
  'http://localhost:5006/api/notifications/health', // Notification
  'http://localhost:5007/api/reviews/health', // Review
  'http://localhost:5008/api/search/health', // Search
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
