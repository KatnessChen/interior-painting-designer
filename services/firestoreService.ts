import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  collection,
  collectionGroup,
  query,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  orderBy,
  where,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/config/firebaseConfig';
import { ImageData, ImageOperation, Project, Space, ProjectDocument, SpaceDocument } from '@/types';
import { base64ToFile, FirestoreDataHandler, cacheImageBase64s } from '@/utils';

// Initialize Firestore and Storage with the shared Firebase app instance
export const db = getFirestore(app);
export const storage = getStorage(app);

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
 * Fetches all projects for a specific user from Firestore.
 * Optimized to fetch all spaces in a single collectionGroup query (2 queries total instead of N+1).
 *
 * @param userId The ID of the user.
 * @returns An array of Project objects with spaces populated (but spaces have empty images arrays).
 */
export async function fetchProjects(userId: string): Promise<Project[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch projects.');
  }

  try {
    console.log('Fetching projects from Firestore for user:', userId);

    // Query 1: Fetch all projects for the user
    const projectsRef = collection(db, 'users', userId, 'projects');
    const projectsQuery = query(projectsRef, orderBy('createdAt', 'asc'));
    const projectsSnapshot = await getDocs(projectsQuery);

    // Query 2: Fetch all spaces for this user using collectionGroup (single query for all spaces)
    const spacesQuery = query(
      collectionGroup(db, 'spaces'),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    );
    const spacesSnapshot = await getDocs(spacesQuery);

    // Group spaces by projectId on the client side
    const spacesByProject = new Map<string, Space[]>();
    spacesSnapshot.docs.forEach((spaceDoc) => {
      const spaceData = spaceDoc.data() as SpaceDocument;
      const space: Space = {
        id: spaceData.id,
        projectId: spaceData.projectId,
        name: spaceData.name,
        images: null, // Empty - load separately with fetchSpaceImages() if needed
        createdAt:
          typeof spaceData.createdAt === 'string'
            ? spaceData.createdAt
            : (spaceData.createdAt as any).toDate().toISOString(),
      };

      const projectSpaces = spacesByProject.get(spaceData.projectId) || [];
      projectSpaces.push(space);
      spacesByProject.set(spaceData.projectId, projectSpaces);
    });

    // Combine projects with their spaces
    const projects: Project[] = projectsSnapshot.docs.map((projectDoc) => {
      const projectData = projectDoc.data() as ProjectDocument;

      return {
        id: projectData.id,
        name: projectData.name,
        spaces: spacesByProject.get(projectData.id) || [],
        createdAt:
          typeof projectData.createdAt === 'string'
            ? projectData.createdAt
            : (projectData.createdAt as any).toDate().toISOString(),
      };
    });

    console.log('Projects fetched from Firestore:', projects.length, 'projects');
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
 * Deletes a project from Firestore.
 * Checks the spaces subcollection to ensure it's empty before deletion.
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
    // First, check if the project exists
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = projectDoc.data() as ProjectDocument;

    // Check if the spaces subcollection is empty
    const spacesRef = collection(db, 'users', userId, 'projects', projectId, 'spaces');
    const spacesSnapshot = await getDocs(spacesRef);

    if (!spacesSnapshot.empty) {
      // If spaces exist, throw an error to prevent deletion
      throw new Error(
        `Cannot delete "${projectData.name}" because it still contains ${spacesSnapshot.size} space(s). Please delete all spaces first.`
      );
    }

    // If there are no spaces, proceed with deleting the project document
    await deleteDoc(projectRef);

    console.log('Project deleted successfully:', projectId);
  } catch (error) {
    console.error('Failed to delete project:', error);
    // Re-throw the error so the UI can catch it and display a message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while deleting the project.');
  }
}

