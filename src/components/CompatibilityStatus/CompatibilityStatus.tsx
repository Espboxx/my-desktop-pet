import React, { useState } from 'react';
import { useCompatibility, usePerformanceMonitoring } from '../../hooks/useCompatibility';
import './CompatibilityStatus.css';

interface CompatibilityStatusProps {
  showDetails?: boolean;
  className?: string;
}

const CompatibilityStatus: React.FC<CompatibilityStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { report, isChecking } = useCompatibility();
  const { recommendations } = usePerformanceMonitoring();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isChecking) {
    return (
      <div className={`compatibility-status checking ${className}`}>
        <span className="status-icon">⏳</span>
        <span>检查兼容性...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`compatibility-status error ${className}`}>
        <span className="status-icon">❌</span>
        <span>兼容性检查失败</span>
      </div>
    );
  }

  // 计算兼容性分数
  const compatibilityScore = [
    report.imageSupport,
    report.webpSupport,
    report.localStorageSupport,
    report.fileApiSupport,
    report.dragDropSupport
  ].filter(Boolean).length;

  const totalFeatures = 5;
  const scorePercentage = (compatibilityScore / totalFeatures) * 100;

  const getStatusLevel = () => {
    if (scorePercentage >= 80) return 'excellent';
    if (scorePercentage >= 60) return 'good';
    if (scorePercentage >= 40) return 'fair';
    return 'poor';
  };

  const getStatusIcon = () => {
    const level = getStatusLevel();
    switch (level) {
      case 'excellent': return '✅';
      case 'good': return '✔️';
      case 'fair': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = () => {
    const level = getStatusLevel();
    switch (level) {
      case 'excellent': return '兼容性优秀';
      case 'good': return '兼容性良好';
      case 'fair': return '兼容性一般';
      case 'poor': return '兼容性较差';
      default: return '兼容性未知';
    }
  };

  const hasIssues = report.recommendations.length > 0 || recommendations.length > 0;

  return (
    <div className={`compatibility-status ${getStatusLevel()} ${className}`}>
      <div className="status-summary" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        <span className="status-score">({compatibilityScore}/{totalFeatures})</span>
        {hasIssues && <span className="issues-indicator">!</span>}
        {showDetails && (
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        )}
      </div>

      {showDetails && isExpanded && (
        <div className="status-details">
          <div className="feature-list">
            <h4>功能支持</h4>
            <div className="feature-item">
              <span className={`feature-status ${report.imageSupport ? 'supported' : 'unsupported'}`}>
                {report.imageSupport ? '✅' : '❌'}
              </span>
              <span>图像显示</span>
            </div>
            <div className="feature-item">
              <span className={`feature-status ${report.webpSupport ? 'supported' : 'unsupported'}`}>
                {report.webpSupport ? '✅' : '❌'}
              </span>
              <span>WebP格式</span>
            </div>
            <div className="feature-item">
              <span className={`feature-status ${report.localStorageSupport ? 'supported' : 'unsupported'}`}>
                {report.localStorageSupport ? '✅' : '❌'}
              </span>
              <span>本地存储</span>
            </div>
            <div className="feature-item">
              <span className={`feature-status ${report.fileApiSupport ? 'supported' : 'unsupported'}`}>
                {report.fileApiSupport ? '✅' : '❌'}
              </span>
              <span>文件上传</span>
            </div>
            <div className="feature-item">
              <span className={`feature-status ${report.dragDropSupport ? 'supported' : 'unsupported'}`}>
                {report.dragDropSupport ? '✅' : '❌'}
              </span>
              <span>拖拽功能</span>
            </div>
          </div>

          {report.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>兼容性建议</h4>
              <ul>
                {report.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="performance-recommendations">
              <h4>性能建议</h4>
              <ul>
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {report.fallbacksNeeded.length > 0 && (
            <div className="fallbacks">
              <h4>启用的回退机制</h4>
              <ul>
                {report.fallbacksNeeded.map((fallback, index) => (
                  <li key={index}>
                    {fallback === 'emoji' && '使用emoji显示'}
                    {fallback === 'memory-storage' && '使用内存存储'}
                    {fallback === 'no-file-upload' && '禁用文件上传'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompatibilityStatus;
