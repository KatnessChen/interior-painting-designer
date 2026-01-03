import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TaskSelector from '@/components/TaskSelector';
import ColorSelector from '@/components/ColorSelector';
import TextureSelector from '@/components/TextureSelector';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';
import {
  selectSelectedTaskNames,
  selectSelectedColor,
  setSelectedColor,
  setSelectedTexture,
} from '@/stores/taskStore';
import { Color, Texture } from '@/types';

const AsideSection: React.FC = () => {
  const dispatch = useDispatch();
  const selectedTaskNames = useSelector(selectSelectedTaskNames);
  const selectedColor = useSelector(selectSelectedColor);

  const isRecolorSelected = selectedTaskNames.includes(GEMINI_TASKS.RECOLOR_WALL.task_name);
  const isTextureSelected = selectedTaskNames.includes(GEMINI_TASKS.ADD_TEXTURE.task_name);

  const handleSelectColor = (color: Color) => {
    dispatch(setSelectedColor(color));
  };

  const handleSelectTexture = (texture: Texture) => {
    dispatch(setSelectedTexture(texture));
  };

  return (
    <aside
      className="w-[240px] p-6 bg-white flex flex-col shadow-lg border-r border-gray-200 overflow-y-auto"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      <TaskSelector />

      {/* Show ColorSelector when Recolor task is selected */}
      {isRecolorSelected && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <ColorSelector title="" selectedColor={selectedColor} onSelectColor={handleSelectColor} />
        </div>
      )}

      {/* Show TextureSelector when Add Texture task is selected */}
      {isTextureSelected && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <TextureSelector title="" onTextureSelect={handleSelectTexture} />
        </div>
      )}
    </aside>
  );
};

export default AsideSection;
