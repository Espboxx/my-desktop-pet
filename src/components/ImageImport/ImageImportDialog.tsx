import React, { useState, useCallback, useRef } from 'react';
import { useCustomImageManager } from '@/hooks/utils/useImageResource';
import './ImageImportDialog.css';

interface ImageImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageImported: (dataUrl: string, filename: string) => void;
  petTypeId: string;
  expressionKey?: string;
}

const ImageImportDialog: React.FC<ImageImportDialogProps> = ({
  isOpen,
  onClose,
  onImageImported,
  petTypeId,
  expressionKey
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { validateAndProcessFile } = useCustomImageManager();

  const handleFileSelect = useCallback(async (file: File) => {
    setError('');
    setIsProcessing(true);
    
    try {
      const result = await validateAndProcessFile(file);
      
      if (result.success && result.dataUrl) {
        setPreviewUrl(result.dataUrl);
        setFileName(file.name);
      } else {
        setError(result.error || '文件处理失败');
        setPreviewUrl(null);
        setFileName('');
      }
    } catch (err) {
      setError('文件处理过程中发生错误');
      setPreviewUrl(null);
      setFileName('');
    } finally {
      setIsProcessing(false);
    }
  }, [validateAndProcessFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(() => {
    if (previewUrl && fileName) {
      onImageImported(previewUrl, fileName);
      handleClose();
    }
  }, [previewUrl, fileName, onImageImported]);

  const handleClose = useCallback(() => {
    setPreviewUrl(null);
    setFileName('');
    setError('');
    setIsProcessing(false);
    setDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  }, [onClose]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="image-import-overlay">
      <div className="image-import-dialog">
        <div className="dialog-header">
          <h3>导入自定义图像</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="dialog-content">
          <div className="import-info">
            <p>为 <strong>{petTypeId}</strong> 宠物的 <strong>{expressionKey || '基础'}</strong> 表情导入图像</p>
          </div>

          <div 
            className={`drop-zone ${dragOver ? 'drag-over' : ''} ${error ? 'error' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            {isProcessing ? (
              <div className="processing">
                <div className="spinner"></div>
                <p>处理中...</p>
              </div>
            ) : previewUrl ? (
              <div className="preview-container">
                <img src={previewUrl} alt="预览" className="preview-image" />
                <p className="file-name">{fileName}</p>
              </div>
            ) : (
              <div className="drop-zone-content">
                <div className="upload-icon">📁</div>
                <p>拖拽图像文件到此处或点击选择</p>
                <p className="format-info">支持 PNG、JPG、GIF、WEBP 格式，最大 5MB</p>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="dialog-actions">
          <button className="cancel-button" onClick={handleClose}>
            取消
          </button>
          <button 
            className="import-button" 
            onClick={handleImport}
            disabled={!previewUrl || isProcessing}
          >
            导入图像
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageImportDialog;
