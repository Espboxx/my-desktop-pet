import React, { useState } from "react";
import { PET_TYPES } from "@/constants/petConstants";
import PetModel from "@/components/Pet/PetModel";
import CompatibilityStatus from "@/components/CompatibilityStatus/CompatibilityStatus";
import {
  useCompatibility,
  useImageResourceAvailability,
} from "@/hooks/utils/useCompatibility";
import { useImagePreloader } from "@/hooks/utils/useImagePreloader";
import imageResourceManager from "@/services/imageResourceManager";

interface ImageTestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  details: string;
}

const ImageSystemTest: React.FC = () => {
  const [selectedPetType, setSelectedPetType] = useState("default");
  const [selectedExpression, setSelectedExpression] = useState("normal");
  const [testResults, setTestResults] = useState<ImageTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const { report } = useCompatibility();
  const { availability } = useImageResourceAvailability(
    PET_TYPES[selectedPetType],
  );
  const imagePreloader = useImagePreloader(selectedPetType);

  const currentPetType = PET_TYPES[selectedPetType];
  const currentExpression = currentPetType?.expressions[selectedExpression];

  // 运行图像系统测试
  const runImageSystemTests = async () => {
    setIsRunningTests(true);
    const results: ImageTestResult[] = [];

    try {
      // 测试1: 兼容性检查
      results.push({
        test: "浏览器兼容性检查",
        status: report ? "PASS" : "FAIL",
        details: report
          ? `支持功能: ${Object.values(report).filter(Boolean).length}/5`
          : "检查失败",
      });

      // 测试2: 图像资源可用性
      if (availability) {
        results.push({
          test: "图像资源可用性",
          status: availability.percentage > 50 ? "PASS" : "WARN",
          details: `${availability.available}/${availability.total} (${availability.percentage.toFixed(1)}%)`,
        });
      }

      // 测试3: 占位符图像生成
      try {
        const { generateDefaultPetPlaceholders } = await import(
          "@/utils/placeholderImageGenerator"
        );
        const placeholders = generateDefaultPetPlaceholders();
        results.push({
          test: "占位符图像生成",
          status: Object.keys(placeholders).length > 0 ? "PASS" : "FAIL",
          details: `生成了 ${Object.keys(placeholders).length} 个占位符图像`,
        });
      } catch (error) {
        results.push({
          test: "占位符图像生成",
          status: "FAIL",
          details: `错误: ${error}`,
        });
      }

      // 测试4: 图像缓存
      const cacheStats = imageResourceManager.getCacheStats();
      results.push({
        test: "图像缓存系统",
        status: cacheStats.total > 0 ? "PASS" : "INFO",
        details: `缓存: ${cacheStats.loaded}/${cacheStats.total}, 失败: ${cacheStats.failed}`,
      });

      // 测试5: 预加载功能
      try {
        await imagePreloader.smartPreload(selectedPetType);
        results.push({
          test: "图像预加载",
          status: "PASS",
          details: "智能预加载完成",
        });
      } catch (error) {
        results.push({
          test: "图像预加载",
          status: "FAIL",
          details: `错误: ${error}`,
        });
      }

      setTestResults(results);
    } catch (error) {
      console.error("测试运行失败:", error);
    } finally {
      setIsRunningTests(false);
    }
  };

  // 清理缓存
  const clearCache = () => {
    imageResourceManager.clearCache();
    imagePreloader.clearCache();
    setTestResults([]);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>图像系统测试</h1>

      {/* 兼容性状态 */}
      <div style={{ marginBottom: "20px" }}>
        <h2>兼容性状态</h2>
        <CompatibilityStatus showDetails={true} />
      </div>

      {/* 宠物选择 */}
      <div style={{ marginBottom: "20px" }}>
        <h2>宠物预览</h2>
        <div style={{ marginBottom: "10px" }}>
          <label>宠物类型: </label>
          <select
            value={selectedPetType}
            onChange={(e) => setSelectedPetType(e.target.value)}
          >
            {Object.entries(PET_TYPES).map(([id, petType]) => (
              <option key={id} value={id}>
                {petType.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>表情: </label>
          <select
            value={selectedExpression}
            onChange={(e) => setSelectedExpression(e.target.value)}
          >
            {currentPetType &&
              Object.entries(currentPetType.expressions).map(
                ([key, expression]) => (
                  <option key={key} value={key}>
                    {expression.name}
                  </option>
                ),
              )}
          </select>
        </div>

        {/* 宠物预览 */}
        <div
          style={{
            border: "2px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#f9f9f9",
          }}
        >
          {currentPetType && currentExpression && (
            <PetModel
              petType={currentPetType}
              expression={currentExpression}
              size={80}
            />
          )}
          <p>模型类型: {currentPetType?.modelType}</p>
          <p>表情: {currentExpression?.name}</p>
        </div>
      </div>

      {/* 图像资源状态 */}
      {availability && (
        <div style={{ marginBottom: "20px" }}>
          <h2>图像资源状态</h2>
          <div
            style={{
              padding: "10px",
              backgroundColor:
                availability.percentage > 50 ? "#e8f5e8" : "#fff3e0",
              borderRadius: "4px",
            }}
          >
            <p>
              可用: {availability.available}/{availability.total} (
              {availability.percentage.toFixed(1)}%)
            </p>
            {availability.missing.length > 0 && (
              <p>缺失: {availability.missing.join(", ")}</p>
            )}
          </div>
        </div>
      )}

      {/* 测试控制 */}
      <div style={{ marginBottom: "20px" }}>
        <h2>测试控制</h2>
        <button
          onClick={runImageSystemTests}
          disabled={isRunningTests}
          style={{ marginRight: "10px" }}
        >
          {isRunningTests ? "运行中..." : "运行测试"}
        </button>
        <button onClick={clearCache}>清理缓存</button>
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div>
          <h2>测试结果</h2>
          <div style={{ fontFamily: "monospace" }}>
            {testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: "8px",
                  marginBottom: "4px",
                  backgroundColor:
                    result.status === "PASS"
                      ? "#e8f5e8"
                      : result.status === "WARN"
                        ? "#fff3e0"
                        : result.status === "FAIL"
                          ? "#ffebee"
                          : "#f0f0f0",
                  borderRadius: "4px",
                }}
              >
                <strong>[{result.status}]</strong> {result.test}:{" "}
                {result.details}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 调试信息 */}
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        <h3>调试信息</h3>
        <pre>
          {JSON.stringify(
            {
              selectedPetType,
              selectedExpression,
              modelType: currentPetType?.modelType,
              hasImageUrl: !!currentExpression?.imageUrl,
              hasEmoji: !!currentExpression?.emoji,
              cacheStats: imageResourceManager.getCacheStats(),
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
};

export default ImageSystemTest;
