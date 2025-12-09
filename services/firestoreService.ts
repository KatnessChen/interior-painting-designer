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
import { app } from '@/config/firebaseConfig';
import { ImageData, ImageOperation, Project, Space } from '@/types';
import { base64ToFile, FirestoreDataHandler } from '@/utils';

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
  projectId: string,
  spaceId: string,
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

    // For generating download URL
    const storageFilePath = `users/${userId}/projects/${projectId}/spaces/${spaceId}/images/${imageMetadata.id}.${extension}`;

    // The Firebase Storage File Path
    const storageRef = ref(storage, `users/${userId}/images/${imageMetadata.id}.${extension}`);

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, imageFile);
    console.log('Image uploaded to Firebase Storage:', storageFilePath);

    // Get the download URL
    const imageDownloadUrl = await getDownloadURL(storageRef);
    console.log('Image download URL obtained:', imageDownloadUrl);

    // Step 2: Create the image document in Firestore with storage information
    const now = new Date();
    const nowISOString = now.toISOString();
    const newImageData: ImageData = {
      ...imageMetadata,
      spaceId: null,
      evolutionChain: operation ? [operation] : [],
      parentImageId: parentImageId || null,
      imageDownloadUrl,
      storageFilePath,
      isDeleted: false,
      deletedAt: null,
      createdAt: nowISOString,
      updatedAt: nowISOString,
    };

    console.log({ newImageData });

    const batch = writeBatch(db);

    // Create the image document in the space's images subcollection
    const docRef = doc(
      db,
      'users',
      userId,
      'projects',
      projectId,
      'spaces',
      spaceId,
      'images',
      newImageData.id
    );

    // Convert Date objects to Firestore Timestamps for storage
    const firestoreData = {
      id: newImageData.id,
      name: newImageData.name,
      mimeType: newImageData.mimeType,
      imageDownloadUrl: newImageData.imageDownloadUrl,
      storageFilePath: newImageData.storageFilePath,
      spaceId: newImageData.spaceId || null,
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

    // Also update the project document's spaces array to include the new image in the denormalized images array
    const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
    const projectDoc = await getDoc(projectDocRef);

    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as Project;
      const updatedSpaces = (projectData.spaces || []).map((space: any) => {
        if (space.id === spaceId) {
          return {
            ...space,
            images: [...(space.images || []), firestoreData],
          };
        }
        return space;
      });

      batch.update(projectDocRef, { spaces: updatedSpaces });
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
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space.
 * @param base64 The base64-encoded processed image.
 * @param mimeType The MIME type of the image.
 * @param imageMetadata Basic metadata: id, name, mimeType.
 * @param parentImageId The ID of the original image that was processed.
 * @param operation The operation details to add to the evolution chain.
 * @returns The newly created ImageData object.
 */
export async function createProcessedImage(
  userId: string,
  projectId: string,
  spaceId: string,
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
      projectId,
      spaceId,
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
 * Creates a new project in Firestore for a user.
 *
 * @param userId The ID of the user.
 * @param projectName The name of the project.
 * @returns The newly created Project object.
 */
export async function createProject(userId: string, projectName: string): Promise<Project> {
  if (!userId) {
    throw new Error('User ID is required to create a home.');
  }

  if (!projectName.trim()) {
    throw new Error('Project name is required.');
  }

  try {
    const projectId = crypto.randomUUID();
    const now = new Date();
    const newProject: Project = {
      id: projectId,
      name: projectName.trim(),
      spaces: [],
      createdAt: now.toISOString(),
    };

    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await setDoc(docRef, {
      id: newProject.id,
      name: newProject.name,
      spaces: newProject.spaces,
      createdAt: Timestamp.fromDate(now),
    });

    console.log('Project created in Firestore:', projectId);
    return newProject;
  } catch (error) {
    console.error('Failed to create project:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
    throw new Error('Failed to create project in Firebase.');
  }
}

/**
 * Fetches all projects for a specific user from Firestore, including spaces and their images.ges.
 * Uses denormalized data from the project document's spaces array (only 1 Firestore read).
 *
 * @param userId The ID of the user.
 * @returns An array of Project objects with spaces and images populated.
 */
export async function fetchProjects(userId: string): Promise<Project[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch projects.');
  }

  try {
    console.log('Fetching projects with spaces and images from Firestore for user:', userId);

    const projectsRef = collection(db, 'users', userId, 'projects');
    const q = query(projectsRef, orderBy('createdAt', 'asc'));
    const projectsSnapshot = await getDocs(q);

    const projects: Project[] = projectsSnapshot.docs.map((projectDoc) => {
      const projectData = projectDoc.data();
      const projectName = projectData.name;

      // Use the denormalized spaces array from the project document
      // Convert spaces and their images from Firestore format to application format
      const spaces = (projectData.spaces || [])
        .map((space: any) => new FirestoreDataHandler(space).serializeTimestamps().value)
        // Sort spaces by createdAt in ascending order
        .sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      return {
        id: projectDoc.id,
        name: projectName,
        spaces,
        createdAt: (projectData.createdAt as Timestamp).toDate().toISOString(),
      } as any;
    });

    console.log(
      'Projects, spaces, and images fetched from Firestore:',
      projects.length,
      'projects'
    );
    return projects;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
    throw new Error('Failed to fetch projects from Firebase.');
  }
}

/**
 * Updates a project's name in Firestore.re.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project to update.
 * @param newName The new name for the project.
 */
export async function updateProject(
  userId: string,
  projectId: string,
  newName: string
): Promise<void> {
  console.log({ userId, projectId, newName });
  if (!userId) {
    throw new Error('User ID is required to update a project.');
  }

  if (!newName.trim()) {
    throw new Error('Project name cannot be empty.');
  }

  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await updateDoc(docRef, { name: newName.trim() });

    console.log('Project updated in Firestore:', projectId);
  } catch (error) {
    console.error('Failed to update project:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }
    throw new Error('Failed to update project in Firebase.');
  }
}

/**
 * Deletes a project and all its associated spaces from Firestore.ore.
 * Note: Images associated with the spaces will NOT be deleted.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project to delete.
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to delete a project.');
  }

  const projectRef = doc(db, 'users', userId, 'projects', projectId);

  try {
    // First, get the project document to check its spaces array.
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = projectDoc.data() as Project;

    // Check if the spaces array is empty.
    if (projectData.spaces && projectData.spaces.length > 0) {
      // If spaces exist, throw an error to prevent deletion.
      throw new Error(
        `Cannot delete "${projectData.name}" because it still contains spaces. Please delete all spaces first.`
      );
    }

    // If there are no spaces, proceed with deleting the project document.
    await deleteDoc(projectRef);

    console.log('Project deleted successfully:', projectId);
  } catch (error) {
    console.error('Failed to delete project:', error);
    // Re-throw the error so the UI can catch it and display a message.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while deleting the project.');
  }
}

/**
 * Creates a new space in a project.ect.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceName The name of the space.
 * @returns The newly created Space object.
 */
export async function createSpace(
  userId: string,
  projectId: string,
  spaceName: string
): Promise<Space> {
  if (!userId) {
    throw new Error('User ID is required to create a space.');
  }

  if (!spaceName.trim()) {
    throw new Error('Space name is required.');
  }

  try {
    const spaceId = crypto.randomUUID();
    const now = new Date();
    const newSpace: Space = {
      id: spaceId,
      projectId,
      name: spaceName.trim(),
      images: [],
      createdAt: now.toISOString(),
    };

    const batch = writeBatch(db);

    console.log({ spaceId });

    // Create the space document in the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    batch.set(spaceDocRef, {
      id: newSpace.id,
      projectId: newSpace.projectId,
      name: newSpace.name,
      images: newSpace.images,
      createdAt: Timestamp.fromDate(now),
    });

    // Update the project document to add the new space to its spaces array
    const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
    batch.update(projectDocRef, {
      spaces: arrayUnion({
        id: newSpace.id,
        projectId: newSpace.projectId,
        name: newSpace.name,
        images: newSpace.images,
        createdAt: Timestamp.fromDate(now),
      }),
    });

    await batch.commit();

    console.log('Space created in Firestore:', spaceId);
    return newSpace;
  } catch (error) {
    console.error('Failed to create space:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create space: ${error.message}`);
    }
    throw new Error('Failed to create space in Firebase.');
  }
}

