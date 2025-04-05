export interface PetOption {
  id: string;
  name: string;
  color: string;
  borderColor: string;
}

export interface AccessoryOption {
  id: string;
  name: string;
  emoji: string;
}

export const PET_OPTIONS: PetOption[] = [
  { id: 'default', name: '默认宠物', color: '#ffcc80', borderColor: '#e65100' },
  { id: 'leafy', name: '小叶子', color: '#a5d6a7', borderColor: '#2e7d32' },
  { id: 'droplet', name: '水滴滴', color: '#90caf9', borderColor: '#1565c0' },
];

export const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: 'crown', name: '皇冠', emoji: '👑' },
  { id: 'glasses', name: '眼镜', emoji: '👓' },
  { id: 'bowtie', name: '领结', emoji: '🎀' },
  { id: 'cap', name: '帽子', emoji: '🧢' },
];