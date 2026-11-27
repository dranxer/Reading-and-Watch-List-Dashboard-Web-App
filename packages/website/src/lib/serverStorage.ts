import fs from 'fs';
import path from 'path';
import { getStore } from '@netlify/blobs';
// Seed data bundled into the build: used the first time a store has no saved copy yet
import seedContent from '../../data/content.json';
import seedUsers from '../../data/users.json';
import seedTags from '../../data/tags.json';
import seedLists from '../../data/lists.json';
import seedSocial from '../../data/social.json';

const SEEDS: Record<string, unknown> = {
  'content.json': seedContent, 'users.json': seedUsers, 'tags.json': seedTags,
  'lists.json': seedLists, 'social.json': seedSocial,
};

/**
 * Where the JSON documents live.
 * - On Netlify (serverless, read-only disk, many instances): Netlify Blobs, read fresh on
 *   every call so all instances see the same data.
 * - Anywhere else (local dev, a container): files in ./data, cached in memory.
 */
function blobStore() {
  if (!process.env.NETLIFY && !process.env.NETLIFY_BLOBS_CONTEXT) return null;
  try {
    return getStore({ name: 'curiolog-data', consistency: 'strong' });
  } catch {
    return null;
  }
}

const STORAGE_DIR = path.join(process.cwd(), 'data');
const CONTENT_FILE = path.join(STORAGE_DIR, 'content.json');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const TAGS_FILE = path.join(STORAGE_DIR, 'tags.json');
const LISTS_FILE = path.join(STORAGE_DIR, 'lists.json');
const SOCIAL_FILE = path.join(STORAGE_DIR, 'social.json');