/**
 * Creates a new space in a project.
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

    // Create the space document in the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    const spaceDoc: SpaceDocument = {
      id: newSpace.id,
      userId, // Required for collectionGroup queries
      projectId: newSpace.projectId,
      name: newSpace.name,
      createdAt: now.toISOString(),
    };

    await setDoc(spaceDocRef, {
      ...spaceDoc,
      createdAt: Timestamp.fromDate(now),
    });

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
 * Updates a space's name in Firestore.
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
    // Update the space document in the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    await updateDoc(spaceDocRef, { name: newName.trim() });

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
 * Deletes a space from Firestore.
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
  if (!userId) {
    throw new Error('User ID is required to delete a space.');
  }
  if (!projectId) {
    throw new Error('Project ID is required to delete a space.');
  }

  try {
    // Delete the space document from the subcollection
    const spaceDocRef = doc(db, 'users', userId, 'projects', projectId, 'spaces', spaceId);
    await deleteDoc(spaceDocRef);

    console.log('Space deleted from Firestore:', spaceId);
  } catch (error) {
    console.error('Failed to delete space:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete space: ${error.message}`);
    }
    throw new Error('Failed to delete space from Firebase.');
  }
}

/**
 * Fetches all images for a specific space.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space.
 * @returns An array of ImageData objects.
 */
