import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import {
  setCustomTextures,
  addCustomTexture as addCustomTextureAction,
  removeCustomTexture as removeCustomTextureAction,
  setLoadingTextures,
  setLoadTexturesError,
} from '@/stores/customAssetsStore';
import {
  fetchTextures,
  addTexture as addTextureFirestore,
  deleteTexture as deleteTextureFirestore,
} from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';

export const useCustomTextures = (projectId: string | null) => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Get project-specific assets from store
  const projectAssets = useSelector((state: RootState) =>
    projectId ? state.customAssets.projects[projectId] : undefined
  );

  const customTextures = projectAssets?.customTextures ?? [];
  const isLoadingTextures = projectAssets?.isLoadingTextures ?? false;
  const loadTexturesError = projectAssets?.loadTexturesError ?? null;

  // Load custom textures with cache check
  useEffect(() => {
    if (!user?.uid || !projectId) {
      return;
    }

    // Check if textures are already loaded in store
    const hasTextures = projectAssets && projectAssets.customTextures.length > 0;
    if (hasTextures) {
      console.log('Using cached custom textures for project:', projectId);
      return;
    }

    // Check if already loading
    const isLoading = projectAssets?.isLoadingTextures;
    if (isLoading) {
      return;
    }

    const loadTextures = async () => {
      dispatch(setLoadingTextures({ projectId, isLoadingTextures: true }));
      try {
        const textures = await fetchTextures(user.uid, projectId);
        dispatch(setCustomTextures({ projectId, textures }));
        console.log('Loaded custom textures from Firestore:', projectId);
      } catch (error) {
        console.error('Failed to load textures:', error);
        dispatch(
          setLoadTexturesError({
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    };

    loadTextures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, projectId, dispatch]);

  const addTexture = async (textureData: { name: string; file: File; description?: string }) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      const newTexture = await addTextureFirestore(user.uid, projectId, textureData);
      dispatch(addCustomTextureAction({ projectId, texture: newTexture }));
      return newTexture;
    } catch (error) {
      console.error('Failed to add texture:', error);
      throw error;
    }
  };

  const deleteTexture = async (textureId: string) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      await deleteTextureFirestore(user.uid, projectId, textureId);
      dispatch(removeCustomTextureAction({ projectId, textureId }));
    } catch (error) {
      console.error('Failed to delete texture:', error);
      throw error;
    }
  };

  return {
    customTextures,
    isLoadingTextures,
    loadTexturesError,
    addTexture,
    deleteTexture,
  };
};
