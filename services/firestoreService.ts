import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  collection,
  query,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  orderBy,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../config/firebaseConfig';
import { ImageData, ImageOperation, Home, Room } from '../types';
import { base64ToFile, FirestoreDataHandler } from '../utils';

// Initialize Firestore and Storage with the shared Firebase app instance
export const db = getFirestore(app);
export const storage = getStorage(app);

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
 * @param parentImageId Optional parent image ID for processed images.
 * @param operation Optional operation to add to evolution chain.
 * @returns The newly created ImageData object for local state use.
 */
export async function createImage(
  userId: string,
  homeId: string,
  roomId: string,
  imageFile: Blob | File,
  imageMetadata: Pick<ImageData, 'id' | 'name' | 'mimeType'>,
  parentImageId?: string | null,
  operation?: ImageOperation | null
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

    const storagePath = `users/${userId}/homes/${homeId}/rooms/${roomId}/images/${imageMetadata.id}.${extension}`;
    const storageRef = ref(storage, `users/${userId}/images/${imageMetadata.id}.${extension}`);

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, imageFile);
    console.log('Image uploaded to Firebase Storage:', storagePath);

    // Get the download URL
    const storageUrl = await getDownloadURL(storageRef);
    console.log('Image download URL obtained:', storageUrl);

    // Step 2: Create the image document in Firestore with storage information
    const now = new Date();
    const nowISOString = now.toISOString();
    const newImageData: ImageData = {
      ...imageMetadata,
      roomId: null,
      evolutionChain: operation ? [operation] : [],
      parentImageId: parentImageId || null,
      storageUrl,
      storagePath,
      isDeleted: false,
      deletedAt: null,
      createdAt: nowISOString,
      updatedAt: nowISOString,
    };

    console.log({ newImageData });

    const batch = writeBatch(db);

    // Create the image document in the room's images subcollection
    const docRef = doc(
      db,
      'users',
      userId,
      'homes',
      homeId,
      'rooms',
      roomId,
      'images',
      newImageData.id
    );

    // Convert Date objects to Firestore Timestamps for storage
    const firestoreData = {
      id: newImageData.id,
      name: newImageData.name,
      mimeType: newImageData.mimeType,
      storageUrl: newImageData.storageUrl,
      storagePath: newImageData.storagePath,
      roomId: newImageData.roomId || null,
      parentImageId: newImageData.parentImageId || null,
      isDeleted: newImageData.isDeleted,
      deletedAt: newImageData.deletedAt || null,
      evolutionChain: operation
        ? [
            {
              ...operation,
              timestamp: Timestamp.fromDate(new Date(operation.timestamp)),
            },
          ]
        : [],
      createdAt: Timestamp.fromDate(new Date(newImageData.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(newImageData.updatedAt)),
    };

    batch.set(docRef, firestoreData);

    // Also update the home document's rooms array to include the new image in the denormalized images array
    const homeDocRef = doc(db, 'users', userId, 'homes', homeId);
    const homeDoc = await getDoc(homeDocRef);

    if (homeDoc.exists()) {
      const homeData = homeDoc.data() as Home;
      const updatedRooms = (homeData.rooms || []).map((room: any) => {
        if (room.id === roomId) {
          return {
            ...room,
            images: [...(room.images || []), firestoreData],
          };
        }
        return room;
      });

      batch.update(homeDocRef, { rooms: updatedRooms });
    }

    await batch.commit();
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
 * Creates a processed image in Firestore with parent image tracking and evolution chain.
 * This function converts base64 to File and delegates to createImage.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home.
 * @param roomId The ID of the room.
 * @param base64 The base64-encoded processed image.
 * @param mimeType The MIME type of the image.
 * @param imageMetadata Basic metadata: id, name, mimeType.
 * @param parentImageId The ID of the original image that was processed.
 * @param operation The operation details to add to the evolution chain.
 * @returns The newly created ImageData object.
 */
export async function createProcessedImage(
  userId: string,
  homeId: string,
  roomId: string,
  base64: string,
  mimeType: string,
  imageMetadata: Pick<ImageData, 'id' | 'name' | 'mimeType'>,
  parentImageId: string,
  operation: ImageOperation
): Promise<ImageData> {
  if (!userId) {
    throw new Error('User ID is required to create a processed image.');
  }

  try {
    // Convert base64 to File
    const filename = `${imageMetadata.id}.${mimeType.split('/')[1] || 'jpg'}`;
    const imageFile = base64ToFile(base64, mimeType, filename);

    console.log({ filename });

    // Delegate to createImage for uploading and storing
    return await createImage(
      userId,
      homeId,
      roomId,
      imageFile,
      imageMetadata,
      parentImageId,
      operation
    );
  } catch (error) {
    console.error('Failed to create processed image:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create processed image: ${error.message}`);
    }
    throw new Error('Failed to create processed image in Firebase.');
  }
}

/**
 * Soft deletes images by marking them as deleted in Firestore.
 * Keeps the image file in Firebase Storage for potential recovery or archival.
 *
 * @param userId The ID of the user.
 * @param imageIds The IDs of the images to delete.
 */
export async function deleteImages(userId: string, imageIds: string[]): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to delete images.');
  }

  if (imageIds.length === 0) {
    return;
  }

  try {
    console.log(`Soft deleting ${imageIds.length} images for user ${userId}`);

    // Mark each image as deleted in Firestore
    for (const imageId of imageIds) {
      try {
        const docRef = doc(db, 'users', userId, 'images', imageId);
        const now = new Date();

        // Update the document to mark it as deleted
        await updateDoc(docRef, {
          isDeleted: true,
          deletedAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        });

        console.log(`Soft deleted image: ${imageId}`);
      } catch (error) {
        console.error(`Failed to delete image ${imageId}:`, error);
        // Continue with next image even if one fails
      }
    }

    console.log(`Completed soft deletion of ${imageIds.length} images`);
  } catch (error) {
    console.error('Failed to delete images:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete images: ${error.message}`);
    }
    throw new Error('Failed to delete images from Firebase.');
  }
}

