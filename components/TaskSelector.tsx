import React from 'react';
import { GEMINI_TASKS, GeminiTaskName } from '../services/gemini/geminiTasks';

interface TaskSelectorProps {
  selectedTaskName: GeminiTaskName;
  onSelectTask: (taskName: GeminiTaskName) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ selectedTaskName, onSelectTask }) => {
  const tasks = [
    { id: GEMINI_TASKS.RECOLOR_WALL.task_name, label: 'Recolor Walls', icon: '🎨' },
    // TODO: integrate add texture feature with Firestore/Storage
    { id: GEMINI_TASKS.ADD_TEXTURE.task_name, label: 'Add Texture', icon: '🧱' },
  ];

  return (
    <div className="mb-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl text-gray-800 mb-6 text-center tracking-tight">
        What do you want to do today?
      </h2>

      <div className="flex gap-4 justify-center flex-wrap">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onSelectTask(task.id as GeminiTaskName)}
            className={`px-8 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
              selectedTaskName === task.id
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg ring-2 ring-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-2xl">{task.icon}</span>
            {task.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskSelector;