/**
 * Updates a space's name in Firestore..
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space to update.
 * @param newName The new name for the space.
 */
export async function updateSpace(
  userId: string,
  projectId: string,
  spaceId: string,
  newName: string
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to update a space.');
  }

  if (!newName.trim()) {
    throw new Error('Space name cannot be empty.');
  }

  try {
    const batch = writeBatch(db);

    // Update the space document in the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    batch.update(spaceDocRef, { name: newName.trim() });

    // Update the project document's spaces array
    // First, get the project to find the old space object
    const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
    const projectDoc = await getDocs(collection(db, 'users', userId, 'projects')).then((snapshot) =>
      snapshot.docs.find((doc) => doc.id === projectId)
    );

    if (projectDoc) {
      const projectData = projectDoc.data();
      const updatedSpaces = (projectData.spaces || []).map((space: Space) =>
        space.id === spaceId ? { ...space, name: newName.trim() } : space
      );
      batch.update(projectDocRef, { spaces: updatedSpaces });
    }

    await batch.commit();

    console.log('Space updated in Firestore:', spaceId);
  } catch (error) {
    console.error('Failed to update space:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update space: ${error.message}`);
    }
    throw new Error('Failed to update space in Firebase.');
  }
}

/**
 * Deletes a space from Firestore..
 * Note: Images associated with the space will NOT be deleted.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space to delete.
 */
export async function deleteSpace(
  userId: string,
  projectId: string,
  spaceId: string
): Promise<void> {
  console.log({ userId, projectId, spaceId });
  if (!userId) {
    throw new Error('User ID is required to delete a space.');
  }
  if (!projectId) {
    throw new Error('Project ID is required to delete a space.');
  }

  try {
    const batch = writeBatch(db);

    // Delete the space document from the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    batch.delete(spaceDocRef);

    const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
    const projectDoc = await getDoc(projectDocRef);

    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as Project;
      const spaceToRemove = projectData.spaces.find((space) => space.id === spaceId);

      if (spaceToRemove) {
        batch.update(projectDocRef, {
          spaces: arrayRemove(spaceToRemove),
        });
      }
    }

    await batch.commit();

    console.log('Space deleted from Firestore:', spaceId);
  } catch (error) {
    console.error('Failed to delete space:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete space: ${error.message}`);
    }
    throw new Error('Failed to delete space from Firebase.');
  }
}