export async function fetchSpaceImages(
  userId: string,
  projectId: string,
  spaceId: string
): Promise<ImageData[]> {
  if (!userId || !projectId || !spaceId) {
    throw new Error('User ID, Project ID, and Space ID are required to fetch images.');
  }

  try {
    console.log('Fetching images for space:', spaceId);

    const imagesRef = collection(
      db,
      'users',
      userId,
      'projects',
      projectId,
      'spaces',
      spaceId,
      'images'
    );
    const imagesQuery = query(imagesRef, orderBy('createdAt', 'asc'));
    const imagesSnapshot = await getDocs(imagesQuery);

    const images: ImageData[] = imagesSnapshot.docs
      .map((imageDoc) => {
        const imageData = imageDoc.data();
        return new FirestoreDataHandler(imageData).serializeTimestamps().value as ImageData;
      })
      .filter((image) => !image.isDeleted);

    console.log('Images fetched for space:', spaceId, '-', images.length, 'images');

    // Cache images in background
    void cacheImageBase64s(images);

    return images;
  } catch (error) {
    console.error('Failed to fetch images:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }
    throw new Error('Failed to fetch images from Firebase.');
  }
}

/**
 * Creates a new image document in Firestore with uploaded storage information.
 * This function handles the entire workflow:
 * 1. Upload the image file to Firebase Storage
 * 2. Obtain the storageUrl and storagePath
 * 3. Create the image document in Firestore
 *
 * @param userId The ID of the user uploading the image.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space.
 * @param imageFile The image file to upload (Blob or File). Can be null if base64 is provided.
 * @param imageMetadata Basic metadata: id, name, mimeType.
 * @param processingInfo Optional processing information including base64, parentImageId, and operation.
 * @returns The newly created ImageData object for local state use.
 */
export async function createImage(
  userId: string,
  projectId: string,
  spaceId: string,
  imageFile: Blob | File | null,
  imageMetadata: Pick<ImageData, 'id' | 'name' | 'mimeType'>,
  processingInfo?: {
    parentImage?: ImageData | null;
    operation?: ImageOperation | null;
    base64?: string;
    base64MimeType?: string;
  }
): Promise<ImageData> {
  if (!userId) {
    throw new Error('User ID is required to add an image.');
  }

  const { operation, parentImage, base64, base64MimeType } = processingInfo || {};

  try {
    console.log('Uploading image to Firebase Storage...');

    // Determine the file to upload and extension
    let fileToUpload: Blob | File;
    let extension = 'jpg';

    if (base64 && base64MimeType) {
      // Convert base64 to File
      extension = base64MimeType.split('/')[1] || 'jpg';
      const filename = `${imageMetadata.id}.${extension}`;
      fileToUpload = base64ToFile(base64, base64MimeType, filename);
      console.log('Converted base64 to file:', filename);
    } else if (imageFile) {
      // Use provided file
      fileToUpload = imageFile;
      if (imageFile.type) {
        extension = imageFile.type.split('/')[1] || 'jpg';
      } else if (imageFile instanceof File) {
        const parts = imageFile.name.split('.');
        extension = parts[parts.length - 1] || 'jpg';
      }
    } else {
      throw new Error('Either imageFile or base64 data must be provided.');
    }

    // For generating download URL
    const storageFilePath = `users/${userId}/images/${imageMetadata.id}.${extension}`;

    // The Firebase Storage File Path
    const storageRef = ref(storage, `users/${userId}/images/${imageMetadata.id}.${extension}`);

    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, fileToUpload);
    console.log('Image uploaded to Firebase Storage:', storageFilePath);

    // Get the download URL
    const imageDownloadUrl = await getDownloadURL(storageRef);
    console.log('Image download URL obtained:', imageDownloadUrl);

    // Step 2: Create the image document in Firestore with storage information
    const now = new Date();
    const nowISOString = now.toISOString();
    const newImageData: ImageData = {
      ...imageMetadata,
      spaceId,
      evolutionChain: operation
        ? [
            ...(parentImage?.evolutionChain || []),
            {
              ...operation,
              timestamp: new Date(operation.timestamp),
            },
          ]
        : [],
      parentImage: parentImage || null,
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
    const imageData = {
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

    batch.set(docRef, imageData);

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
 * Updates an image's name in Firestore.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space.
 * @param imageId The ID of the image to update.
 * @param newName The new name for the image.
 */
export async function updateImageName(
  userId: string,
  projectId: string,
  spaceId: string,
  imageId: string,
  newName: string
): Promise<void> {
  if (!userId || !projectId || !spaceId || !imageId) {
    throw new Error('User ID, Project ID, Space ID, and Image ID are required to update image.');
  }

  if (!newName.trim()) {
    throw new Error('Image name cannot be empty.');
  }

  try {
    const docRef = doc(
      db,
      'users',
      userId,
      'projects',
      projectId,
      'spaces',
      spaceId,
      'images',
      imageId
    );

    const now = new Date();
    await updateDoc(docRef, {
      name: newName.trim(),
      updatedAt: Timestamp.fromDate(now),
    });

    console.log('Image name updated in Firestore:', imageId);
  } catch (error) {
    console.error('Failed to update image name:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update image name: ${error.message}`);
    }
    throw new Error('Failed to update image name in Firebase.');
  }
}

/**
 * Soft deletes images by marking them as deleted in Firestore.
 * Hard deletes the actual image files from Firebase Storage.
 *
 * @param userId The ID of the user.
 * @param projectId The ID of the project.
 * @param spaceId The ID of the space.
 * @param imageIds The IDs of the images to delete.
 */
export async function deleteImages(
  userId: string,
  projectId: string,
  spaceId: string,
  imageIds: string[]
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to delete images.');
  }

  if (imageIds.length === 0) {
    return;
  }

  try {
    console.log(`Deleting ${imageIds.length} images for user ${userId}`);

    // Process each image
    for (const imageId of imageIds) {
      try {
        const docRef = doc(
          db,
          'users',
          userId,
          'projects',
          projectId,
          'spaces',
          spaceId,
          'images',
          imageId
        );

        // Get the image document to retrieve storage path
        const imageDoc = await getDoc(docRef);

        if (imageDoc.exists()) {
          const imageData = imageDoc.data();
          const now = new Date();

          // Soft delete in Firestore - mark as deleted
          await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now),
          });

          console.log(`Soft deleted image in Firestore: ${imageId}`);

          // TODO: determine the hard delete logic
          // Hard delete from Firebase Storage
          // if (imageData.storageFilePath) {
          //   try {
          //     const storageRef = ref(storage, imageData.storageFilePath);
          //     await deleteObject(storageRef);
          //     console.log(`Hard deleted image from Storage: ${imageData.storageFilePath}`);
          //   } catch (storageError) {
          //     console.warn(`Failed to delete storage file for image ${imageId}:`, storageError);
          //     // Continue even if storage deletion fails
          //   }
          // } else {
          //   console.warn(`No storage path found for image ${imageId}`);
          // }
        } else {
          console.warn(`Image document not found: ${imageId}`);
        }
      } catch (error) {
        console.error(`Failed to delete image ${imageId}:`, error);
        // Continue with next image even if one fails
      }
    }

    console.log(`Completed deletion of ${imageIds.length} images`);
  } catch (error) {
    console.error('Failed to delete images:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete images: ${error.message}`);
    }
    throw new Error('Failed to delete images from Firebase.');
  }
}