/**
 * Creates a new home in Firestore for a user.
 *
 * @param userId The ID of the user.
 * @param homeName The name of the home.
 * @returns The newly created Home object.
 */
export async function createHome(userId: string, homeName: string): Promise<Home> {
  if (!userId) {
    throw new Error('User ID is required to create a home.');
  }

  if (!homeName.trim()) {
    throw new Error('Home name is required.');
  }

  try {
    const homeId = crypto.randomUUID();
    const now = new Date();
    const newHome: Home = {
      id: homeId,
      name: homeName.trim(),
      rooms: [],
      createdAt: now.toISOString(),
    };

    const docRef = doc(db, 'users', userId, 'homes', homeId);
    await setDoc(docRef, {
      id: newHome.id,
      name: newHome.name,
      rooms: newHome.rooms,
      createdAt: Timestamp.fromDate(now),
    });

    console.log('Home created in Firestore:', homeId);
    return newHome;
  } catch (error) {
    console.error('Failed to create home:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create home: ${error.message}`);
    }
    throw new Error('Failed to create home in Firebase.');
  }
}

/**
 * Fetches all homes for a specific user from Firestore, including rooms and their images.
 * Uses denormalized data from the home document's rooms array (only 1 Firestore read).
 *
 * @param userId The ID of the user.
 * @returns An array of Home objects with rooms and images populated.
 */
export async function fetchHomes(userId: string): Promise<Home[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch homes.');
  }

  try {
    console.log('Fetching homes with rooms and images from Firestore for user:', userId);

    const homesRef = collection(db, 'users', userId, 'homes');
    const q = query(homesRef, orderBy('createdAt', 'asc'));
    const homesSnapshot = await getDocs(q);

    const homes: Home[] = homesSnapshot.docs.map((homeDoc) => {
      const homeData = homeDoc.data();
      const homeName = homeData.name;

      // Use the denormalized rooms array from the home document
      // Convert rooms and their images from Firestore format to application format
      const rooms = (homeData.rooms || [])
        .map((room: any) => new FirestoreDataHandler(room).serializeTimestamps().value)
        // Sort rooms by createdAt in ascending order
        .sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      return {
        id: homeDoc.id,
        name: homeName,
        rooms,
        createdAt: (homeData.createdAt as Timestamp).toDate().toISOString(),
      } as any;
    });

    console.log('Homes, rooms, and images fetched from Firestore:', homes.length, 'homes');
    return homes;
  } catch (error) {
    console.error('Failed to fetch homes:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch homes: ${error.message}`);
    }
    throw new Error('Failed to fetch homes from Firebase.');
  }
}

/**
 * Updates a home's name in Firestore.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home to update.
 * @param newName The new name for the home.
 */
export async function updateHome(userId: string, homeId: string, newName: string): Promise<void> {
  console.log({ userId, homeId, newName });
  if (!userId) {
    throw new Error('User ID is required to update a home.');
  }

  if (!newName.trim()) {
    throw new Error('Home name cannot be empty.');
  }

  try {
    const docRef = doc(db, 'users', userId, 'homes', homeId);
    await updateDoc(docRef, { name: newName.trim() });

    console.log('Home updated in Firestore:', homeId);
  } catch (error) {
    console.error('Failed to update home:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update home: ${error.message}`);
    }
    throw new Error('Failed to update home in Firebase.');
  }
}

/**
 * Deletes a home and all its associated rooms from Firestore.
 * Note: Images associated with the rooms will NOT be deleted.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home to delete.
 */
export async function deleteHome(userId: string, homeId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to delete a home.');
  }

  const homeRef = doc(db, 'users', userId, 'homes', homeId);

  try {
    // First, get the home document to check its rooms array.
    const homeDoc = await getDoc(homeRef);

    if (!homeDoc.exists()) {
      throw new Error('Home not found.');
    }

    const homeData = homeDoc.data() as Home;

    // Check if the rooms array is empty.
    if (homeData.rooms && homeData.rooms.length > 0) {
      // If rooms exist, throw an error to prevent deletion.
      throw new Error(
        `Cannot delete "${homeData.name}" because it still contains rooms. Please delete all rooms first.`
      );
    }

    // If there are no rooms, proceed with deleting the home document.
    await deleteDoc(homeRef);

    console.log('Home deleted successfully:', homeId);
  } catch (error) {
    console.error('Failed to delete home:', error);
    // Re-throw the error so the UI can catch it and display a message.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while deleting the home.');
  }
}

