import { Color, Texture, Item } from '@/types';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';

interface UseGenerateButtonStateProps {
  activeTaskName: string | null;
  processingImage: boolean;
  savingImage: boolean;
  canAddOperation: boolean;
  selectedColor: Color | null;
  selectedTexture: Texture | null;
  selectedItem: Item | null;
}

export const useGenerateButtonState = ({
  activeTaskName,
  processingImage,
  savingImage,
  canAddOperation,
  selectedColor,
  selectedTexture,
  selectedItem,
}: UseGenerateButtonStateProps) => {
  let disableReason = '';

  if (processingImage) {
    disableReason = 'Processing image...';
  } else if (savingImage) {
    disableReason = 'Saving image...';
  } else if (!canAddOperation) {
    disableReason = 'Operation limit reached for this image.';
  } else if (!activeTaskName) {
    disableReason = 'Please select a task first.';
  } else if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && !selectedColor) {
    disableReason = 'Please select a color.';
  } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && !selectedTexture) {
    disableReason = 'Please select a texture.';
  } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name && !selectedItem) {
    disableReason = 'Please select a home item.';
  }

  const isDisabled = disableReason !== '';

  return {
    isDisabled,
    disableReason,
  };
};