// Ensure storage directory exists (file backend only)
if (!blobStore() && !fs.existsSync(STORAGE_DIR)) {
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

  private async loadData<T>(file: string, cacheKey: keyof typeof this.loaded, defaultValue: T): Promise<T> {
    const store = blobStore();
    if (store) {
      const key = path.basename(file);
      const saved = (await store.get(key, { type: 'json' })) as T | null;
      const parsed = (saved ?? structuredClone(SEEDS[key] ?? defaultValue)) as T;
      switch (cacheKey) {
        case 'content': this.contentCache = parsed as ContentStore; break;
        case 'users': this.userCache = parsed as UserStore; break;
        case 'tags': this.tagCache = parsed as TagStore; break;
        case 'lists': this.listCache = parsed as ListStore; break;
        case 'social': this.socialCache = parsed as SocialStore; break;
      }
      return parsed;
    }

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

  private async saveData(file: string, data: any): Promise<void> {
    try {
      const store = blobStore();
      if (store) {
        await store.setJSON(path.basename(file), data);
        return;
      }
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving data to ${file}:`, error);
    }
  }

  // Content methods
  async getUserContent(userId: string): Promise<any[]> {
    const data = await this.loadData(CONTENT_FILE, 'content', {} as ContentStore);
    return data[userId] || [];
  }

  async setUserContent(userId: string, content: any[]): Promise<void> {
    await this.loadData(CONTENT_FILE, 'content', {});
    this.contentCache[userId] = content;
    await this.saveData(CONTENT_FILE, this.contentCache);
  }

  async addUserContent(userId: string, item: any): Promise<void> {
    const userContent = await this.getUserContent(userId);
    userContent.unshift(item);
    await this.setUserContent(userId, userContent);
  }

  async removeUserContent(userId: string, itemId: string): Promise<boolean> {
    const userContent = await this.getUserContent(userId);
    const index = userContent.findIndex(item => item.id === itemId);
    
    if (index !== -1) {
      userContent.splice(index, 1);
      await this.setUserContent(userId, userContent);
      return true;
    }
    
    return false;
  }

  async updateUserContent(userId: string, itemId: string, updates: any): Promise<boolean> {
    const userContent = await this.getUserContent(userId);
    const index = userContent.findIndex(item => item.id === itemId);
    
    if (index !== -1) {
      userContent[index] = { ...userContent[index], ...updates };
      await this.setUserContent(userId, userContent);
      return true;
    }
    
    return false;
  }

  async getAllContent(): Promise<ContentStore> {
    return await this.loadData(CONTENT_FILE, 'content', {} as ContentStore);
  }

  async getAllUserProfiles(): Promise<UserStore> {
    return await this.loadData(USERS_FILE, 'users', {} as UserStore);
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const data = await this.loadData(USERS_FILE, 'users', {} as UserStore);
    return data[userId] || null;
  }

  async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    await this.loadData(USERS_FILE, 'users', {} as UserStore);
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
    await this.saveData(USERS_FILE, this.userCache);
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    await this.loadData(USERS_FILE, 'users', {} as UserStore);
    if (this.userCache[userId]) {
      this.userCache[userId] = { ...this.userCache[userId], ...updates };
      await this.saveData(USERS_FILE, this.userCache);
      return true;
    }
    return false;
  }

  // Tag methods
  async getAllTags(): Promise<Tag[]> {
    const data = await this.loadData(TAGS_FILE, 'tags', {} as TagStore);
    return Object.values(data);
  }

  async createTag(tag: Omit<Tag, 'id' | 'usageCount'>): Promise<Tag> {
    await this.loadData(TAGS_FILE, 'tags', {} as TagStore);
    
    // Generate unique ID to prevent React key conflicts
    const uniqueId = `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTag: Tag = {
      ...tag,
      id: uniqueId,
      usageCount: 0
    };
    
    this.tagCache[newTag.id] = newTag;
    await this.saveData(TAGS_FILE, this.tagCache);
    return newTag;
  }

  async incrementTagUsage(tagName: string): Promise<void> {
    const tags = await this.getAllTags();
    const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (tag) {
      tag.usageCount++;
      this.tagCache[tag.id] = tag;
      await this.saveData(TAGS_FILE, this.tagCache);
    }
  }

  // Reading list methods
  async getUserLists(userId: string): Promise<ReadingList[]> {
    const data = await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    return Object.values(data).filter((list: ReadingList) => 
      list.ownerId === userId || list.collaborators.includes(userId)
    );
  }

  async createReadingList(list: Omit<ReadingList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReadingList> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    
    // Generate unique ID to prevent React key conflicts
    const uniqueId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newList: ReadingList = {
      ...list,
      id: uniqueId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.listCache[newList.id] = newList;
    await this.saveData(LISTS_FILE, this.listCache);
    return newList;
  }

  async updateReadingList(listId: string, updates: Partial<ReadingList>): Promise<boolean> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    if (this.listCache[listId]) {
      this.listCache[listId] = { 
        ...this.listCache[listId], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await this.saveData(LISTS_FILE, this.listCache);
      return true;
    }
    return false;
  }

  async addToReadingList(listId: string, contentId: string): Promise<boolean> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    const list = this.listCache[listId];
    if (list && !list.contentIds.includes(contentId)) {
      list.contentIds.push(contentId);
      list.updatedAt = new Date().toISOString();
      await this.saveData(LISTS_FILE, this.listCache);
      return true;
    }
    return false;
  }

  async removeFromReadingList(listId: string, contentId: string): Promise<boolean> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    const list = this.listCache[listId];
    if (list) {
      const index = list.contentIds.indexOf(contentId);
      if (index > -1) {
        list.contentIds.splice(index, 1);
        list.updatedAt = new Date().toISOString();
        await this.saveData(LISTS_FILE, this.listCache);
        return true;
      }
    }
    return false;
  }

  async deleteReadingList(listId: string, userId: string): Promise<boolean> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    const list = this.listCache[listId];
    
    // Check if user owns the list
    if (list && list.ownerId === userId) {
      delete this.listCache[listId];
      await this.saveData(LISTS_FILE, this.listCache);
      return true;
    }
    return false;
  }

  async getListContents(listId: string, userId: string): Promise<any[]> {
    await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    await this.loadData(CONTENT_FILE, 'content', {} as ContentStore);
    
    const list = this.listCache[listId];
    
    // Check if user has access to the list
    if (!list || (!list.isPublic && list.ownerId !== userId && !list.collaborators.includes(userId))) {
      return [];
    }
    
    // Get all content from all users that matches the content IDs in the list
    const allContents: any[] = [];
    Object.keys(this.contentCache).forEach(uid => {
      const userContent = this.contentCache[uid] || [];
      const matchingContent = userContent.filter(item => list.contentIds.includes(item.id));
      allContents.push(...matchingContent);
    });
    
    return allContents;
  }

  // Social methods
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const data = await this.loadData(SOCIAL_FILE, 'social', { 
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
      await this.saveData(SOCIAL_FILE, this.socialCache);
      return true;
    }
    return false;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const data = await this.loadData(SOCIAL_FILE, 'social', { 
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
      await this.saveData(SOCIAL_FILE, this.socialCache);
      return true;
    }
    return false;
  }

  async getFollowing(userId: string): Promise<string[]> {
    const data = await this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    return data.connections
      .filter((conn: SocialConnection) => conn.followerId === userId)
      .map((conn: SocialConnection) => conn.followingId);
  }

  async getFollowers(userId: string): Promise<string[]> {
    const data = await this.loadData(SOCIAL_FILE, 'social', { 
      connections: [], 
      publicLists: [], 
      recommendations: {} 
    } as SocialStore);
    
    return data.connections
      .filter((conn: SocialConnection) => conn.followingId === userId)
      .map((conn: SocialConnection) => conn.followerId);
  }

  async getPublicLists(): Promise<ReadingList[]> {
    const lists = await this.loadData(LISTS_FILE, 'lists', {} as ListStore);
    return Object.values(lists).filter((list: ReadingList) => list.isPublic);
  }
}

export const serverStorage = new ServerFileStorage(); 