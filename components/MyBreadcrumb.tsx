import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Breadcrumb, Dropdown, Space, Tooltip, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  FolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Box, Modal, Skeleton, Typography } from '@mui/material';
import GenericConfirmModal from './GenericConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { AppDispatch } from '@/stores/store';
import {
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
  selectIsAppInitiated,
  selectActiveProject,
} from '@/stores/projectStore';
import {
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

interface BreadcrumbProps {
  onProjectSelected?: (projectId: string) => void;
  onSpaceSelected?: (projectId: string, spaceId: string) => void;
}

const MyBreadcrumb: React.FC<BreadcrumbProps> = ({ onProjectSelected, onSpaceSelected }) => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const projects = useSelector(selectProjects);
  const activeProjectId = useSelector(selectActiveProjectId);
  const activeProject = useSelector(selectActiveProject);
  const activeSpaceId = useSelector(selectActiveSpaceId);
  const isAppInitiated = useSelector(selectIsAppInitiated);

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInput, setModalInput] = useState<string>('');
  const [modalProcessing, setModalProcessing] = useState<boolean>(false);
  const [editingEntityIds, setEditingEntityIds] = useState<{
    projectId: string | null;
    spaceId: string | null;
  }>({ projectId: null, spaceId: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const autoFetchSpaceImages = async () => {
      if (user && activeProjectId && activeSpaceId) {
        const images = await fetchSpaceImages(user.uid, activeProjectId, activeSpaceId);
        dispatch(setSpaceImages({ projectId: activeProjectId, spaceId: activeSpaceId, images }));
      }
    };
    autoFetchSpaceImages();
  }, [activeProjectId, activeSpaceId, user, dispatch]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      if (!user || activeProjectId === projectId) return;
      dispatch(setActiveProjectId(projectId));
      const selectedProject = projects.find((p) => p.id === projectId);
      const firstSpace = selectedProject?.spaces?.[0];
      dispatch(setActiveSpaceId(firstSpace ? firstSpace.id : null));
      onProjectSelected?.(projectId);
    },
    [user, dispatch, projects, activeProjectId, onProjectSelected]
  );

  const handleSelectSpace = useCallback(
    (spaceId: string) => {
      if (!user || !activeProjectId || activeSpaceId === spaceId) return;
      dispatch(setActiveSpaceId(spaceId));
      onSpaceSelected?.(activeProjectId, spaceId);
    },
    [user, activeProjectId, activeSpaceId, dispatch, onSpaceSelected]
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
          } catch (error) {
            console.error('Error deleting project:', error);
          } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
          }
        },
      });
    },
    [user, dispatch, confirmModal]
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
          } catch (error) {
            console.error('Error deleting space:', error);
          } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
          }
        },
      });
    },
    [user, dispatch, confirmModal]
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
          if (!activeProjectId) throw Error('Project Id not exist');
          const newSpace = await createSpace(user.uid, activeProjectId, userInputValue);
          dispatch(addSpace({ projectId: activeProjectId, space: newSpace }));
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
      }
    } catch (error) {
      console.error('Error in modal submission:', error);
    } finally {
      setModalInput('');
      setModalMode(null);
      setModalProcessing(false);
      setEditingEntityIds({ projectId: null, spaceId: null });
    }
  }, [user, modalInput, modalMode, dispatch, activeProjectId, editingEntityIds]);

  const handleCloseModal = useCallback(() => {
    setModalInput('');
    setModalMode(null);
    setModalProcessing(false);
    setEditingEntityIds({ projectId: null, spaceId: null });
  }, []);

  const getModalTitle = useMemo(() => {
    switch (modalMode) {
      case ModalMode.ADD_PROJECT:
        return 'Add New Project';
      case ModalMode.ADD_SPACE:
        return 'Add New Space';
      case ModalMode.EDIT_PROJECT:
        return 'Edit Project Name';
      case ModalMode.EDIT_SPACE:
        return 'Edit Space Name';
      default:
        return '';
    }
  }, [modalMode]);

  const projectMenuItems: MenuProps['items'] = useMemo(() => {
    const projectItems = projects.map((project) => ({
      key: project.id,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minWidth: 200,
          }}
        >
          <span>{project.name}</span>
          <Space size={4}>
            <Tooltip title="Edit Project Name">
              <EditOutlined
                style={{ fontSize: 14, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEntityIds({ projectId: project.id, spaceId: null });
                  setModalMode(ModalMode.EDIT_PROJECT);
                  setModalInput(project.name);
                }}
              />
            </Tooltip>
            <Tooltip
              title={
                project.spaces.length > 0 ? 'Cannot delete project with spaces.' : 'Delete Project'
              }
            >
              <DeleteOutlined
                style={{
                  fontSize: 14,
                  cursor: project.spaces.length > 0 ? 'not-allowed' : 'pointer',
                  opacity: project.spaces.length > 0 ? 0.4 : 1,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (project.spaces.length === 0) {
                    handleDeleteProject(project.id, project.name);
                  }
                }}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      onClick: () => handleSelectProject(project.id),
    }));

    const addProjectItem = {
      key: 'add-project',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined style={{ fontSize: 16 }} />
          <span>Add New Project</span>
        </div>
      ),
      onClick: () => setModalMode(ModalMode.ADD_PROJECT),
    };

    return projectItems.length > 0
      ? [...projectItems, { type: 'divider' }, addProjectItem]
      : [addProjectItem];
  }, [projects, handleSelectProject, handleDeleteProject]);

  const spaceMenuItems: MenuProps['items'] = useMemo(() => {
    if (!activeProject) return [];
    const spaceItems = activeProject.spaces.map((space) => ({
      key: space.id,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minWidth: 200,
          }}
        >
          <span>{space.name}</span>
          <Space size={4}>
            <Tooltip title="Edit Space Name">
              <EditOutlined
                style={{ fontSize: 14, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!activeProject) return;
                  setEditingEntityIds({ projectId: activeProject.id, spaceId: space.id });
                  setModalMode(ModalMode.EDIT_SPACE);
                  setModalInput(space.name);
                }}
              />
            </Tooltip>
            <Tooltip title="Delete Space">
              <DeleteOutlined
                style={{ fontSize: 14, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!activeProject) return;
                  handleDeleteSpace(activeProject.id, space.id, space.name);
                }}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      onClick: () => handleSelectSpace(space.id),
    }));

    const addSpaceItem = {
      key: 'add-space',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined style={{ fontSize: 16 }} />
          <span>Add New Space</span>
        </div>
      ),
      onClick: () => setModalMode(ModalMode.ADD_SPACE),
      disabled: !activeProjectId,
    };

    return spaceItems.length > 0
      ? [...spaceItems, { type: 'divider' }, addSpaceItem]
      : [addSpaceItem];
  }, [activeProject, handleSelectSpace, handleDeleteSpace, activeProjectId]);

  const breadcrumbItems = useMemo(() => {
    if (projects.length === 0) {
      return [
        {
          title: (
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalMode(ModalMode.ADD_PROJECT)}
              disabled={!user}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Add New Project
            </Button>
          ),
        },
      ];
    }

    const items = [
      {
        title: (
          <Dropdown
            menu={{ items: projectMenuItems }}
            disabled={!user}
            trigger={['click']}
            placement="bottomLeft"
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HomeOutlined />
              {activeProjectId && activeProject ? activeProject.name : 'Select Project'}
            </span>
          </Dropdown>
        ),
      },
    ];

    if (activeProjectId && activeProject) {
      items.push({
        title:
          activeProject.spaces.length === 0 ? (
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalMode(ModalMode.ADD_SPACE)}
              disabled={!user || !activeProjectId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Add New Space
            </Button>
          ) : (
            <Dropdown
              menu={{ items: spaceMenuItems }}
              disabled={!user || !activeProjectId}
              trigger={['click']}
              placement="bottomLeft"
            >
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FolderOutlined />
                {activeSpaceId && activeProject.spaces.find((s) => s.id === activeSpaceId)
                  ? activeProject.spaces.find((s) => s.id === activeSpaceId)?.name
                  : 'Select Space'}
              </span>
            </Dropdown>
          ),
      });
    }

    return items;
  }, [
    user,
    activeProjectId,
    activeProject,
    activeSpaceId,
    projectMenuItems,
    spaceMenuItems,
    projects,
  ]);

  if (!isAppInitiated) {
    return (
      <Box display="flex" alignItems="center" gap={2} p={2}>
        <Skeleton variant="rounded" width={200} height={56} />
        <Skeleton variant="rounded" width={200} height={56} />
        <Skeleton variant="circular" width={40} height={40} />
      </Box>
    );
  }

  return (
    <>
      <style>{`
        .ant-breadcrumb-item,
        .ant-breadcrumb-separator {
          display: flex !important;
          align-items: center !important;
        }
      `}</style>
      <Box display="flex" alignItems="center" gap={2} pt={3} px={3} pb={0}>
        <Breadcrumb
          items={breadcrumbItems}
          style={{
            fontSize: '16px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
          }}
        />

        <Box flexGrow={1} />

        <Modal open={!!modalMode} onClose={handleCloseModal}>
          <Box
            sx={{
              width: 400,
              bgcolor: 'background.paper',
              boxShadow: 24,
              p: 4,
              borderRadius: 2,
              margin: 'auto',
              mt: 8,
            }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {getModalTitle}
            </Typography>
            <input
              value={modalInput}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder={modalMode === ModalMode.ADD_PROJECT ? 'Project Name' : 'Space Name'}
              onChange={(e) => setModalInput(e.target.value)}
              autoFocus
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                type="primary"
                style={{ flex: 1 }}
                onClick={handleModalSubmit}
                loading={modalProcessing}
                disabled={!modalInput.trim()}
              >
                Confirm
              </Button>
              <Button style={{ flex: 1 }} onClick={handleCloseModal}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Modal>

        <GenericConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      </Box>
    </>
  );
};

export default MyBreadcrumb;
