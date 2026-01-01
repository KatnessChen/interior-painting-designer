import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Typography,
  Snackbar,
  Tooltip,
  IconButton,
  Drawer,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { ImageData, Color, ImageOperation } from '@/types';
import { imageCache } from '@/utils/imageCache';
import { wallRecolorPrompts } from '@/services/gemini/prompts';
import { GEMINI_TASKS } from '@/services/gemini/geminiTasks';
import { createImage } from '@/services/firestoreService';
import { formatImageOperationData, formatTaskName } from '@/utils';
import { selectActiveProjectId, selectActiveSpaceId } from '@/stores/projectStore';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import ColorSelector from './ColorSelector';
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

  const [cachedImageSrc, setCachedImageSrc] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<{ base64: string; mimeType: string } | null>(
    null
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isDefaultPromptExpanded, setIsDefaultPromptExpanded] = useState(false);

  // Use image processing hook
  const { processImage, processingImage, errorMessage, setErrorMessage } = useImageProcessing({
    userId,
    selectedTaskName: GEMINI_TASKS.RECOLOR_WALL.task_name,
    options: {
      selectedColor,
      selectedTexture: null,
    },
  });

  // Calculate default prompt based on selected color
  const defaultPrompt = useMemo(() => {
    return wallRecolorPrompts(selectedColor?.name, selectedColor?.hex, undefined);
  }, [selectedColor]);

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
    if (!selectedColor) {
      setValidationError('Please select a color before generating.');
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

    console.log('[GenerateMoreModal] Starting recolor with:', {
      userId,
      sourceImageId: sourceImage.id,
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      hasCustomPrompt: !!customPrompt.trim(),
    });

    const result = await processImage(sourceImage, customPrompt.trim() || undefined);

    if (result) {
      console.log('[GenerateMoreModal] Recolor successful, result:', {
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

    setSnackbarMessage('Settings applied from last operation');
    setSnackbarOpen(true);
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
    if (!sourceImage || !selectedColor || !userId || !activeProjectId || !activeSpaceId) {
      setErrorMessage('Missing required data to save image.');
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
        GEMINI_TASKS.RECOLOR_WALL.task_name,
        customPrompt.trim() || undefined,
        selectedColor,
        null // no texture for recolor
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

  if (!sourceImage) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={processingImage || savingImage}
    >
      <DialogTitle>
        <Typography variant="h5" component="div" fontWeight="bold">
          Generate More Images
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Create a new color variation from this image
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Error Messages */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {validationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

        {/* Loading Overlay */}
        {processingImage && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 10,
              gap: 2,
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
              Generating new image...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Left Column: Source Image */}
          <Box sx={{ minWidth: 0, flex: 4, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="medium">
              Current Image
            </Typography>

            {/* Image Info */}
            <Box sx={{ mb: 2 }}>
              <Tooltip title={sourceImage.name} arrow>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <strong>Filename:</strong> {sourceImage.name}
                </Typography>
              </Tooltip>
              <Typography variant="body2">
                <strong>Created:</strong>{' '}
                {sourceImage.createdAt instanceof Object && 'toDate' in sourceImage.createdAt
                  ? sourceImage.createdAt.toDate().toLocaleString()
                  : new Date(sourceImage.createdAt).toLocaleString()}
              </Typography>
            </Box>

            {/* Source Image Preview */}
            <Box
              sx={{
                flex: 1,
                minHeight: 400,
                backgroundColor: '#f3f4f6',
                borderRadius: 2,
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
            </Box>
          </Box>

          {/* Right Column: Color Selector & Custom Prompt */}
          <Box sx={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Last Operation Info */}
            {lastOperation && (
              <div>
                <Typography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
                  Last Operation
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Task:</strong> {formatTaskName(lastOperation.taskName)}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Color:</strong> {lastOperation.options.colorSnapshot?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Custom Prompt:</strong> {lastOperation.customPrompt || 'N/A'}
                    </Typography>
                  </Box>
                  <Button
                    onClick={applyLastOperation}
                    variant="outlined"
                    color="primary"
                    size="small"
                  >
                    Apply
                  </Button>
                </Box>
              </div>
            )}

            {/* Color Selector */}
            <Box>
              <ColorSelector selectedColor={selectedColor} onSelectColor={setSelectedColor} />
            </Box>

            {/* Custom Prompt */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="h6" fontWeight="medium">
                  Custom Prompt (Optional)
                </Typography>
                <Button
                  onClick={() => setIsDefaultPromptExpanded(true)}
                  endIcon={<InfoIcon />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    color: 'primary.main',
                    p: 0,
                    '&:hover': { backgroundColor: 'transparent' },
                  }}
                >
                  View Default Prompt
                </Button>
              </Box>

              {/* Custom Prompt Input */}
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Enter any specific instructions for the AI... (e.g., 'Make the walls lighter', 'Add more warmth to the color')"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value.slice(0, 200))}
                disabled={processingImage}
                variant="outlined"
                helperText={`${customPrompt.length}/200 characters`}
                inputProps={{ maxLength: 200 }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={processingImage || savingImage}
          variant="outlined"
          size="large"
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={processingImage || savingImage}
          variant="contained"
          size="large"
          color="primary"
        >
          Generate
        </Button>
      </DialogActions>

      {/* Confirmation Modal for Generated Image */}
      {sourceImage && generatedImage && (
        <ConfirmImageUpdateModal
          isOpen={showConfirmationModal}
          originalImage={sourceImage}
          generatedImage={generatedImage}
          onConfirm={handleConfirmImage}
          onCancel={handleCancelConfirmation}
          colorName={selectedColor?.name || 'N/A'}
        />
      )}

      {/* Snackbar for Apply Success */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* Default Prompt Drawer */}
      <Drawer
        anchor="right"
        open={isDefaultPromptExpanded}
        onClose={() => setIsDefaultPromptExpanded(false)}
        style={{ zIndex: 1400 }}
      >
        <Box
          sx={{
            width: 400,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="medium">
              Default Prompt
            </Typography>
            <IconButton
              onClick={() => setIsDefaultPromptExpanded(false)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
            </IconButton>
          </Box>

          <Box
            sx={{
              backgroundColor: '#f3f4f6',
              borderRadius: 1,
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: 'text.secondary',
              border: '1px solid #e5e7eb',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              flex: 1,
              overflow: 'auto',
            }}
          >
            {defaultPrompt}
          </Box>
        </Box>
      </Drawer>
    </Dialog>
  );
};

export default GenerateMoreModal;
