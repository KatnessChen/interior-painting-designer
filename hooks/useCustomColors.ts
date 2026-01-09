import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import {
  setCustomColors,
  addCustomColor as addCustomColorAction,
  removeCustomColor as removeCustomColorAction,
  setLoadingColors,
  setLoadColorsError,
} from '@/stores/customAssetsStore';
import {
  fetchColors,
  addColor as addColorFirestore,
  deleteColor as deleteColorFirestore,
} from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';

export const useCustomColors = (projectId: string | null) => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Get project-specific assets from store
  const projectAssets = useSelector((state: RootState) =>
    projectId ? state.customAssets.projects[projectId] : undefined
  );

  const customColors = projectAssets?.customColors ?? [];
  const isLoadingColors = projectAssets?.isLoadingColors ?? false;
  const loadColorsError = projectAssets?.loadColorsError ?? null;

  // Load custom colors with cache check
  useEffect(() => {
    if (!user?.uid || !projectId) {
      return;
    }

    // Check if colors are already loaded in store
    const hasColors = projectAssets && projectAssets.customColors.length > 0;
    if (hasColors) {
      console.log('Using cached custom colors for project:', projectId);
      return;
    }

    // Check if already loading
    const isLoading = projectAssets?.isLoadingColors;
    if (isLoading) {
      return;
    }

    const loadColors = async () => {
      dispatch(setLoadingColors({ projectId, isLoadingColors: true }));
      try {
        const colors = await fetchColors(user.uid, projectId);
        dispatch(setCustomColors({ projectId, colors }));
        console.log('Loaded custom colors from Firestore:', projectId);
      } catch (error) {
        console.error('Failed to load colors:', error);
        dispatch(
          setLoadColorsError({
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    };

    loadColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, projectId, dispatch]);

  const addColor = async (colorData: { name: string; hex: string; description?: string }) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      const newColor = await addColorFirestore(user.uid, projectId, colorData);
      dispatch(addCustomColorAction({ projectId, color: newColor }));
      return newColor;
    } catch (error) {
      console.error('Failed to add color:', error);
      throw error;
    }
  };

  const deleteColor = async (colorId: string) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      await deleteColorFirestore(user.uid, projectId, colorId);
      dispatch(removeCustomColorAction({ projectId, colorId }));
    } catch (error) {
      console.error('Failed to delete color:', error);
      throw error;
    }
  };

  return {
    customColors,
    isLoadingColors,
    loadColorsError,
    addColor,
    deleteColor,
  };
};
