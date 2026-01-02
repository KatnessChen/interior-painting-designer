import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { GEMINI_TASKS, GeminiTaskName } from '@/services/gemini/geminiTasks';
import {
  selectSelectedTaskNames,
  setSelectedTaskNames,
  setSelectedColor,
  setSelectedTexture,
} from '@/stores/taskStore';
import { useAuth } from '@/contexts/AuthContext';

interface TaskSelectorProps {
  onTaskChange?: (taskNames: GeminiTaskName[]) => void;
  onError?: (message: string | null) => void;
  onModalStateChange?: (isOpen: boolean) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({
  onTaskChange,
  onError,
  onModalStateChange,
}) => {
  const dispatch = useDispatch();
  const selectedTaskNames = useSelector(selectSelectedTaskNames);

  const { user } = useAuth();

  useEffect(() => {
    dispatch(setSelectedTaskNames([GEMINI_TASKS.RECOLOR_WALL.task_name]));
  }, [dispatch]);

  // Reset related state when tasks change
  const resetRelatedState = useCallback(() => {
    dispatch(setSelectedColor(null));
    dispatch(setSelectedTexture(null));
    onModalStateChange?.(false); // Close any open confirmation modal
    onError?.(null); // Clear any error messages
  }, [dispatch, onModalStateChange, onError]);

  const tasks = [
    {
      value: GEMINI_TASKS.RECOLOR_WALL.task_name,
      label: 'Recolor Walls',
      icon: '🎨',
    },
    {
      value: GEMINI_TASKS.ADD_TEXTURE.task_name,
      label: 'Add Texture',
      icon: '🧱',
    },
  ];

  const handleTaskChange = (taskValue: GeminiTaskName) => (e: CheckboxChangeEvent) => {
    const isChecked = e.target.checked;
    let newSelectedTasks: GeminiTaskName[];

    if (isChecked) {
      // Add task if not already selected
      if (!selectedTaskNames.includes(taskValue)) {
        newSelectedTasks = [...selectedTaskNames, taskValue];
      } else {
        return; // Already selected
      }
    } else {
      // Remove task
      newSelectedTasks = selectedTaskNames.filter((name) => name !== taskValue);
    }

    // Update Redux store
    dispatch(setSelectedTaskNames(newSelectedTasks));

    // Reset related state when tasks change
    resetRelatedState();

    // Call optional callback
    onTaskChange?.(newSelectedTasks);
  };

  const firstName = user?.displayName?.split(' ')[0] || '';

  return (
    <div className="space-y-4">
      <h2 className="text-lg text-gray-800">
        👋 Hi {firstName || ''}! Select your tasks to get started.
      </h2>

      <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
        {tasks.map((task) => (
          <div
            key={task.value}
            className={`
              relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
              min-w-[200px] flex-shrink-0
              ${
                selectedTaskNames.includes(task.value as GeminiTaskName)
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
            onClick={() =>
              handleTaskChange(task.value as GeminiTaskName)({
                target: { checked: !selectedTaskNames.includes(task.value as GeminiTaskName) },
              } as CheckboxChangeEvent)
            }
          >
            <Checkbox
              checked={selectedTaskNames.includes(task.value as GeminiTaskName)}
              onChange={handleTaskChange(task.value as GeminiTaskName)}
              className="pointer-events-none"
            />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{task.icon}</span>
              <span
                className={`font-medium ${
                  selectedTaskNames.includes(task.value as GeminiTaskName)
                    ? 'text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                {task.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskSelector;
