import { getAuth } from 'firebase/auth';
import { app } from '@/config/firebaseConfig';

// Initialize Authentication
export const auth = getAuth(app);
