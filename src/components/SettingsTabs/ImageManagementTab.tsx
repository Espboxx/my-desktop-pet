import React, { useState, useEffect, useCallback } from 'react';
import { PET_TYPES } from '@/constants/petConstants';
import { customImageStorage, CustomImageData } from '@/services/customImageStorage';
import ImageImportDialog from '../ImageImport/ImageImportDialog';

const ImageManagementTab: React.FC = () => {
  const [customImages, setCustomImages] = useState<CustomImageData[]>([]);
  const [selectedPetType, setSelectedPetType] = useState<string>('default');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importTarget, setImportTarget] = useState<{ petTypeId: string; expressionKey: string } | null>(null);
  const [storageStats, setStorageStats] = useState(customImageStorage.getStorageStats());

  // 加载自定义图像
  const loadCustomImages = useCallback(() => {
    const images = customImageStorage.getAllImages();
    setCustomImages(images);
    setStorageStats(customImageStorage.getStorageStats());
  }, []);

  useEffect(() => {
    loadCustomImages();
  }, [loadCustomImages]);

  // 获取当前选中宠物类型的图像
  const currentPetImages = customImages.filter(img => img.petTypeId === selectedPetType);

  // 获取当前宠物类型的所有表情键
  const currentPetType = PET_TYPES[selectedPetType];
  const expressionKeys = currentPetType ? Object.keys(currentPetType.expressions) : [];

  // 处理导入图像
  const handleImportImage = useCallback((petTypeId: string, expressionKey: string) => {
    setImportTarget({ petTypeId, expressionKey });
    setShowImportDialog(true);
  }, []);

  // 处理图像导入完成
  const handleImageImported = useCallback((dataUrl: string, filename: string) => {
    if (!importTarget) return;

    const result = customImageStorage.saveImage(
      importTarget.petTypeId,
      importTarget.expressionKey,
      dataUrl,
      filename
    );

    if (result.success) {
      loadCustomImages();
      // 这里可以添加成功提示
    } else {
      // 这里可以添加错误提示
      console.error('Failed to save image:', result.error);
    }
  }, [importTarget, loadCustomImages]);

  // 删除图像
  const handleDeleteImage = useCallback((imageId: string) => {
    if (window.confirm('确定要删除这个图像吗？')) {
      const success = customImageStorage.deleteImage(imageId);
      if (success) {
        loadCustomImages();
      }
    }
  }, [loadCustomImages]);

  // 清空所有图像
  const handleClearAllImages = useCallback(() => {
    if (window.confirm('确定要清空所有自定义图像吗？此操作不可撤销。')) {
      const success = customImageStorage.clearAllImages();
      if (success) {
        loadCustomImages();
      }
    }
  }, [loadCustomImages]);

  // 导出数据
  const handleExportData = useCallback(() => {
    try {
      const data = customImageStorage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pet-custom-images-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }, []);

  // 导入数据
  const handleImportData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const result = customImageStorage.importData(jsonData);
        
        if (result.success) {
          loadCustomImages();
          alert(`成功导入 ${result.imported} 个图像`);
        } else {
          alert(`导入失败：${result.error}`);
        }
      } catch (error) {
        alert('文件格式错误');
      }
    };
    reader.readAsText(file);
    
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  }, [loadCustomImages]);

  return (
    <div className="image-management-tab">
      <div className="tab-header">
        <h3>图像管理</h3>
        <div className="storage-info">
          <span>存储使用: {storageStats.totalImages} 个图像</span>
          <div className="storage-bar">
            <div 
              className="storage-used" 
              style={{ width: `${Math.min(storageStats.usagePercentage, 100)}%` }}
            />
          </div>
          <span>{(storageStats.totalSize / 1024 / 1024).toFixed(1)}MB / {(storageStats.maxSize / 1024 / 1024).toFixed(0)}MB</span>
        </div>
      </div>

      <div className="pet-type-selector">
        <label>选择宠物类型:</label>
        <select 
          value={selectedPetType} 
          onChange={(e) => setSelectedPetType(e.target.value)}
        >
          {Object.entries(PET_TYPES).map(([id, petType]) => (
            <option key={id} value={id}>{petType.name}</option>
          ))}
        </select>
      </div>

      <div className="expressions-grid">
        {expressionKeys.map(expressionKey => {
          const expression = currentPetType.expressions[expressionKey];
          const customImage = currentPetImages.find(img => img.expressionKey === expressionKey);
          
          return (
            <div key={expressionKey} className="expression-item">
              <div className="expression-header">
                <h4>{expression.name}</h4>
                <span className="expression-key">{expressionKey}</span>
              </div>
              
              <div className="expression-preview">
                {customImage ? (
                  <div className="custom-image-preview">
                    <img src={customImage.dataUrl} alt={expression.name} />
                    <div className="image-info">
                      <span className="filename">{customImage.filename}</span>
                      <span className="upload-date">
                        {new Date(customImage.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="default-preview">
                    {expression.imageUrl ? (
                      <img src={expression.imageUrl} alt={expression.name} />
                    ) : (
                      <span className="emoji-preview">{expression.emoji}</span>
                    )}
                    <span className="default-label">默认</span>
                  </div>
                )}
              </div>
              
              <div className="expression-actions">
                <button 
                  className="import-btn"
                  onClick={() => handleImportImage(selectedPetType, expressionKey)}
                >
                  {customImage ? '替换' : '导入'}
                </button>
                {customImage && (
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteImage(customImage.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="management-actions">
        <div className="action-group">
          <h4>数据管理</h4>
          <button className="export-btn" onClick={handleExportData}>
            导出数据
          </button>
          <label className="import-btn">
            导入数据
            <input 
              type="file" 
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <div className="action-group danger">
          <h4>危险操作</h4>
          <button className="clear-btn" onClick={handleClearAllImages}>
            清空所有图像
          </button>
        </div>
      </div>

      <ImageImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImageImported={handleImageImported}
        petTypeId={importTarget?.petTypeId || ''}
        expressionKey={importTarget?.expressionKey}
      />
    </div>
  );
};

export default ImageManagementTab;
