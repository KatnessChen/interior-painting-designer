import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../config/firebaseConfig';
import { ImageData } from '../types';

// Initialize Firestore and Storage with the shared Firebase app instance
export const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Creates a new image document in Firestore with uploaded storage information.
 * This function handles the entire workflow:
 * 1. Upload the image file to Firebase Storage
 * 2. Obtain the storageUrl and storagePath
 * 3. Create the image document in Firestore
 *
 * @param userId The ID of the user uploading the image.
 * @param imageFile The image file to upload (Blob or File).
 * @param imageMetadata Basic metadata: id, name, mimeType.
 * @returns The newly created ImageData object for local state use.
 */
export async function createImage(
  userId: string,
  imageFile: Blob | File,
  imageMetadata: Pick<ImageData, 'id' | 'name' | 'mimeType'>
): Promise<ImageData> {
  if (!userId) {
    throw new Error('User ID is required to add an image.');
  }

  try {
    // Step 1: Upload the image file to Firebase Storage
    console.log('Uploading image to Firebase Storage...');
    let extension = 'jpg';
    if (imageFile.type) {
      extension = imageFile.type.split('/')[1] || 'jpg';
    } else if (imageFile instanceof File) {
      const parts = imageFile.name.split('.');
      extension = parts[parts.length - 1] || 'jpg';
    }

    const storagePath = `users/${userId}/images/${imageMetadata.id}.${extension}`;
    const storageRef = ref(storage, storagePath);

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, imageFile);
    console.log('Image uploaded to Firebase Storage:', storagePath);

    // Get the download URL
    const storageUrl = await getDownloadURL(storageRef);
    console.log('Image download URL obtained:', storageUrl);

    // Step 2: Create the image document in Firestore with storage information
    const now = new Date();
    const newImageData: ImageData = {
      ...imageMetadata,
      roomId: null,
      evolutionChain: [],
      parentImageId: null,
      storageUrl,
      storagePath,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

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
    console.error('Failed to add image:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to add image: ${error.message}`);
    }
    throw new Error('Failed to add image to Firebase.');
  }
}

/**
 * Fetches all images from Firestore for a specific user.
 * Converts Firestore Timestamps back to Date objects.
 *
 * @param userId The ID of the user whose images to fetch.
 * @returns An array of ImageData objects.
 */
export async function fetchUserImages(userId: string): Promise<ImageData[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch images.');
  }

  try {
    console.log('Fetching images from Firestore for user:', userId);

    // Create a reference to the images subcollection
    const imagesRef = collection(db, 'users', userId, 'images');

    // Query for non-deleted images
    const q = query(imagesRef, where('isDeleted', '==', false));

    // Execute the query
    const querySnapshot = await getDocs(q);

    // Convert Firestore documents to ImageData objects
    const images: ImageData[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        storageUrl: data.storageUrl,
        storagePath: data.storagePath,
        roomId: data.roomId || null,
        evolutionChain: data.evolutionChain || [],
        parentImageId: data.parentImageId || null,
        isDeleted: data.isDeleted || false,
        deletedAt: data.deletedAt ? (data.deletedAt as Timestamp).toDate() : null,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      };
    });

    console.log('Images fetched from Firestore:', images.length);
    return images;
  } catch (error) {
    console.error('Failed to fetch images:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }
    throw new Error('Failed to fetch images from Firebase.');
  }
}
