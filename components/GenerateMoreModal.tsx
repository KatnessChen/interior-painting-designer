import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Modal, Button, Input, Spin, Alert, Tooltip, Drawer, Typography, message } from 'antd';
import { InfoCircleOutlined, BulbOutlined, CloseOutlined } from '@ant-design/icons';
import { ImageData, Color, Texture, Item, ImageOperation } from '@/types';
import { imageCache } from '@/utils/imageCache';
import {
  getWallRecolorPrompt,
  getAddTexturePrompt,
  getItemPrompt,
} from '@/services/gemini/prompts';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';
import { createImage } from '@/services/firestoreService';
import { formatImageOperationData, formatTaskName } from '@/utils';
import { checkOperationLimit, getLimitExceededMessage } from '@/utils/limitationUtils';
import { selectActiveProjectId, selectActiveSpaceId } from '@/stores/projectStore';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { useGenerateButtonState } from '@/hooks/useGenerateButtonState';
import {
  selectSelectedColor,
  selectSelectedTexture,
  selectSelectedItem,
  selectSelectedTaskNames,
} from '@/stores/taskStore';
import ConfirmImageUpdateModal from './ConfirmImageUpdateModal';
import SelectedAssets from '@/components/SelectedAssets';
import { MAX_OPERATIONS_PER_IMAGE } from '@/constants';

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
  const preselectItem = useSelector(selectSelectedItem);

  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(preselectedColor);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(preselectTexture);
  const [selectedItem, setSelectedItem] = useState<Item | null>(preselectItem);
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
      selectedItem,
    },
  });

  // Calculate default prompt based on active task
  const defaultPrompt = useMemo(() => {
    if (!activeTaskName) return '';

    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return getWallRecolorPrompt(selectedColor?.name, selectedColor?.hex, undefined);
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return getAddTexturePrompt(selectedTexture?.name || '', undefined);
    } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name) {
      return getItemPrompt(selectedItem?.name || '', undefined);
    }
    return '';
  }, [activeTaskName, selectedColor, selectedTexture, selectedItem]);

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
    // Check operation limit first
    const operationLimitCheck = checkOperationLimit(sourceImage);
    if (!operationLimitCheck.canAdd) {
      setErrorMessage(getLimitExceededMessage('operations', MAX_OPERATIONS_PER_IMAGE));
      return;
    }

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

    if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name && !selectedItem) {
      setValidationError('Please select a home item.');
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

    if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name && !selectedItem) {
      setErrorMessage('Home item information is required.');
      return;
    }

    setSavingImage(true);
    setShowConfirmationModal(false);

    try {
      // Check operation limit on source image
      const operationLimitCheck = checkOperationLimit(sourceImage);
      if (!operationLimitCheck.canAdd) {
        setErrorMessage(getLimitExceededMessage('operations', MAX_OPERATIONS_PER_IMAGE));
        setSavingImage(false);
        setShowConfirmationModal(true);
        return;
      }

      const tempImageId = crypto.randomUUID();
      const imageName = customName;

      // Create ImageOperation for evolution chain
      const operation: ImageOperation = formatImageOperationData(
        sourceImage,
        activeTaskName,
        customPrompt.trim() || undefined,
        selectedColor,
        selectedTexture,
        selectedItem
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
    } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name) {
      return 'Add New Elements';
    }
    return 'Generate More Images';
  };

  const getModalDescription = () => {
    if (!activeTaskName) return 'Please select a task first';

    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return 'Create a new color variation from this image';
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return 'Apply a texture pattern to the wall surface';
    } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name) {
      return 'Integrate new objects or characters into your space';
    }
    return 'Transform this image';
  };

  // Dynamic prompt placeholder based on task
  const getPromptPlaceholder = () => {
    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return "Enter specific color instructions... (e.g., 'Make it a matte finish', 'Apply to the accent wall only')";
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return "Describe how to apply the texture... (e.g., 'Apply to the upper half only', 'Make the pattern smaller')";
    } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name) {
      return "Describe what you want to add... (e.g., 'A person reading on the sofa', 'A cat sleeping near the window', 'A modern floor lamp')";
    }
    return "Enter any specific instructions for the AI... (e.g., 'Make the walls lighter', 'Add more warmth to the color')";
  };

  const sharedTip =
    'The more specific your description is, the better the AI can generate an image that matches what you’re looking for. Try to clearly specify: ';

  const getPromptWritingGuide = () => {
    if (activeTaskName === GEMINI_TASKS.RECOLOR_WALL.task_name) {
      return {
        tips: [
          {
            text:
              sharedTip +
              "which wall(s) to recolor? (e.g., 'only the accent wall', 'all walls except the ceiling').",
            hasButton: false,
          },
        ],
      };
    } else if (activeTaskName === GEMINI_TASKS.ADD_TEXTURE.task_name) {
      return {
        tips: [
          {
            text:
              sharedTip +
              "which wall(s) to apply it to? (e.g., 'the lower half only', 'behind the sofa')",
            hasButton: false,
          },
        ],
      };
    } else if (activeTaskName === GEMINI_TASKS.ADD_HOME_ITEM.task_name) {
      return {
        tips: [
          {
            text:
              sharedTip +
              "where to place the item and what angle? (e.g., 'corner by the window', 'center of the room facing left')",
            hasButton: false,
          },
        ],
      };
    }
    return { tips: [] };
  };

  if (!sourceImage) return null;

  // Check operation limit to show warning and disable button
  const operationLimitCheck = checkOperationLimit(sourceImage);
  const hasReachedOperationLimit = !operationLimitCheck.canAdd;

  // Get generate button state
  const { isDisabled: isGenerateDisabled, disableReason } = useGenerateButtonState({
    activeTaskName,
    processingImage,
    savingImage,
    canAddOperation: operationLimitCheck.canAdd,
    selectedColor,
    selectedTexture,
    selectedItem,
  });

  return (
    <>
      <Modal
        title={
          <div className="mb-4">
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
          <Tooltip title={isGenerateDisabled ? disableReason : ''} key="generate-tooltip">
            <Button
              key="generate"
              type="primary"
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              size="large"
            >
              Generate
            </Button>
          </Tooltip>,
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
            <div
              style={{
                flex: '1 1 400px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minWidth: 0,
              }}
            >
              <SelectedAssets />

              {/* Custom Prompt */}
              <div>
                <Typography.Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                  Custom Prompt (Optional)
                </Typography.Title>

                {/* Custom Prompt Input */}
                <Input.TextArea
                  rows={6}
                  placeholder={getPromptPlaceholder()}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                  disabled={processingImage}
                  maxLength={500}
                  showCount
                />
              </div>

              {/* Prompt Writing Guide */}
              {activeTaskName && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: '#e6f7ff',
                    borderRadius: 6,
                    border: '1px solid #91d5ff',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {getPromptWritingGuide().tips.map((tip, index) => (
                      <div
                        key={index}
                        style={{
                          fontSize: '0.85rem',
                        }}
                      >
                        <h6>
                          <BulbOutlined className="mr-2" style={{ color: '#1890ff' }} />
                          Tips to write custom prompt:
                        </h6>
                        <span>{tip.text}.</span>
                        <br />
                        <span>
                          You can also review the{' '}
                          <Button
                            type="link"
                            onClick={() => setIsDefaultPromptExpanded(true)}
                            style={{
                              padding: '0',
                              margin: '0 6px',
                              height: 'auto',
                            }}
                          >
                            default prompt
                            <InfoCircleOutlined />
                          </Button>{' '}
                        </span>{' '}
                        to understand what’s applied behind the scenes.
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hasReachedOperationLimit && (
                <Alert
                  title={getLimitExceededMessage('operations', MAX_OPERATIONS_PER_IMAGE)}
                  type="warning"
                  showIcon
                  style={{ margin: 0 }}
                />
              )}
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
          itemName={selectedItem?.name}
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
