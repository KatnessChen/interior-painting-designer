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
import { useAuth } from '../../contexts/AuthContext';
import { RootState, AppDispatch } from '../../stores/store';
import {
  setHomes,
  addHome,
  updateHome as updateHomeAction,
  removeHome,
  addRoom,
  updateRoom as updateRoomAction,
  removeRoom,
  setActiveHomeId,
  setActiveRoomId,
} from '../../stores/homeSlice';
import {
  fetchHomes,
  createHome,
  updateHome,
  deleteHome,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../../services/firestoreService';

export const ModalMode = {
  ADD_HOME: 'add-home',
  ADD_ROOM: 'add-room',
  EDIT_HOME: 'edit-home',
  EDIT_ROOM: 'edit-room',
} as const;

export type ModalMode = (typeof ModalMode)[keyof typeof ModalMode];

interface AsideSectionProps {
  onHomeSelected?: (homeId: string) => void;
  onRoomSelected?: (homeId: string, roomId: string) => void;
}

const AsideSection: React.FC<AsideSectionProps> = ({ onHomeSelected, onRoomSelected }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Redux store
  const dispatch = useDispatch<AppDispatch>();
  const homes = useSelector((state: RootState) => state.home.homes);
  const activeHomeId = useSelector((state: RootState) => state.home.activeHomeId);
  const activeRoomId = useSelector((state: RootState) => state.home.activeRoomId);

  // Add Home/Room Modal state
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalInput, setModalInput] = useState<string>('');
  const [modalProcessing, setModalProcessing] = useState<boolean>(false);

  // Editing Name Home/Room Input state
  type EditingEntityIds = { homeId: string | null; roomId: string | null };
  const [editingEntityIds, setEditingEntityIds] = useState<EditingEntityIds>({
    homeId: null,
    roomId: null,
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Fetch homes when user changes
  useEffect(() => {
    if (!user) {
      dispatch(setHomes([]));
      setLoading(false);
      return;
    }

    const fetchUserHomes = async () => {
      try {
        const homes = await fetchHomes(user.uid);
        console.log({ homes });
        dispatch(setHomes(homes));
      } catch (error) {
        console.error('Error fetching homes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserHomes();
  }, [user, dispatch]);

  // Handle delete home
  const handleDeleteHome = useCallback(
    (homeId: string, homeName: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Home',
        message: `Are you sure you want to delete "${homeName}"? This action cannot be undone.`,
        onConfirm: async () => {
          if (!user) return;

          try {
            await deleteHome(user.uid, homeId);
            dispatch(removeHome(homeId));
            setConfirmModal({ ...confirmModal, isOpen: false });
          } catch (error) {
            console.error('Error deleting home:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete home');
          }
        },
      });
    },
    [user, activeHomeId, confirmModal, dispatch]
  );

  // Handle delete room
  const handleDeleteRoom = useCallback(
    (homeId: string, roomId: string, roomName: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Room',
        message: `Are you sure you want to delete "${roomName}"? This action cannot be undone.`,
        onConfirm: async () => {
          if (!user) return;

          try {
            await deleteRoom(user.uid, homeId, roomId);
            dispatch(removeRoom({ homeId, roomId }));
            setConfirmModal({ ...confirmModal, isOpen: false });
          } catch (error) {
            console.error('Error deleting room:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete room');
          }
        },
      });
    },
    [user, activeRoomId, activeHomeId, confirmModal, dispatch]
  );

  // Handle home selection
  const handleSelectHome = useCallback(
    (homeId: string) => {
      const selectedHome = homes.find((home) => home.id === homeId);
      dispatch(setActiveHomeId(homeId));

      // If the home has rooms, set the first room as active, otherwise set null
      const firstRoomId = selectedHome?.rooms?.[0]?.id;
      dispatch(setActiveRoomId(firstRoomId || null));

      onHomeSelected?.(homeId);
    },
    [onHomeSelected, dispatch, homes]
  );

  // Handle room selection
  const handleSelectRoom = useCallback(
    (homeId: string, roomId: string) => {
      dispatch(setActiveHomeId(homeId));
      dispatch(setActiveRoomId(roomId));
      onRoomSelected?.(homeId, roomId);
    },
    [onRoomSelected, dispatch]
  );

  // Handle modal submission
  const handleModalSubmit = useCallback(async () => {
    setModalProcessing(true);

    try {
      const userInputValue = modalInput.trim();
      if (!user) throw new Error('Please log in');

      if (!userInputValue) throw new Error('Please input name.');

      switch (modalMode) {
        case ModalMode.ADD_HOME: {
          const newHome = await createHome(user.uid, userInputValue);
          dispatch(addHome(newHome));
          break;
        }
        case ModalMode.ADD_ROOM: {
          if (!editingEntityIds.homeId) throw Error('Home Id not exist');

          const newRoom = await createRoom(user.uid, editingEntityIds.homeId, userInputValue);
          dispatch(addRoom({ homeId: editingEntityIds.homeId, room: newRoom }));
          break;
        }
        case ModalMode.EDIT_HOME: {
          if (!editingEntityIds.homeId) throw Error('Home Id not exist');
          await updateHome(user.uid, editingEntityIds.homeId, userInputValue);
          dispatch(updateHomeAction({ homeId: editingEntityIds.homeId, name: userInputValue }));
          break;
        }
        case ModalMode.EDIT_ROOM: {
          if (!editingEntityIds.homeId || !editingEntityIds.roomId)
            throw Error('Home Id or Room Id not exist');

          await updateRoom(
            user.uid,
            editingEntityIds.homeId,
            editingEntityIds.roomId,
            userInputValue
          );
          dispatch(
            updateRoomAction({
              homeId: editingEntityIds.homeId,
              roomId: editingEntityIds.roomId,
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
      console.error('Error adding home/room:', error);
    } finally {
      handleCloseModal();
    }
  }, [user, modalInput, editingEntityIds, modalMode, dispatch]);

  const handleCloseModal = useCallback(() => {
    setModalInput('');
    setModalMode(null);
    setModalProcessing(false);
    setEditingEntityIds({ homeId: null, roomId: null });
  }, []);

  const getModalTitle = useMemo(() => {
    switch (modalMode) {
      case ModalMode.ADD_HOME: {
        return 'Add New Home';
      }
      case ModalMode.ADD_ROOM: {
        return 'Add New Room';
      }
      case ModalMode.EDIT_HOME: {
        return 'Edit Home Name';
      }
      case ModalMode.EDIT_ROOM: {
        return 'Edit Room Name';
      }
      default: {
        return 'Add New Home';
      }
    }
  }, [modalMode]);

  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      {/* Add Home Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md text-gray-500 tracking-tight">New Home</h3>
        <button
          className="p-1 rounded hover:bg-gray-200 transition disabled:opacity-50"
          onClick={() => {
            setModalMode(ModalMode.ADD_HOME);
          }}
          disabled={!user || loading}
          aria-label="Add Home"
        >
          <AddIcon sx={{ fontSize: '18px' }} className="text-gray-400" />
        </button>
      </div>

      {/* Homes & Rooms List */}
      <nav className="space-y-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={24} />
          </div>
        ) : homes.length === 0 ? (
          <div className="text-sm text-gray-400 py-4">No homes yet. Create one to get started.</div>
        ) : (
          homes.map((home) => (
            <div key={home.id}>
              <div
                className={`flex items-center justify-between group py-2 cursor-pointer transition-all ${
                  activeHomeId === home.id ? '' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectHome(home.id)}
              >
                <>
                  <div
                    className={`cursor-pointer ${
                      activeHomeId === home.id
                        ? 'font-bold text-indigo-600'
                        : 'font-normal text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {home.name}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip title="Edit Home Name" arrow>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntityIds({ homeId: home.id, roomId: null });
                          setModalMode(ModalMode.EDIT_HOME);
                          setModalInput(home.name);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Edit home"
                      >
                        <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Add new room to this home" arrow>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntityIds({ homeId: home.id, roomId: null });
                          setModalMode(ModalMode.ADD_ROOM);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Add room"
                      >
                        <AddIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={
                        home.rooms.length > 0
                          ? 'Cannot delete home with rooms associated with it.'
                          : ''
                      }
                      arrow
                    >
                      <button
                        disabled={home.rooms.length > 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHome(home.id, home.name);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition"
                        aria-label="Delete home"
                      >
                        <DeleteIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                      </button>
                    </Tooltip>
                  </div>
                </>
              </div>

              {/* Rooms List */}
              <div className="space-y-0.5">
                {home.rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center justify-between group pl-4 py-1.5 px-1 text-sm cursor-pointer transition-all ${
                      activeRoomId === room.id && activeHomeId === home.id
                        ? 'font-bold text-indigo-600'
                        : 'font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => activeRoomId !== room.id && handleSelectRoom(home.id, room.id)}
                  >
                    <>
                      <span className="cursor-pointer">{room.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip title="Edit Room Name" arrow>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEntityIds({ homeId: home.id, roomId: room.id });
                              setModalMode(ModalMode.EDIT_ROOM);
                              setModalInput(room.name);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            aria-label="Edit room"
                          >
                            <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                          </button>
                        </Tooltip>
                        <Tooltip title="Delete Room" arrow>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoom(home.id, room.id, room.name);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            aria-label="Delete room"
                          >
                            <DeleteIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                          </button>
                        </Tooltip>
                      </div>
                    </>
                  </div>
                ))}
                {home.rooms.length === 0 && (
                  <div className="text-xs text-gray-400 px-3 py-1">No rooms yet.</div>
                )}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Universal Modal for adding/editing home/room */}
      <Modal open={!!modalMode} onClose={handleCloseModal}>
        <Box className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{getModalTitle}</h2>
          <input
            value={modalInput}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder={modalMode === ModalMode.ADD_HOME ? 'Home Name' : 'Room Name'}
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
