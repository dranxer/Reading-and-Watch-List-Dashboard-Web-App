import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'data');
const CONTENT_FILE = path.join(STORAGE_DIR, 'content.json');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const TAGS_FILE = path.join(STORAGE_DIR, 'tags.json');
const LISTS_FILE = path.join(STORAGE_DIR, 'lists.json');
const SOCIAL_FILE = path.join(STORAGE_DIR, 'social.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

interface ContentStore {
  [userId: string]: any[];
}

interface UserProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatar?: string;
  isPublic: boolean;
  joinedAt: string;
  stats: {
    totalContent: number;
    totalReads: number;
    favoriteCategories: string[];
  };
}

interface UserStore {
  [userId: string]: UserProfile;
}

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
  createdBy: string;
  usageCount: number;
  isSystemTag: boolean;
}

interface TagStore {
  [tagId: string]: Tag;
}

interface ReadingList {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPublic: boolean;
  isCollaborative: boolean;
  contentIds: string[];
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
}

interface ListStore {
  [listId: string]: ReadingList;
}

interface SocialConnection {
  followerId: string;
  followingId: string;
  createdAt: string;
}

interface SocialStore {
  connections: SocialConnection[];
  publicLists: string[];
  recommendations: {
    [userId: string]: {
      contentId: string;
      recommendedBy: string;
      reason: string;
      createdAt: string;
    }[];
  };
}

class ServerFileStorage {
  private contentCache: ContentStore = {};
  private userCache: UserStore = {};
  private tagCache: TagStore = {};
  private listCache: ListStore = {};
  private socialCache: SocialStore = { connections: [], publicLists: [], recommendations: {} };
  private loaded = {
    content: false,
    users: false,
    tags: false,
    lists: false,
    social: false
  };

