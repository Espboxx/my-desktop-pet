/**
 * 占位符图像生成器
 * 用于生成临时的SVG图像作为默认资源
 */

export interface PlaceholderImageOptions {
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  text?: string;
  shape?: 'circle' | 'square';
}

/**
 * 生成SVG占位符图像
 */
export function generatePlaceholderSVG(options: PlaceholderImageOptions = {}): string {
  const {
    size = 64,
    backgroundColor = '#ffcc80',
    textColor = '#e65100',
    text = '🐾',
    shape = 'circle'
  } = options;

  const radius = shape === 'circle' ? size / 2 : 8;
  const element = shape === 'circle' 
    ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${backgroundColor}" stroke="${textColor}" stroke-width="2"/>`
    : `<rect x="2" y="2" width="${size-4}" height="${size-4}" rx="${radius}" fill="${backgroundColor}" stroke="${textColor}" stroke-width="2"/>`;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${element}
      <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${textColor}">
        ${text}
      </text>
    </svg>
  `.trim();
}

/**
 * Unicode安全的Base64编码函数
 * 解决btoa()无法处理Unicode字符（如emoji）的问题
 */
function unicodeSafeBase64Encode(str: string): string {
  // 将Unicode字符串转换为UTF-8字节序列，然后进行Base64编码
  try {
    // 使用TextEncoder将字符串转换为UTF-8字节数组
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(str);

    // 将字节数组转换为二进制字符串
    let binaryString = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binaryString += String.fromCharCode(utf8Bytes[i]);
    }

    // 使用btoa()对二进制字符串进行Base64编码
    return btoa(binaryString);
  } catch (error) {
    // 如果TextEncoder不可用，使用encodeURIComponent作为回退
    console.warn('TextEncoder not available, using encodeURIComponent fallback');
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }
}

/**
 * 将SVG转换为Data URL
 * 使用Unicode安全的编码方法处理包含emoji的SVG
 */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${unicodeSafeBase64Encode(svg)}`;
}

/**
 * 生成默认宠物的占位符图像集
 */
export function generateDefaultPetPlaceholders(): Record<string, string> {
  const expressions = {
    normal: { text: '😊', color: '#ffcc80' },
    happy: { text: '😄', color: '#ffcc80' },
    hungry: { text: '🍕', color: '#ffcc80' },
    sleepy: { text: '😴', color: '#ffcc80' },
    sick: { text: '🤢', color: '#ffcc80' },
    level5: { text: '😎', color: '#ffcc80' },
    level10: { text: '🤩', color: '#ffcc80' },
    level15: { text: '🦸', color: '#ffcc80' },
    look_left: { text: '👀', color: '#ffcc80' },
    look_right: { text: '👀', color: '#ffcc80' },
    look_up: { text: '👀', color: '#ffcc80' },
    look_down: { text: '👀', color: '#ffcc80' },
    look_up_left: { text: '👀', color: '#ffcc80' },
    look_up_right: { text: '👀', color: '#ffcc80' },
    look_down_left: { text: '👀', color: '#ffcc80' },
    look_down_right: { text: '👀', color: '#ffcc80' }
  };

  const placeholders: Record<string, string> = {};

  for (const [key, config] of Object.entries(expressions)) {
    const svg = generatePlaceholderSVG({
      backgroundColor: config.color,
      textColor: '#e65100',
      text: config.text,
      shape: 'circle'
    });
    placeholders[key] = svgToDataUrl(svg);
  }

  return placeholders;
}

/**
 * 生成水滴宠物的占位符图像集
 */
export function generateDropletPetPlaceholders(): Record<string, string> {
  const expressions = {
    normal: { text: '💧', color: '#90caf9' },
    happy: { text: '🌊', color: '#90caf9' },
    hungry: { text: '🥤', color: '#90caf9' },
    sleepy: { text: '❄️', color: '#90caf9' },
    level5: { text: '🌈', color: '#90caf9' },
    level10: { text: '🌊', color: '#90caf9' },
    look_left: { text: '💧', color: '#90caf9' },
    look_right: { text: '💧', color: '#90caf9' },
    look_up: { text: '💧', color: '#90caf9' },
    look_down: { text: '💧', color: '#90caf9' },
    look_up_left: { text: '💧', color: '#90caf9' },
    look_up_right: { text: '💧', color: '#90caf9' },
    look_down_left: { text: '💧', color: '#90caf9' },
    look_down_right: { text: '💧', color: '#90caf9' }
  };

  const placeholders: Record<string, string> = {};

  for (const [key, config] of Object.entries(expressions)) {
    const svg = generatePlaceholderSVG({
      backgroundColor: config.color,
      textColor: '#1565c0',
      text: config.text,
      shape: 'circle'
    });
    placeholders[key] = svgToDataUrl(svg);
  }

  return placeholders;
}

/**
 * 获取所有占位符图像
 */
export function getAllPlaceholderImages(): Record<string, Record<string, string>> {
  return {
    default: generateDefaultPetPlaceholders(),
    droplet: generateDropletPetPlaceholders()
  };
}
