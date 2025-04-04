// 用于生成临时宠物图标的脚本
// 在完整实现中，您应该替换为适合的宠物图标图像

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 基本简单的橙色圆形图标的 base64 数据
const iconBase64 = `iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB00lEQVR4nO2WTUhUURTH/+e+N+/NmxkXScQIQrYpUOcGbVxELVoNQZugdQurdYVEuGlXFEGLNrWJNkEQrXKToUKYm9qUhUX5Ffij0BnHmXn3tohhZnBGZ+bdTYv7W753z/mdw+FeDojFYrFYLP+CkD/11dZGzUzmQ9Y0O7VczvhbgLI43xKKxfom+/ulTBTbKu68W031TwghiOgUEZ2JBgIvZ1utBhGdiYVCIycHBoye7u77/UeP3jFzuc35ZKFMf5FX4XD7WDI5Fe3r6wAAW9NaaUniQM9tIrqQPK6eNsNf+dpLj9tXVqcA9ExH/Idmj9sDAAFg6Xa7tL+n58KOZUVWAADEdHGnHNwJAABi9l1inonF3vAWlLd1oEISSQBMQ94AMkT0IGLI7Zn9+4xUYvamUKo5q2kdRHSCiI66hHhtAED8yZPnOsnk5KGBAdMVCmnb9Z0UABCuMq2vr3Oqtdvn25IKhTaQTOrrpqkC8OQM4xUQfQIABcAHIiNXoS72+/03ALwE0pXQaalUq2rpKzxkCudCuUI2rj7PcwAQEGJTImohoocA8gqAICJPpaZxoP+uvw2RIK5NatoNoVTNoQFeALvW8DoR9bFSuYGhod/umsVisVgslj/zE3IRI7ldcYFAAAAAAElFTkSuQmCC`;

const iconBuffer = Buffer.from(iconBase64, 'base64');
const iconPath = join(__dirname, 'pet-icon.png');

// 保存 PNG 图标文件
writeFileSync(iconPath, iconBuffer);

console.log('宠物图标已生成:', iconPath);