/**
 * Creates a new room in a home.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home.
 * @param roomName The name of the room.
 * @returns The newly created Room object.
 */
export async function createRoom(userId: string, homeId: string, roomName: string): Promise<Room> {
  if (!userId) {
    throw new Error('User ID is required to create a room.');
  }

  if (!roomName.trim()) {
    throw new Error('Room name is required.');
  }

  try {
    const roomId = crypto.randomUUID();
    const now = new Date();
    const newRoom: Room = {
      id: roomId,
      homeId,
      name: roomName.trim(),
      images: [],
      createdAt: now.toISOString(),
    };

    const batch = writeBatch(db);

    console.log({ roomId });

    // Create the room document in the subcollection
    const roomDocRef = doc(db, 'users', userId, 'homes', homeId, 'rooms', roomId);
    batch.set(roomDocRef, {
      id: newRoom.id,
      homeId: newRoom.homeId,
      name: newRoom.name,
      images: newRoom.images,
      createdAt: Timestamp.fromDate(now),
    });

    // Update the home document to add the new room to its rooms array
    const homeDocRef = doc(db, 'users', userId, 'homes', homeId);
    batch.update(homeDocRef, {
      rooms: arrayUnion({
        id: newRoom.id,
        homeId: newRoom.homeId,
        name: newRoom.name,
        images: newRoom.images,
        createdAt: Timestamp.fromDate(now),
      }),
    });

    await batch.commit();

    console.log('Room created in Firestore:', roomId);
    return newRoom;
  } catch (error) {
    console.error('Failed to create room:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }
    throw new Error('Failed to create room in Firebase.');
  }
}

/**
 * Fetches all rooms for a specific home.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home.
 * @returns An array of Room objects.
 */
/**
 * Updates a room's name in Firestore.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home.
 * @param roomId The ID of the room to update.
 * @param newName The new name for the room.
 */
export async function updateRoom(
  userId: string,
  homeId: string,
  roomId: string,
  newName: string
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to update a room.');
  }

  if (!newName.trim()) {
    throw new Error('Room name cannot be empty.');
  }

  try {
    const batch = writeBatch(db);

    // Update the room document in the subcollection
    const roomDocRef = doc(db, 'users', userId, 'homes', homeId, 'rooms', roomId);
    batch.update(roomDocRef, { name: newName.trim() });

    // Update the home document's rooms array
    // First, get the home to find the old room object
    const homeDocRef = doc(db, 'users', userId, 'homes', homeId);
    const homeDoc = await getDocs(collection(db, 'users', userId, 'homes')).then((snapshot) =>
      snapshot.docs.find((doc) => doc.id === homeId)
    );

    if (homeDoc) {
      const homeData = homeDoc.data();
      const updatedRooms = (homeData.rooms || []).map((room: Room) =>
        room.id === roomId ? { ...room, name: newName.trim() } : room
      );
      batch.update(homeDocRef, { rooms: updatedRooms });
    }

    await batch.commit();

    console.log('Room updated in Firestore:', roomId);
  } catch (error) {
    console.error('Failed to update room:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update room: ${error.message}`);
    }
    throw new Error('Failed to update room in Firebase.');
  }
}

/**
 * Deletes a room from Firestore.
 * Note: Images associated with the room will NOT be deleted.
 *
 * @param userId The ID of the user.
 * @param homeId The ID of the home.
 * @param roomId The ID of the room to delete.
 */
export async function deleteRoom(userId: string, homeId: string, roomId: string): Promise<void> {
  console.log({ userId, homeId, roomId });
  if (!userId) {
    throw new Error('User ID is required to delete a room.');
  }
  if (!homeId) {
    throw new Error('Home ID is required to delete a room.');
  }

  try {
    const batch = writeBatch(db);

    // Delete the room document from the subcollection
    const roomDocRef = doc(db, 'users', userId, 'homes', homeId, 'rooms', roomId);
    batch.delete(roomDocRef);

    const homeDocRef = doc(db, 'users', userId, 'homes', homeId);
    const homeDoc = await getDoc(homeDocRef);

    if (homeDoc.exists()) {
      const homeData = homeDoc.data() as Home;
      const roomToRemove = homeData.rooms.find((room) => room.id === roomId);

      if (roomToRemove) {
        batch.update(homeDocRef, {
          rooms: arrayRemove(roomToRemove),
        });
      }
    }

    await batch.commit();

    console.log('Room deleted from Firestore:', roomId);
  } catch (error) {
    console.error('Failed to delete room:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete room: ${error.message}`);
    }
    throw new Error('Failed to delete room from Firebase.');
  }
}
