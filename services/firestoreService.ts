import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '../config/firebaseConfig';
import { deprecatedImageData } from '../types';

// Initialize Firestore with the shared Firebase app instance
const db = getFirestore(app);

/**
 * Creates a new image document in Firestore.
 * Initially, storageUrl and storagePath are empty, as the file is not yet in Firebase Storage.
 *
 * @param userId The ID of the user uploading the image.
 * @param imageDataPartial Partial image data from the upload, must include id, name, and mimeType.
 * @returns The newly created deprecatedImageData object for local state use.
 */
export async function addImage(
  userId: string,
  imageDataPartial: Pick<deprecatedImageData, 'id' | 'name' | 'mimeType'>
): Promise<deprecatedImageData> {
  if (!userId) {
    throw new Error('User ID is required to add an image.');
  }

  const now = new Date();

  // Construct the full deprecatedImageData object for Firestore
  const newImageData: deprecatedImageData = {
    ...imageDataPartial,
    roomId: null,
    evolutionChain: [],
    parentImageId: null,
    storageUrl: '', // Placeholder, to be updated after storage upload
    storagePath: '', // Placeholder, to be updated after storage upload
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'users', userId, 'images', newImageData.id);

    // Convert Date objects to Firestore Timestamps for storage
    const firestoreData = {
      ...newImageData,
      createdAt: Timestamp.fromDate(newImageData.createdAt),
      updatedAt: Timestamp.fromDate(newImageData.updatedAt),
    };

    await setDoc(docRef, firestoreData);
    console.log('Image metadata document created in Firestore:', newImageData.id);

    // Return the object with standard Date objects for use in the local state
    return newImageData;
  } catch (error) {
    console.error('Failed to create image document in Firestore:', error);
    throw new Error('Failed to save image metadata to Firestore.');
  }
}
