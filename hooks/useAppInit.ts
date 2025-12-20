import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/contexts/AuthContext';
import { AppDispatch } from '@/stores/store';
import {
  setProjects,
  setActiveProjectId,
  setActiveSpaceId,
  setSpaceImages,
  setIsAppInitiated,
  setInitError,
} from '@/stores/projectStore';
import { fetchProjects, fetchSpaceImages } from '@/services/firestoreService';

/**
 * Custom hook to handle app initialization:
 * - Fetch user projects
 * - Auto-select first project and space
 * - Fetch images for the selected space
 * - Updates isAppInitiated state in Redux store
 */
export const useAppInit = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!user) {
      dispatch(setProjects([]));
      dispatch(setActiveProjectId(null));
      dispatch(setActiveSpaceId(null));
      dispatch(setIsAppInitiated(false));
      return;
    }

    const initializeApp = async () => {
      try {
        dispatch(setIsAppInitiated(false));
        dispatch(setInitError(null));

        // Fetch all projects for the user
        const projects = await fetchProjects(user.uid);
        dispatch(setProjects(projects));

        // Auto-select the first project if available
        if (projects.length > 0) {
          const firstProject = projects[0];
          dispatch(setActiveProjectId(firstProject.id));

          // Auto-select the first space if available
          const firstSpace = firstProject?.spaces?.[0];
          if (firstSpace) {
            dispatch(setActiveSpaceId(firstSpace.id));

            // Fetch images for the first space
            const images = await fetchSpaceImages(user.uid, firstProject.id, firstSpace.id);
            dispatch(
              setSpaceImages({
                projectId: firstProject.id,
                spaceId: firstSpace.id,
                images,
              })
            );
          }
        }

        dispatch(setIsAppInitiated(true));
      } catch (error) {
        console.error('Error initializing app:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize app';
        dispatch(setInitError(errorMessage));
        dispatch(setIsAppInitiated(true));
      }
    };

    initializeApp();
  }, [user?.uid, dispatch]);
};
