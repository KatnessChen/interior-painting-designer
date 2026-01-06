import { useState, useCallback, useEffect } from 'react';
import { Select, Typography, Space, Upload, Button, Modal, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Box, Snackbar, Alert } from '@mui/material';
import { Item } from '@/types';
import { useCustomItems } from '@/hooks/useCustomItems';
import { useSelector } from 'react-redux';
import { RootState } from '@/stores/store';
import { imageCache } from '@/utils/imageCache';
import { imageDownloadUrlToBase64 } from '@/utils';
import { selectSelectedItem } from '@/stores/taskStore';
import { MAX_CUSTOM_ASSET_NAME_LENGTH, MAX_CUSTOM_ASSET_DESCRIPTION_LENGTH } from '@/constants';

interface ItemSelectorProps {
  title?: string;
  onItemSelect: (item: Item) => void;
  onError?: (error: string) => void;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  title = 'Select or Upload Home Item',
  onItemSelect,
  onError,
}) => {
  const activeProjectId = useSelector((state: RootState) => state.project.activeProjectId);
  const selectedItem = useSelector(selectSelectedItem);

  const { customItems, isLoadingItems, loadItemsError, addItem } = useCustomItems(activeProjectId);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [itemBase64Map, setItemBase64Map] = useState<Map<string, string>>(new Map());

  // Load item previews from cache
  useEffect(() => {
    const loadItemPreviews = async () => {
      const newMap = new Map<string, string>();

      for (const item of customItems) {
        if (item.itemImageDownloadUrl) {
          try {
            // Try to get from cache first
            let base64 = await imageCache.get(item.itemImageDownloadUrl);

            // If not in cache, convert and cache it
            if (!base64) {
              base64 = await imageDownloadUrlToBase64(item.itemImageDownloadUrl);
            }

            if (base64) {
              newMap.set(item.id, base64);
            }
          } catch (error) {
            console.warn(`Failed to load item preview for ${item.name}:`, error);
          }
        }
      }

      setItemBase64Map(newMap);
    };

    if (customItems.length > 0) {
      loadItemPreviews();
    }
  }, [customItems]);

  // Handle item upload to Firestore
  const handleItemUpload = useCallback(
    async (file: File, name: string, description: string) => {
      try {
        const newItem = await addItem({ name, file, description });

        setUploadError(null);
        setToast({
          open: true,
          message: `Home item "${name}" added successfully!`,
          severity: 'success',
        });

        // Select the newly uploaded item
        onItemSelect(newItem);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save home item';
        setUploadError(message);
        onError?.(message);
        setToast({
          open: true,
          message,
          severity: 'error',
        });
      }
    },
    [addItem, onItemSelect, onError]
  );

  const existingNames = new Set(customItems.map((i) => i.name.toLowerCase()));

  const validateItemName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Item name cannot be empty';
    }
    if (name.length > MAX_CUSTOM_ASSET_NAME_LENGTH) {
      return `Item name must be ${MAX_CUSTOM_ASSET_NAME_LENGTH} characters or less`;
    }
    if (existingNames.has(name.toLowerCase())) {
      return 'This item name already exists';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Item file must be smaller than 5MB');
      return false;
    }

    // Set default name from file name
    const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setItemName(defaultName.substring(0, MAX_CUSTOM_ASSET_NAME_LENGTH)); // Limit initial name to 20 chars
    setPendingFile(file);
    setShowNameModal(true);

    return false; // Prevent default upload
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    const nameError = validateItemName(itemName);
    if (nameError) {
      setUploadError(nameError);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      await handleItemUpload(pendingFile, itemName.trim(), itemDescription.trim());

      // Reset state
      setPendingFile(null);
      setItemName('');
      setItemDescription('');
      setShowNameModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload home item';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    const item = customItems.find((i) => i.id === itemId);
    if (item) {
      onItemSelect(item);
    }
  };

  return (
    <>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {title}
      </Typography.Title>

      {(uploadError || loadItemsError) && (
        <Alert
          title="Error"
          severity="error"
          onClose={() => setUploadError(null)}
          style={{ marginBottom: 16 }}
        >
          {uploadError || loadItemsError}
        </Alert>
      )}

      <Space orientation="vertical" style={{ width: '100%' }} size="small">
        <Select
          placeholder="Select a home item"
          size="large"
          value={selectedItem?.id || undefined}
          onChange={handleSelectItem}
          loading={isLoadingItems}
          options={customItems.map((item) => ({
            label: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Item preview image */}
                {itemBase64Map.has(item.id) ? (
                  <Box
                    component="img"
                    src={`data:image/jpeg;base64,${itemBase64Map.get(item.id)}`}
                    alt={item.name}
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
                    {item.name}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.description}</div>
                  )}
                </Box>
              </Box>
            ),
            value: item.id,
          }))}
          style={{ width: '100%' }}
        />

        {/* Upload Item Button */}
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
            {isUploading ? 'Uploading...' : 'Upload Home Item'}
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

      {/* Item Name Input Modal */}
      <Modal
        title="Add Home Item"
        open={showNameModal}
        onOk={handleConfirmUpload}
        onCancel={() => {
          setPendingFile(null);
          setItemName('');
          setItemDescription('');
          setShowNameModal(false);
          setUploadError(null);
        }}
        confirmLoading={isUploading}
        okText="Upload Home Item"
        cancelText="Cancel"
        okButtonProps={{ disabled: isUploading }}
      >
        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}
          >
            Item Name
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 8 }}>
              {itemName.length}/{MAX_CUSTOM_ASSET_NAME_LENGTH}
            </span>
          </label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value.substring(0, MAX_CUSTOM_ASSET_NAME_LENGTH))}
            placeholder="Enter item name (e.g., Modern Sofa)"
            maxLength={MAX_CUSTOM_ASSET_NAME_LENGTH}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}
          >
            Description (Optional)
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 8 }}>
              {itemDescription.length}/{MAX_CUSTOM_ASSET_DESCRIPTION_LENGTH}
            </span>
          </label>
          <Input.TextArea
            value={itemDescription}
            onChange={(e) =>
              setItemDescription(e.target.value.substring(0, MAX_CUSTOM_ASSET_DESCRIPTION_LENGTH))
            }
            placeholder="Add description about this item (e.g., Gray fabric sectional sofa)"
            maxLength={MAX_CUSTOM_ASSET_DESCRIPTION_LENGTH}
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
              alt="Item preview"
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

export default ItemSelector;
