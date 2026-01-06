import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import {
  setCustomItems,
  addCustomItem as addCustomItemAction,
  removeCustomItem as removeCustomItemAction,
  setLoadingItems,
  setLoadItemsError,
} from '@/stores/customAssetsStore';
import {
  fetchItems,
  addItem as addItemFirestore,
  deleteItem as deleteItemFirestore,
} from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';

export const useCustomItems = (projectId: string | null) => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Get project-specific assets from store
  const projectAssets = useSelector((state: RootState) =>
    projectId ? state.customAssets.projects[projectId] : undefined
  );

  const customItems = projectAssets?.customItems ?? [];
  const isLoadingItems = projectAssets?.isLoadingItems ?? false;
  const loadItemsError = projectAssets?.loadItemsError ?? null;

  // Load custom items with cache check
  useEffect(() => {
    if (!user?.uid || !projectId) {
      return;
    }

    // Check if items are already loaded in store
    const hasItems = projectAssets && projectAssets.customItems.length > 0;
    if (hasItems) {
      console.log('Using cached custom items for project:', projectId);
      return;
    }

    // Check if already loading
    const isLoading = projectAssets?.isLoadingItems;
    if (isLoading) {
      return;
    }

    const loadItems = async () => {
      dispatch(setLoadingItems({ projectId, isLoadingItems: true }));
      try {
        const items = await fetchItems(user.uid, projectId);
        dispatch(setCustomItems({ projectId, items }));
        console.log('Loaded custom items from Firestore:', projectId);
      } catch (error) {
        console.error('Failed to load items:', error);
        dispatch(
          setLoadItemsError({
            projectId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    };

    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, projectId, dispatch]);

  const addItem = async (itemData: { name: string; file: File; description?: string }) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      const newItem = await addItemFirestore(user.uid, projectId, itemData);
      dispatch(addCustomItemAction({ projectId, item: newItem }));
      return newItem;
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user?.uid || !projectId) {
      throw new Error('User or project not available');
    }

    try {
      await deleteItemFirestore(user.uid, projectId, itemId);
      dispatch(removeCustomItemAction({ projectId, itemId }));
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  };

  return {
    customItems,
    isLoadingItems,
    loadItemsError,
    addItem,
    deleteItem,
  };
};
