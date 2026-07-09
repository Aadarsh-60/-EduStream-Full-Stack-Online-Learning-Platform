import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Fix IPv6 issues on local machines (like Gemini had)
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname is .../edustream/services/auth-service/src/config
// We need to point to .../edustream/.env
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
