import type { RiverChatData, River, Settings, APIKeys } from '../types';

const STORAGE_KEY = 'riverchat_data';

const DEFAULT_SETTINGS: Settings = {
  apiKeys: {
    openai: '',
    anthropic: '',
    google: '',
  },
  theme: 'dark',
  lastUsedModel: null,
};

const DEFAULT_DATA: RiverChatData = {
  rivers: [],
  settings: DEFAULT_SETTINGS,
  activeRiverId: null,
};

export class StorageService {
  private static getData(): RiverChatData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return DEFAULT_DATA;
      }
      return JSON.parse(data) as RiverChatData;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return DEFAULT_DATA;
    }
  }

  private static saveData(data: RiverChatData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      throw new Error('Failed to save data');
    }
  }

  static getAllData(): RiverChatData {
    return this.getData();
  }

  static getRivers(): River[] {
    const data = this.getData();
    return data.rivers;
  }

  static getRiver(id: string): River | null {
    const data = this.getData();
    return data.rivers.find((river) => river.id === id) || null;
  }

  static saveRiver(river: River): void {
    const data = this.getData();
    const index = data.rivers.findIndex((r) => r.id === river.id);
    
    river.lastModified = new Date().toISOString();
    
    if (index >= 0) {
      data.rivers[index] = river;
    } else {
      data.rivers.push(river);
    }
    
    this.saveData(data);
  }

  static deleteRiver(id: string): void {
    const data = this.getData();
    data.rivers = data.rivers.filter((river) => river.id !== id);
    
    if (data.activeRiverId === id) {
      data.activeRiverId = null;
    }
    
    this.saveData(data);
  }

  static getSettings(): Settings {
    const data = this.getData();
    return data.settings || DEFAULT_SETTINGS;
  }

  static saveSettings(settings: Settings): void {
    const data = this.getData();
    data.settings = settings;
    this.saveData(data);
  }

  static getAPIKeys(): APIKeys {
    const settings = this.getSettings();
    return settings.apiKeys;
  }

  static saveAPIKeys(apiKeys: APIKeys): void {
    const settings = this.getSettings();
    settings.apiKeys = apiKeys;
    this.saveSettings(settings);
  }

  static hasAPIKeys(): boolean {
    const apiKeys = this.getAPIKeys();
    return !!(apiKeys.openai || apiKeys.anthropic || apiKeys.google);
  }

  static getActiveRiverId(): string | null {
    const data = this.getData();
    return data.activeRiverId;
  }

  static setActiveRiverId(riverId: string | null): void {
    const data = this.getData();
    data.activeRiverId = riverId;
    this.saveData(data);
  }

  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

