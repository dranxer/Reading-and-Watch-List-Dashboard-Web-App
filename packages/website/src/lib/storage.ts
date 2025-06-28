// Client-side storage using localStorage
interface ContentStore {
  [userId: string]: any[];
}

class BrowserStorage {
  private readonly STORAGE_KEY = 'readwatch_content';

  private loadData(): ContentStore {
    if (typeof window === 'undefined') return {};
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading content data:', error);
      return {};
    }
  }

  private saveData(data: ContentStore): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving content data:', error);
    }
  }

  getUserContent(userId: string): any[] {
    const data = this.loadData();
    return data[userId] || [];
  }

  setUserContent(userId: string, content: any[]): void {
    const data = this.loadData();
    data[userId] = content;
    this.saveData(data);
  }

  addUserContent(userId: string, item: any): void {
    const userContent = this.getUserContent(userId);
    userContent.unshift(item);
    this.setUserContent(userId, userContent);
  }

  removeUserContent(userId: string, itemId: string): boolean {
    const userContent = this.getUserContent(userId);
    const index = userContent.findIndex(item => item.id === itemId);
    
    if (index !== -1) {
      userContent.splice(index, 1);
      this.setUserContent(userId, userContent);
      return true;
    }
    
    return false;
  }

  updateUserContent(userId: string, itemId: string, updates: any): boolean {
    const userContent = this.getUserContent(userId);
    const index = userContent.findIndex(item => item.id === itemId);
    
    if (index !== -1) {
      userContent[index] = { ...userContent[index], ...updates };
      this.setUserContent(userId, userContent);
      return true;
    }
    
    return false;
  }
}

export const storage = new BrowserStorage(); 