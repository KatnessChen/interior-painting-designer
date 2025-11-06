import React, { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import GenericConfirmModal from '../GenericConfirmModal';

interface Room {
  id: string;
  name: string;
}
interface Home {
  id: string;
  name: string;
  rooms: Room[];
}

interface AsideSectionProps {
  onHomeSelected?: (homeId: string) => void;
  onRoomSelected?: (homeId: string, roomId: string) => void;
}

const AsideSection: React.FC<AsideSectionProps> = ({ onHomeSelected, onRoomSelected }) => {
  const [homes, setHomes] = useState<Home[]>([
    // {
    //   id: 'default-home',
    //   name: '5 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
    // {
    //   id: 'default-home-7',
    //   name: '7 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
    // {
    //   id: 'default-home-9',
    //   name: '9 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
    // {
    //   id: 'default-home-11',
    //   name: '11 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
    // {
    //   id: 'default-home-13',
    //   name: '13 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
    // {
    //   id: 'default-home-15',
    //   name: '15 Merrill',
    //   rooms: [
    //     { id: 'room-1', name: 'Living Room' },
    //     { id: 'room-2', name: 'Kitchen' },
    //     { id: 'room-3', name: 'Bathrooms' },
    //   ],
    // },
  ]);
  const [newRoomForms, setNewRoomForms] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const [modalMode, setModalMode] = useState<'add-home' | 'add-room'>('add-home');
  const [modalTargetHomeId, setModalTargetHomeId] = useState<string | null>(null);
  const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
  const [editingHomeName, setEditingHomeName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomHomeId, setEditingRoomHomeId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleAddHome = () => {
    if (!modalInput.trim()) return;
    const newHome = { id: crypto.randomUUID(), name: modalInput.trim(), rooms: [] };
    setHomes((prev) => [...prev, newHome]);
    setModalInput('');
    setModalOpen(false);
    setModalMode('add-home');
  };

  // Add Room to a Home
  const handleAddRoom = (homeId: string) => {
    const roomName = newRoomForms[homeId]?.trim();
    if (!roomName) return;
    setHomes((prev) =>
      prev.map((home) =>
        home.id === homeId
          ? { ...home, rooms: [...home.rooms, { id: crypto.randomUUID(), name: roomName }] }
          : home
      )
    );
    setNewRoomForms((prev) => ({ ...prev, [homeId]: '' }));
  };

  // Edit Home Name
  const handleEditHome = (homeId: string, currentName: string) => {
    setEditingHomeId(homeId);
    setEditingHomeName(currentName);
  };

  const handleSaveEditHome = () => {
    if (!editingHomeName.trim() || !editingHomeId) return;
    setHomes((prev) =>
      prev.map((home) =>
        home.id === editingHomeId ? { ...home, name: editingHomeName.trim() } : home
      )
    );
    setEditingHomeId(null);
    setEditingHomeName('');
  };

  const handleCancelEditHome = () => {
    setEditingHomeId(null);
    setEditingHomeName('');
  };

  // Open modal for adding room
  const openAddRoomModal = (homeId: string) => {
    setModalMode('add-room');
    setModalTargetHomeId(homeId);
    setModalInput('');
    setModalOpen(true);
  };

  // Handle modal submission
  const handleModalSubmit = () => {
    if (!modalInput.trim()) return;

    if (modalMode === 'add-home') {
      handleAddHome();
    } else if (modalMode === 'add-room' && modalTargetHomeId) {
      setHomes((prev) =>
        prev.map((home) =>
          home.id === modalTargetHomeId
            ? {
                ...home,
                rooms: [...home.rooms, { id: crypto.randomUUID(), name: modalInput.trim() }],
              }
            : home
        )
      );
      setModalInput('');
      setModalOpen(false);
      setModalMode('add-home');
      setModalTargetHomeId(null);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalInput('');
    setModalMode('add-home');
    setModalTargetHomeId(null);
  };

  // Delete Home
  const handleDeleteHome = (homeId: string, homeName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Home',
      message: `Are you sure you want to delete "${homeName}"? This action cannot be undone.`,
      onConfirm: () => {
        setHomes((prev) => prev.filter((h) => h.id !== homeId));
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  // Edit Room Name
  const handleEditRoom = (homeId: string, roomId: string, currentName: string) => {
    setEditingRoomHomeId(homeId);
    setEditingRoomId(roomId);
    setEditingRoomName(currentName);
  };

  const handleSaveEditRoom = () => {
    if (!editingRoomName.trim() || !editingRoomId || !editingRoomHomeId) return;
    setHomes((prev) =>
      prev.map((home) =>
        home.id === editingRoomHomeId
          ? {
              ...home,
              rooms: home.rooms.map((room) =>
                room.id === editingRoomId ? { ...room, name: editingRoomName.trim() } : room
              ),
            }
          : home
      )
    );
    setEditingRoomId(null);
    setEditingRoomHomeId(null);
    setEditingRoomName('');
  };

  const handleCancelEditRoom = () => {
    setEditingRoomId(null);
    setEditingRoomHomeId(null);
    setEditingRoomName('');
  };

  // Delete Room
  const handleDeleteRoom = (homeId: string, roomId: string, roomName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Room',
      message: `Are you sure you want to delete "${roomName}"? This action cannot be undone.`,
      onConfirm: () => {
        setHomes((prev) =>
          prev.map((home) =>
            home.id === homeId
              ? { ...home, rooms: home.rooms.filter((r) => r.id !== roomId) }
              : home
          )
        );
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  // Handle Home Selection
  const handleSelectHome = (homeId: string) => {
    setSelectedHomeId(homeId);
    setSelectedRoomId(null);
    onHomeSelected?.(homeId);
  };

  // Handle Room Selection
  const handleSelectRoom = (homeId: string, roomId: string) => {
    setSelectedHomeId(homeId);
    setSelectedRoomId(roomId);
    onRoomSelected?.(homeId, roomId);
  };

  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      {/* Add Home Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md text-gray-500 tracking-tight">New Project</h3>
        <button
          className="p-1 rounded hover:bg-gray-200 transition"
          onClick={() => {
            setModalMode('add-home');
            setModalOpen(true);
          }}
          aria-label="Add Home"
        >
          <AddIcon sx={{ fontSize: '18px' }} className="text-gray-400" />
        </button>
      </div>

      {/* Homes & Rooms List */}
      <nav className="space-y-3 flex-1 overflow-y-auto">
        {homes.map((home) => (
          <div key={home.id}>
            <div
              className={`flex items-center justify-between group pl-2 py-2 cursor-pointer transition-all ${
                selectedHomeId === home.id ? '' : 'hover:bg-gray-50'
              }`}
              onClick={() => !editingHomeId && handleSelectHome(home.id)}
            >
              {editingHomeId === home.id ? (
                <div className="w-full gap-2">
                  <input
                    type="text"
                    value={editingHomeName}
                    onChange={(e) => setEditingHomeName(e.target.value.slice(0, 50))}
                    className="w-full px-2 py-1 border border-gray-300 text-sm focus:ring-1 focus:ring-indigo-500"
                    maxLength={50}
                    autoFocus
                  />
                  <div className="flex gap-1 justify-end mt-1">
                    <button
                      onClick={handleSaveEditHome}
                      className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-md whitespace-nowrap"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditHome}
                      className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-xs rounded-md whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`cursor-pointer ${
                      selectedHomeId === home.id
                        ? 'font-bold text-indigo-600'
                        : 'font-normal text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {home.name}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditHome(home.id, home.name);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition"
                      aria-label="Edit home"
                    >
                      <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddRoomModal(home.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition"
                      aria-label="Add room"
                    >
                      <AddIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHome(home.id, home.name);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition"
                      aria-label="Delete home"
                    >
                      <DeleteIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-0.5">
              {home.rooms.map((room) => (
                <div
                  key={room.id}
                  className={`flex items-center justify-between group pl-4 py-1.5 px-1 text-sm cursor-pointer transition-all ${
                    selectedRoomId === room.id && selectedHomeId === home.id
                      ? 'font-bold text-indigo-600'
                      : 'font-normal text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => !editingRoomId && handleSelectRoom(home.id, room.id)}
                >
                  {editingRoomId === room.id && editingRoomHomeId === home.id ? (
                    <div className="w-full gap-1">
                      <input
                        type="text"
                        value={editingRoomName}
                        onChange={(e) => setEditingRoomName(e.target.value.slice(0, 50))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500"
                        maxLength={50}
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end mt-1">
                        <button
                          onClick={handleSaveEditRoom}
                          className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-md whitespace-nowrap"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditRoom}
                          className="px-2 py-0 text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 rounded whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="cursor-pointer">{room.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoom(home.id, room.id, room.name);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          aria-label="Edit room"
                        >
                          <EditIcon sx={{ fontSize: '16px' }} className="text-gray-500" />
                        </button>
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
                      </div>
                    </>
                  )}
                </div>
              ))}
              {home.rooms.length === 0 && (
                <div className="text-xs text-gray-400 px-3 py-1">No rooms yet.</div>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Universal Modal for adding home or room */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {modalMode === 'add-home' ? 'Add New Home' : 'Add New Room'}
          </h2>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder={modalMode === 'add-home' ? 'Home Name' : 'Room Name'}
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md font-semibold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              onClick={handleModalSubmit}
              disabled={!modalInput.trim()}
            >
              Add
            </button>
            <button
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-semibold transition-colors shadow-sm"
              onClick={handleCloseModal}
            >
              Cancel
            </button>
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
