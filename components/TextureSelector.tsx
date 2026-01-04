import { useState, useCallback, useEffect } from 'react';
import { Select, Space, Upload, Button, Modal, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { Texture } from '@/types';
import { useCustomTextures } from '@/hooks/useCustomTextures';
import { useSelector } from 'react-redux';
import { RootState } from '@/stores/store';
import { imageCache } from '@/utils/imageCache';
import { imageDownloadUrlToBase64 } from '@/utils';
import { selectSelectedTexture } from '@/stores/taskStore';
interface TextureSelectorProps {
  title?: string;
  onTextureSelect: (texture: Texture) => void;
  onError?: (error: string) => void;
}

const TextureSelector: React.FC<TextureSelectorProps> = ({
  title = 'Select or Upload Texture',
  onTextureSelect,
  onError,
}) => {
  const activeProjectId = useSelector((state: RootState) => state.project.activeProjectId);
  const selectedTexture = useSelector(selectSelectedTexture);

  const { customTextures, isLoadingTextures, loadTexturesError, addTexture } =
    useCustomTextures(activeProjectId);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [textureName, setTextureName] = useState<string>('');
  const [textureNotes, setTextureNotes] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [textureBase64Map, setTextureBase64Map] = useState<Map<string, string>>(new Map());

  // Load texture previews from cache
  useEffect(() => {
    const loadTexturePreviews = async () => {
      const newMap = new Map<string, string>();

      for (const texture of customTextures) {
        if (texture.textureImageDownloadUrl) {
          try {
            // Try to get from cache first
            let base64 = await imageCache.get(texture.textureImageDownloadUrl);

            // If not in cache, convert and cache it
            if (!base64) {
              base64 = await imageDownloadUrlToBase64(texture.textureImageDownloadUrl);
            }

            if (base64) {
              newMap.set(texture.id, base64);
            }
          } catch (error) {
            console.warn(`Failed to load texture preview for ${texture.name}:`, error);
          }
        }
      }

      setTextureBase64Map(newMap);
    };

    if (customTextures.length > 0) {
      loadTexturePreviews();
    }
  }, [customTextures]);

  // Handle texture upload to Firestore
  const handleTextureUpload = useCallback(
    async (file: File, name: string, notes: string) => {
      try {
        const newTexture = await addTexture({ name, file, notes });

        setUploadError(null);
        setToast({
          open: true,
          message: `Texture "${name}" added successfully!`,
          severity: 'success',
        });

        // Select the newly uploaded texture
        onTextureSelect(newTexture);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save texture';
        setUploadError(message);
        onError?.(message);
        setToast({
          open: true,
          message,
          severity: 'error',
        });
      }
    },
    [addTexture, onTextureSelect, onError]
  );

  const existingNames = new Set(customTextures.map((t) => t.name.toLowerCase()));

  const validateTextureName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Texture name cannot be empty';
    }
    if (name.length > 20) {
      return 'Texture name must be 20 characters or less';
    }
    if (existingNames.has(name.toLowerCase())) {
      return 'This texture name already exists';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);

    // Validate file size (max 5MB for texture)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Texture file must be smaller than 5MB');
      return false;
    }

    // Set default name from file name
    const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setTextureName(defaultName.substring(0, 20)); // Limit initial name to 20 chars
    setPendingFile(file);
    setShowNameModal(true);

    return false; // Prevent default upload
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    const nameError = validateTextureName(textureName);
    if (nameError) {
      setUploadError(nameError);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      await handleTextureUpload(pendingFile, textureName.trim(), textureNotes.trim());

      // Reset state
      setPendingFile(null);
      setTextureName('');
      setTextureNotes('');
      setShowNameModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload texture';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectTexture = (textureId: string) => {
    const texture = customTextures.find((t) => t.id === textureId);
    if (texture) {
      onTextureSelect(texture);
    }
  };

  return (
    <>
      <Typography variant="h6" gutterBottom fontWeight="medium">
        {title}
      </Typography>

      {(uploadError || loadTexturesError) && (
        <Alert
          title="Error"
          severity="error"
          onClose={() => setUploadError(null)}
          style={{ marginBottom: 16 }}
        >
          {uploadError || loadTexturesError}
        </Alert>
      )}

      <Space orientation="vertical" style={{ width: '100%' }} size="small">
        <Select
          placeholder="Select a texture"
          size="large"
          value={selectedTexture?.id || undefined}
          onChange={handleSelectTexture}
          loading={isLoadingTextures}
          options={customTextures.map((texture) => ({
            label: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Texture preview image */}
                {textureBase64Map.has(texture.id) ? (
                  <Box
                    component="img"
                    src={`data:image/jpeg;base64,${textureBase64Map.get(texture.id)}`}
                    alt={texture.name}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      border: '1px solid #d1d5db',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>...</span>
                  </Box>
                )}
                <Box>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {texture.name}
                  </div>
                  {texture.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{texture.notes}</div>
                  )}
                </Box>
              </Box>
            ),
            value: texture.id,
          }))}
          style={{ width: '100%' }}
        />

        {/* Upload Texture Button */}
        <Upload
          beforeUpload={handleFileSelect}
          accept="image/*"
          maxCount={1}
          showUploadList={false}
          style={{ width: '100%' }}
        >
          <Button
            type="dashed"
            size="large"
            block
            icon={<UploadOutlined />}
            loading={isUploading}
            disabled={isUploading}
            style={{ width: '100%' }}
          >
            {isUploading ? 'Uploading...' : 'Upload Texture'}
          </Button>
        </Upload>
      </Space>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Texture Name Input Modal */}
      <Modal
        title="Add Texture"
        open={showNameModal}
        onOk={handleConfirmUpload}
        onCancel={() => {
          setPendingFile(null);
          setTextureName('');
          setTextureNotes('');
          setShowNameModal(false);
          setUploadError(null);
        }}
        confirmLoading={isUploading}
        okText="Upload Texture"
        cancelText="Cancel"
        okButtonProps={{ disabled: isUploading }}
      >
        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}
          >
            Texture Name
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 8 }}>
              {textureName.length}/20
            </span>
          </label>
          <Input
            value={textureName}
            onChange={(e) => setTextureName(e.target.value.substring(0, 20))}
            placeholder="Enter texture name (e.g., Faux Brick)"
            maxLength={20}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}
          >
            Notes (Optional)
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 8 }}>
              {textureNotes.length}/100
            </span>
          </label>
          <Input.TextArea
            value={textureNotes}
            onChange={(e) => setTextureNotes(e.target.value.substring(0, 100))}
            placeholder="Add notes about this texture (e.g., For accent walls)"
            maxLength={100}
            rows={2}
          />
        </div>

        {uploadError && (
          <Alert title="Error" onClose={() => setUploadError(null)} style={{ marginBottom: 16 }}>
            {uploadError}
          </Alert>
        )}

        {pendingFile && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              Preview
            </label>
            <img
              src={URL.createObjectURL(pendingFile)}
              alt="Texture preview"
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default TextureSelector;
