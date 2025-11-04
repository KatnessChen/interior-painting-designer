import { getStorage } from 'firebase/storage';
import { app } from '../config/firebaseConfig';

// Initialize Firebase Storage with the shared Firebase app instance
export const storage = getStorage(app);
