import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TaskSelector from '@/components/TaskSelector';
import ColorSelector from '@/components/ColorSelector';
import TextureSelector from '@/components/TextureSelector';
import ItemSelector from '@/components/ItemSelector';
import ToolkitPanel from './ToolkitPanel';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';
import {
  selectSelectedTaskNames,
  selectSelectedColor,
  setSelectedColor,
  setSelectedTexture,
  setSelectedItem,
} from '@/stores/taskStore';
import { Color, Texture, Item } from '@/types';

const AsideSection: React.FC = () => {
  const dispatch = useDispatch();
  const selectedTaskNames = useSelector(selectSelectedTaskNames);
  const selectedColor = useSelector(selectSelectedColor);

  const isRecolorSelected = selectedTaskNames.includes(GEMINI_TASKS.RECOLOR_WALL.task_name);
  const isTextureSelected = selectedTaskNames.includes(GEMINI_TASKS.ADD_TEXTURE.task_name);
  const isItemSelected = selectedTaskNames.includes(GEMINI_TASKS.ADD_HOME_ITEM.task_name);

  const handleSelectColor = (color: Color) => {
    dispatch(setSelectedColor(color));
  };

  const handleSelectTexture = (texture: Texture) => {
    dispatch(setSelectedTexture(texture));
  };

  const handleSelectItem = (item: Item) => {
    dispatch(setSelectedItem(item));
  };

  return (
    <aside className="h-full w-[250px] bg-white flex flex-col shadow-lg border-r border-gray-200 overflow-y-auto">
      <TaskSelector />

      {/* Show ColorSelector when Recolor task is selected */}
      {isRecolorSelected && (
        <div className="pt-6 border-t border-gray-200 px-6">
          <ColorSelector title="" selectedColor={selectedColor} onSelectColor={handleSelectColor} />
        </div>
      )}

      {/* Show TextureSelector when Add Texture task is selected */}
      {isTextureSelected && (
        <div className="pt-6 border-t border-gray-200 px-6">
          <TextureSelector title="" onTextureSelect={handleSelectTexture} />
        </div>
      )}

      {/* Show ItemSelector when Add Home Item task is selected */}
      {isItemSelected && (
        <div className="pt-6 border-t border-gray-200 px-6">
          <ItemSelector title="" onItemSelect={handleSelectItem} />
        </div>
      )}

      {/* Toolkit Panel at the bottom */}
      <div className="mt-auto border-t border-gray-200">
        <ToolkitPanel />
      </div>
    </aside>
  );
};

export default AsideSection;
