import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { Tooltip, Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import GenericConfirmModal from '../GenericConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { AppDispatch } from '@/stores/store';
import {
  setProjects,
  addProject,
  updateProject as updateProjectAction,
  removeProject,
  addSpace,
  setSpaceImages,
  updateSpace as updateSpaceAction,
  removeSpace,
  setActiveProjectId,
  setActiveSpaceId,
  selectProjects,
  selectActiveProjectId,
  selectActiveSpaceId,
} from '@/stores/projectStore';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  createSpace,
  updateSpace,
  deleteSpace,
  fetchSpaceImages,
} from '@/services/firestoreService';

export const ModalMode = {
  ADD_PROJECT: 'add-project',
  ADD_SPACE: 'add-space',
  EDIT_PROJECT: 'edit-project',
  EDIT_SPACE: 'edit-space',
} as const;

export type ModalMode = (typeof ModalMode)[keyof typeof ModalMode];

interface AsideSectionProps {
  onProjectSelected?: (projectId: string) => void;
  onSpaceSelected?: (projectId: string, spaceId: string) => void;
}

const AsideSection: React.FC<AsideSectionProps> = ({ onProjectSelected, onSpaceSelected }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const dispatch = useDispatch<AppDispatch>();
  const projects = useSelector(selectProjects);
  const activeProjectId = useSelector(selectActiveProjectId);
  const activeSpaceId = useSelector(selectActiveSpaceId);

  // Add Project/Space Modal state
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInput, setModalInput] = useState<string>('');
  const [modalProcessing, setModalProcessing] = useState<boolean>(false);

  // Editing Name Project/Space Input state
  type EditingEntityIds = { projectId: string | null; spaceId: string | null };
  const [editingEntityIds, setEditingEntityIds] = useState<EditingEntityIds>({
    projectId: null,
    spaceId: null,
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!user) {
      dispatch(setProjects([]));
      setLoading(false);
      return;
    }

    const fetchUserProjects = async () => {
      try {
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
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjects();
  }, [user, dispatch]);

  useEffect(() => {
    const autoFetchSpaceImages = async () => {
      if (user && activeProjectId && activeSpaceId) {
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));
      }
    };

    autoFetchSpaceImages();
  }, [activeSpaceId]);

  const handleSelectProject = useCallback(
    async (projectId: string) => {
      if (!user) return;

      if (activeProjectId === projectId) return;

      const selectedProject = projects.find((project) => project.id === projectId);
      dispatch(setActiveProjectId(projectId));

      // Auto-select the first space if available
      const firstSpace = selectedProject?.spaces?.[0];
      if (firstSpace) {
        dispatch(setActiveSpaceId(firstSpace.id));
      } else {
        dispatch(setActiveSpaceId(null));
      }

      onProjectSelected?.(projectId);
    },
    [user, onProjectSelected, dispatch, projects, activeProjectId]
  );

  const handleSelectSpace = useCallback(
    async (projectId: string, spaceId: string) => {
      if (!user) return;

      if (activeSpaceId === spaceId) return;

      dispatch(setActiveProjectId(projectId));
      dispatch(setActiveSpaceId(spaceId));
      onSpaceSelected?.(projectId, spaceId);
    },
    [user, onSpaceSelected, dispatch, activeSpaceId]
  );

  const handleDeleteProject = useCallback(
    (projectId: string, projectName: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Project',
        message: `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
        onConfirm: async () => {
          if (!user) return;

          try {
            await deleteProject(user.uid, projectId);
            dispatch(removeProject(projectId));
            setConfirmModal({ ...confirmModal, isOpen: false });
          } catch (error) {
            console.error('Error deleting project:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete project');
          }
        },
      });
    },
    [user, activeProjectId, confirmModal, dispatch]
  );

  const handleDeleteSpace = useCallback(
    (projectId: string, spaceId: string, spaceName: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Space',
        message: `Are you sure you want to delete "${spaceName}"? This action cannot be undone.`,
        onConfirm: async () => {
          if (!user) return;

          try {
            await deleteSpace(user.uid, projectId, spaceId);
            dispatch(removeSpace({ projectId, spaceId }));
            setConfirmModal({ ...confirmModal, isOpen: false });
          } catch (error) {
            console.error('Error deleting space:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete space');
          }
        },
      });
    },
    [user, activeSpaceId, activeProjectId, confirmModal, dispatch]
  );

  const handleModalSubmit = useCallback(async () => {
    setModalProcessing(true);

    try {
      const userInputValue = modalInput.trim();
      if (!user) throw new Error('Please log in');

      if (!userInputValue) throw new Error('Please input name.');

      switch (modalMode) {
        case ModalMode.ADD_PROJECT: {
          const newProject = await createProject(user.uid, userInputValue);
          dispatch(addProject(newProject));
          dispatch(setActiveProjectId(newProject.id));
          break;
        }
        case ModalMode.ADD_SPACE: {
          if (!editingEntityIds.projectId) throw Error('Project Id not exist');

          const newSpace = await createSpace(user.uid, editingEntityIds.projectId, userInputValue);
          dispatch(addSpace({ projectId: editingEntityIds.projectId, space: newSpace }));
          dispatch(setActiveSpaceId(newSpace.id));
          break;
        }
        case ModalMode.EDIT_PROJECT: {
          if (!editingEntityIds.projectId) throw Error('Project Id not exist');
          await updateProject(user.uid, editingEntityIds.projectId, userInputValue);
          dispatch(
            updateProjectAction({ projectId: editingEntityIds.projectId, name: userInputValue })
          );
          break;
        }
        case ModalMode.EDIT_SPACE: {
          if (!editingEntityIds.projectId || !editingEntityIds.spaceId)
            throw Error('Project Id or Space Id not exist');

          await updateSpace(
            user.uid,
            editingEntityIds.projectId,
            editingEntityIds.spaceId,
            userInputValue
          );
          dispatch(
            updateSpaceAction({
              projectId: editingEntityIds.projectId,
              spaceId: editingEntityIds.spaceId,
              name: userInputValue,
            })
          );
          break;
        }
        default: {
          throw Error('Invalid modal action');
        }
      }
    } catch (error) {
      console.error('Error adding project/space:', error);
    } finally {
      handleCloseModal();
    }
  }, [user, modalInput, editingEntityIds, modalMode, dispatch]);

  const handleCloseModal = useCallback(() => {
    setModalInput('');
    setModalMode(null);
    setModalProcessing(false);
    setEditingEntityIds({ projectId: null, spaceId: null });
  }, []);

  const getModalTitle = useMemo(() => {
    switch (modalMode) {
      case ModalMode.ADD_PROJECT: {
        return 'Add New Project';
      }
      case ModalMode.ADD_SPACE: {
        return 'Add New Space';
      }
      case ModalMode.EDIT_PROJECT: {
        return 'Edit Project Name';
      }
      case ModalMode.EDIT_SPACE: {
        return 'Edit Space Name';
      }
      default: {
        return 'Add New Project';
      }
    }
  }, [modalMode]);

  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      {/* Add Project Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md text-gray-500 tracking-tight cursor-default">New Project</h3>
        <button
          className="p-1 rounded hover:bg-gray-200 transition disabled:opacity-50"
          onClick={() => {
            setModalMode(ModalMode.ADD_PROJECT);
          }}
          disabled={!user || loading}
          aria-label="Add Project"
        >
          <AddIcon sx={{ fontSize: '18px' }} className="text-gray-400" />
        </button>
      </div>

      {/* Projects & Spaces List */}
      <nav className="space-y-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={24} />
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id}>
              <div
                className={`flex items-center justify-between group py-2 cursor-pointer transition-all ${
                  activeProjectId === project.id ? '' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectProject(project.id)}
              >
                <>
                  <div
                    className={`cursor-pointer ${
                      activeProjectId === project.id
                        ? 'font-bold text-indigo-600'
                        : 'font-normal text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {project.name}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip title="Edit Project Name" arrow>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntityIds({ projectId: project.id, spaceId: null });
                          setModalMode(ModalMode.EDIT_PROJECT);
                          setModalInput(project.name);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Edit project"
                      >
                        <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Add new space to this project" arrow>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntityIds({ projectId: project.id, spaceId: null });
                          setModalMode(ModalMode.ADD_SPACE);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Add space"
                      >
                        <AddIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={
                        project.spaces.length > 0
                          ? 'Cannot delete project with spaces associated with it.'
                          : ''
                      }
                      arrow
                    >
                      <button
                        disabled={project.spaces.length > 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Delete project"
                      >
                        <DeleteIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                  </div>
                </>
              </div>

              {/* Spaces List */}
              <div className="space-y-0.5">
                {project.spaces.map((space) => (
                  <div
                    key={space.id}
                    className={`flex items-center justify-between group pl-4 py-1.5 px-1 text-sm cursor-pointer transition-all ${
                      activeSpaceId === space.id && activeProjectId === project.id
                        ? 'font-bold text-indigo-600'
                        : 'font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      activeSpaceId !== space.id && handleSelectSpace(project.id, space.id)
                    }
                  >
                    <>
                      <span className="cursor-pointer">{space.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip title="Edit Space Name" arrow>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEntityIds({ projectId: project.id, spaceId: space.id });
                              setModalMode(ModalMode.EDIT_SPACE);
                              setModalInput(space.name);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            aria-label="Edit space"
                          >
                            <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                          </button>
                        </Tooltip>
                        <Tooltip title="Delete Space" arrow>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSpace(project.id, space.id, space.name);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            aria-label="Delete space"
                          >
                            <DeleteIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                          </button>
                        </Tooltip>
                      </div>
                    </>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Universal Modal for adding/editing project/space */}
      <Modal open={!!modalMode} onClose={handleCloseModal}>
        <Box className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 cursor-default">
            {getModalTitle}
          </h2>
          <input
            value={modalInput}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder={modalMode === ModalMode.ADD_PROJECT ? 'Project Name' : 'Space Name'}
            onChange={(e) => setModalInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              loading={modalProcessing}
              variant="contained"
              onClick={handleModalSubmit}
              disabled={!modalInput.trim() || loading}
            >
              Confirm
            </Button>
            <Button
              variant="outlined"
              className="flex-1"
              onClick={handleCloseModal}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>

      {/* Confirmation Modal */}
      <GenericConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmButtonText="Delete"
        confirmButtonColor="red"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </aside>
  );
};

export default AsideSection;