  private loadData<T>(file: string, cacheKey: keyof typeof this.loaded, defaultValue: T): T {
    if (this.loaded[cacheKey]) {
      switch (cacheKey) {
        case 'content': return this.contentCache as T;
        case 'users': return this.userCache as T;
        case 'tags': return this.tagCache as T;
        case 'lists': return this.listCache as T;
        case 'social': return this.socialCache as T;
      }
    }
    
    try {
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(data);
        
        switch (cacheKey) {
          case 'content': this.contentCache = parsed; break;
          case 'users': this.userCache = parsed; break;
          case 'tags': this.tagCache = parsed; break;
          case 'lists': this.listCache = parsed; break;
          case 'social': this.socialCache = parsed; break;
        }
        
        this.loaded[cacheKey] = true;
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${cacheKey} data:`, error);
    }
    
    // Set default value and mark as loaded
    switch (cacheKey) {
      case 'content': this.contentCache = defaultValue as ContentStore; break;
      case 'users': this.userCache = defaultValue as UserStore; break;
      case 'tags': this.tagCache = defaultValue as TagStore; break;
      case 'lists': this.listCache = defaultValue as ListStore; break;
      case 'social': this.socialCache = defaultValue as SocialStore; break;
    }
    
    this.loaded[cacheKey] = true;
    return defaultValue;
  }

  private saveData(file: string, data: any): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving data to ${file}:`, error);
    }
  }

  // Content methods
  getUserContent(userId: string): any[] {
    const data = this.loadData(CONTENT_FILE, 'content', {} as ContentStore);
    return data[userId] || [];
  }

  setUserContent(userId: string, content: any[]): void {
    this.loadData(CONTENT_FILE, 'content', {});
    this.contentCache[userId] = content;
    this.saveData(CONTENT_FILE, this.contentCache);
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

  // User profile methods
  getUserProfile(userId: string): UserProfile | null {
    const data = this.loadData(USERS_FILE, 'users', {} as UserStore);
    return data[userId] || null;
  }

  createUserProfile(userId: string, profile: Partial<UserProfile>): UserProfile {
    this.loadData(USERS_FILE, 'users', {} as UserStore);
    const newProfile: UserProfile = {
      userId,
      displayName: profile.displayName || 'Anonymous User',
      bio: profile.bio || '',
      isPublic: profile.isPublic || false,
      joinedAt: new Date().toISOString(),
      stats: {
        totalContent: 0,
        totalReads: 0,
        favoriteCategories: []
      },
      ...profile
    };
    
    this.userCache[userId] = newProfile;
    this.saveData(USERS_FILE, this.userCache);
    return newProfile;
  }

  updateUserProfile(userId: string, updates: Partial<UserProfile>): boolean {
    this.loadData(USERS_FILE, 'users', {} as UserStore);
    if (this.userCache[userId]) {
      this.userCache[userId] = { ...this.userCache[userId], ...updates };
      this.saveData(USERS_FILE, this.userCache);
      return true;
    }
    return false;
  }

  // Tag methods
  getAllTags(): Tag[] {
    const data = this.loadData(TAGS_FILE, 'tags', {} as TagStore);
    return Object.values(data);
  }

  createTag(tag: Omit<Tag, 'id' | 'usageCount'>): Tag {
    this.loadData(TAGS_FILE, 'tags', {} as TagStore);
    
    // Generate unique ID to prevent React key conflicts
    const uniqueId = `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTag: Tag = {
      ...tag,
      id: uniqueId,
      usageCount: 0
    };
    
    this.tagCache[newTag.id] = newTag;
    this.saveData(TAGS_FILE, this.tagCache);
    return newTag;
  }

  incrementTagUsage(tagName: string): void {
    const tags = this.getAllTags();
    const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (tag) {
      tag.usageCount++;
      this.tagCache[tag.id] = tag;
      this.saveData(TAGS_FILE, this.tagCache);
    }
  }

  // Reading list methods
  getUserLists(userId: string): ReadingList[] {
    const data = this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    return Object.values(data).filter((list: ReadingList) => 
      list.ownerId === userId || list.collaborators.includes(userId)
    );
  }

  createReadingList(list: Omit<ReadingList, 'id' | 'createdAt' | 'updatedAt'>): ReadingList {
    this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    
    // Generate unique ID to prevent React key conflicts
    const uniqueId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newList: ReadingList = {
      ...list,
      id: uniqueId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.listCache[newList.id] = newList;
    this.saveData(LISTS_FILE, this.listCache);
    return newList;
  }

  updateReadingList(listId: string, updates: Partial<ReadingList>): boolean {
    this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    if (this.listCache[listId]) {
      this.listCache[listId] = { 
        ...this.listCache[listId], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      this.saveData(LISTS_FILE, this.listCache);
      return true;
    }
    return false;
  }

  addToReadingList(listId: string, contentId: string): boolean {
    this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    const list = this.listCache[listId];
    if (list && !list.contentIds.includes(contentId)) {
      list.contentIds.push(contentId);
      list.updatedAt = new Date().toISOString();
      this.saveData(LISTS_FILE, this.listCache);
      return true;
    }
    return false;
  }

  removeFromReadingList(listId: string, contentId: string): boolean {
    this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    const list = this.listCache[listId];
    if (list) {
      const index = list.contentIds.indexOf(contentId);
      if (index > -1) {
        list.contentIds.splice(index, 1);
        list.updatedAt = new Date().toISOString();
        this.saveData(LISTS_FILE, this.listCache);
        return true;
      }
    }
    return false;
  }

  // Social methods
  followUser(followerId: string, followingId: string): boolean {
    const data = this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    // Check if already following
    const exists = data.connections.some((conn: SocialConnection) => 
      conn.followerId === followerId && conn.followingId === followingId
    );
    
    if (!exists) {
      data.connections.push({
        followerId,
        followingId,
        createdAt: new Date().toISOString()
      });
      this.socialCache = data;
      this.saveData(SOCIAL_FILE, this.socialCache);
      return true;
    }
    return false;
  }

  unfollowUser(followerId: string, followingId: string): boolean {
    const data = this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    const index = data.connections.findIndex((conn: SocialConnection) => 
      conn.followerId === followerId && conn.followingId === followingId
    );
    
    if (index > -1) {
      data.connections.splice(index, 1);
      this.socialCache = data;
      this.saveData(SOCIAL_FILE, this.socialCache);
      return true;
    }
    return false;
  }

  getFollowing(userId: string): string[] {
    const data = this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    return data.connections
      .filter((conn: SocialConnection) => conn.followerId === userId)
      .map((conn: SocialConnection) => conn.followingId);
  }

  getFollowers(userId: string): string[] {
    const data = this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    return data.connections
      .filter((conn: SocialConnection) => conn.followingId === userId)
      .map((conn: SocialConnection) => conn.followerId);
  }

  getPublicLists(): ReadingList[] {
    const lists = this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    return Object.values(lists).filter((list: ReadingList) => list.isPublic);
  }
}

export const serverStorage = new ServerFileStorage(); 