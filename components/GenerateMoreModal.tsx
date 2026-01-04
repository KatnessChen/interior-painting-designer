import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Modal, Button, Input, Spin, Alert, Tooltip, Drawer, Typography, message } from 'antd';
import { InfoCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { ImageData, Color, Texture, ImageOperation } from '@/types';
import { imageCache } from '@/utils/imageCache';
import { wallRecolorPrompts, texturePrompts } from '@/services/gemini/prompts';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';
import { createImage } from '@/services/firestoreService';
import { formatImageOperationData, formatTaskName } from '@/utils';
import { selectActiveProjectId, selectActiveSpaceId } from '@/stores/projectStore';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import {
  selectSelectedColor,
  selectSelectedTexture,
  selectSelectedTaskNames,
} from '@/stores/taskStore';
import ColorSelector from './ColorSelector';
import TextureSelector from './TextureSelector';
import ConfirmImageUpdateModal from './ConfirmImageUpdateModal';

interface GenerateMoreModalProps {
  isOpen: boolean;
  sourceImage: ImageData | null;
  userId: string | undefined;
  onSuccess: () => void; // Called after successful save to refresh images
  onCancel: () => void;
}

const GenerateMoreModal: React.FC<GenerateMoreModalProps> = ({
  isOpen,
  sourceImage,
  userId,
  onSuccess,
  onCancel,
}) => {
  // Get active project and space from Redux store
  const activeProjectId = useSelector(selectActiveProjectId);
  const activeSpaceId = useSelector(selectActiveSpaceId);

  const selectedTaskNames = useSelector(selectSelectedTaskNames);
  const preselectedColor = useSelector(selectSelectedColor);
  const preselectTexture = useSelector(selectSelectedTexture);

  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(preselectedColor);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(preselectTexture);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(
    null
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [isDefaultPromptExpanded, setIsDefaultPromptExpanded] = useState(false);

  // Determine the active task from selectedTaskNames (assuming single task)
  const activeTaskName = useMemo(() => {
    if (selectedTaskNames.length === 0) return null;
    return selectedTaskNames[0];
  }, [selectedTaskNames]);

  // Use image processing hook
  const { processImage, processingImage, errorMessage, setErrorMessage } = useImageProcessing({
    userId,
    selectedTaskName: activeTaskName || GEMINI_TASKS.RECOLOR_WALL.task_name,
    options: {
      selectedColor,
      selectedTexture,
    },
  });

  // Calculate default prompt based on active task
  const defaultPrompt = useMemo(() => {
    if (!activeTaskName) return '';

    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return wallRecolorPrompts(selectedColor?.name, selectedColor?.hex, undefined);
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return texturePrompts(selectedTexture?.name || '', undefined);
    }
    return '';
  }, [activeTaskName, selectedColor, selectedTexture]);

  // Load cached image
  useEffect(() => {
    const loadCachedImage = async () => {
      if (!sourceImage) return;

      try {
        const base64 = await imageCache.get(sourceImage.imageDownloadUrl);
        if (base64) {
          setCachedImageSrc(`data:${sourceImage.mimeType};base64,${base64}`);
        } else {
          setCachedImageSrc(null);
        }
      } catch (error) {
        console.warn('[GenerateMoreModal] Failed to load cached image:', error);
        setCachedImageSrc(null);
      }
    };

    loadCachedImage();
  }, [sourceImage]);

  // Clear validation error when color changes
  useEffect(() => {
    if (selectedColor) {
      setValidationError(null);
    }
  }, [selectedColor]);

  const handleGenerate = async () => {
    // Check if a task is selected
    if (!activeTaskName) {
      setValidationError('Please select a task first.');
      return;
    }

    // Validate based on task type
    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && !selectedColor) {
      setValidationError('Please select a color for recoloring.');
      return;
    }

    if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && !selectedTexture) {
      setValidationError('Please select a texture.');
      return;
    }

    if (!sourceImage) {
      setValidationError('No source image available.');
      return;
    }

    if (!userId) {
      setErrorMessage('User ID is required to process images.');
      return;
    }

    setValidationError(null);

    console.log('[GenerateMoreModal] Starting image processing with:', {
      userId,
      sourceImageId: sourceImage.id,
      taskName: activeTaskName,
      colorName: selectedColor?.name,
      colorHex: selectedColor?.hex,
      textureName: selectedTexture?.name,
      textureUrl: selectedTexture?.textureImageDownloadUrl,
      hasCustomPrompt: !!customPrompt.trim(),
    });

    const result = await processImage(sourceImage, customPrompt.trim() || undefined);

    if (result) {
      console.log('[GenerateMoreModal] Processing successful, result:', {
        hasMimeType: !!result.mimeType,
        hasBase64: !!result.base64,
        base64Length: result.base64?.length || 0,
      });

      setGeneratedImage(result);
      setShowConfirmationModal(true);
    }
  };

  const applyLastOperation = () => {
    if (!sourceImage || sourceImage.evolutionChain.length === 0) {
      return;
    }

    const lastOperation = sourceImage.evolutionChain[sourceImage.evolutionChain.length - 1];

    // Apply color
    if (lastOperation.options.colorSnapshot && lastOperation.options.colorId) {
      setSelectedColor({
        id: lastOperation.options.colorId,
        name: lastOperation.options.colorSnapshot.name,
        hex: lastOperation.options.colorSnapshot.hex,
      });
    }

    // Apply custom prompt
    if (lastOperation.customPrompt) {
      setCustomPrompt(lastOperation.customPrompt);
    }

    message.success('Settings applied from last operation');
  };

  const handleClose = () => {
    if (!processingImage && !savingImage) {
      setValidationError(null);
      setErrorMessage(null);
      setCustomPrompt('');
      setGeneratedImage(null);
      setShowConfirmationModal(false);
      onCancel();
    }
  };

  const handleConfirmImage = async (
    imageData: { base64: string; mimeType: string },
    customName: string
  ) => {
    if (!sourceImage || !userId || !activeProjectId || !activeSpaceId || !activeTaskName) {
      setErrorMessage('Missing required data to save image.');
      return;
    }

    // Validate based on task type
    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name && !selectedColor) {
      setErrorMessage('Color information is required.');
      return;
    }

    if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name && !selectedTexture) {
      setErrorMessage('Texture information is required.');
      return;
    }

    setSavingImage(true);
    setShowConfirmationModal(false);

    try {
      const tempImageId = crypto.randomUUID();
      const imageName = customName;

      // Create ImageOperation for evolution chain
      const operation: ImageOperation = formatImageOperationData(
        sourceImage,
        activeTaskName,
        customPrompt.trim() || undefined,
        selectedColor,
        selectedTexture
      );

      // Save processed image to Firestore
      await createImage(
        userId,
        activeProjectId,
        activeSpaceId,
        null,
        {
          id: tempImageId,
          name: imageName,
          mimeType: imageData.mimeType,
        },
        {
          base64: imageData.base64,
          base64MimeType: imageData.mimeType,
          parentImage: sourceImage,
          operation,
        }
      );

      // Reset all state
      setCustomPrompt('');
      setGeneratedImage(null);
      setErrorMessage(null);
      setValidationError(null);
      setSavingImage(false);

      // Notify parent to refresh images
      onSuccess();
    } catch (error) {
      console.error('Failed to save processed image:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save processed image.');
      setSavingImage(false);
      setShowConfirmationModal(true); // Reopen confirmation modal on error
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false);
    setGeneratedImage(null);
  };

  const lastOperation = sourceImage?.evolutionChain[sourceImage.evolutionChain.length - 1];

  // Dynamic modal title based on task
  const getModalTitle = () => {
    if (!activeTaskName) return 'Generate Image';

    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return 'Generate Recolored Image';
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return 'Apply Texture to Wall';
    }
    return 'Generate More Images';
  };

  const getModalDescription = () => {
    if (!activeTaskName) return 'Please select a task first';

    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return 'Create a new color variation from this image';
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return 'Apply a texture pattern to the wall surface';
    }
    return 'Transform this image';
  };

  if (!sourceImage) return null;

  return (
    <>
      <Modal
        title={
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {getModalTitle()}
            </Typography.Title>
            <Typography.Text type="secondary">{getModalDescription()}</Typography.Text>
          </div>
        }
        open={isOpen}
        onCancel={handleClose}
        width={1200}
        maskClosable={!processingImage && !savingImage}
        keyboard={!processingImage && !savingImage}
        footer={[
          <Button
            key="cancel"
            onClick={handleClose}
            disabled={processingImage || savingImage}
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="generate"
            type="primary"
            onClick={handleGenerate}
            disabled={!activeTaskName || processingImage || savingImage}
            size="large"
          >
            Generate
          </Button>,
        ]}
      >
        <Spin spinning={processingImage} tip="Generating new image..." size="large">
          {/* Error Messages */}
          {errorMessage && (
            <Alert title={errorMessage} type="error" showIcon style={{ marginBottom: 16 }} />
          )}
          {validationError && (
            <Alert title={validationError} type="warning" showIcon style={{ marginBottom: 16 }} />
          )}

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {/* Left Column: Source Image */}
            <div
              style={{ minWidth: 0, flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}
            >
              <Typography.Title level={5}>Current Image</Typography.Title>

              {/* Image Info */}
              <div style={{ marginBottom: 16 }}>
                <Tooltip title={sourceImage.name}>
                  <div
                    style={{
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <strong>Filename:</strong> {sourceImage.name}
                  </div>
                </Tooltip>
                <div>
                  <strong>Created:</strong>{' '}
                  {sourceImage.createdAt instanceof Object && 'toDate' in sourceImage.createdAt
                    ? sourceImage.createdAt.toDate().toLocaleString()
                    : new Date(sourceImage.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Last Operation Info */}
              {lastOperation && (
                <div style={{ marginBottom: 16 }}>
                  <Typography.Title level={5} style={{ marginBottom: 8 }}>
                    Last Operation
                  </Typography.Title>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Task:</strong> {formatTaskName(lastOperation.taskName)}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Color:</strong> {lastOperation.options.colorSnapshot?.name || 'N/A'}
                      </div>
                      <div>
                        <strong>Custom Prompt:</strong> {lastOperation.customPrompt || 'N/A'}
                      </div>
                    </div>
                    <Button onClick={applyLastOperation} size="small">
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {/* Source Image Preview */}
              <div
                style={{
                  flex: 1,
                  minHeight: 400,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                }}
              >
                <img
                  src={cachedImageSrc || sourceImage.imageDownloadUrl}
                  alt={sourceImage.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>

            {/* Right Column: Color Selector & Custom Prompt */}
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedTaskNames.includes('recolor_wall') && (
                <div>
                  <ColorSelector selectedColor={selectedColor} onSelectColor={setSelectedColor} />
                </div>
              )}

              {selectedTaskNames.includes('add_texture') && (
                <div>
                  <TextureSelector onTextureSelect={setSelectedTexture} />
                </div>
              )}

              {/* Custom Prompt */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    Custom Prompt (Optional)
                  </Typography.Title>
                  <Button
                    type="link"
                    onClick={() => setIsDefaultPromptExpanded(true)}
                    icon={<InfoCircleOutlined />}
                    style={{ padding: 0 }}
                  >
                    View Default Prompt
                  </Button>
                </div>

                {/* Custom Prompt Input */}
                <Input.TextArea
                  rows={6}
                  placeholder="Enter any specific instructions for the AI... (e.g., 'Make the walls lighter', 'Add more warmth to the color')"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                  disabled={processingImage}
                  maxLength={200}
                  showCount
                />
              </div>
            </div>
          </div>
        </Spin>
      </Modal>

      {/* Confirmation Modal for Generated Image */}
      {sourceImage && generatedImage && activeTaskName && (
        <ConfirmImageUpdateModal
          isOpen={showConfirmationModal}
          originalImage={sourceImage}
          generatedImage={generatedImage}
          onConfirm={handleConfirmImage}
          onCancel={handleCancelConfirmation}
          taskName={activeTaskName}
          colorName={selectedColor?.name}
          textureName={selectedTexture?.name}
        />
      )}

      {/* Default Prompt Drawer */}
      <Drawer
        title="Default Prompt"
        placement="right"
        open={isDefaultPromptExpanded}
        onClose={() => setIsDefaultPromptExpanded(false)}
        size="default"
        closeIcon={<CloseOutlined />}
      >
        <div
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 4,
            padding: 16,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: '#666',
            border: '1px solid #e5e7eb',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'auto',
          }}
        >
          {defaultPrompt}
        </div>
      </Drawer>
    </>
  );
};

export default GenerateMoreModal;
