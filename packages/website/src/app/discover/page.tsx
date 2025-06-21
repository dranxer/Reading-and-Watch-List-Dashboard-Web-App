'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

interface UserProfile {
  userId: string;
  displayName: string;
  bio: string;
  website: string;
  isPublic: boolean;
  publicContentCount: number;
  followersCount: number;
  followingCount: number;
}

export default function DiscoverPage() {
  const { user, isSignedIn } = useUser();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    if (isSignedIn) {
      fetchProfiles();
      fetchFollowing();
    }
  }, [isSignedIn]);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles/discover');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await fetch('/api/follows?type=following');
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.map((f: any) => f.followingId));
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const followUser = async (userId: string) => {
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: userId })
      });
      
      if (response.ok) {
        setFollowing(prev => [...prev, userId]);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/follows?followingId=${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setFollowing(prev => prev.filter(id => id !== userId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.bio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Discover Readers</h1>
          <p className="mb-4">Sign in to discover and follow other readers</p>
          <SignInButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Discover Readers</h1>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or bio..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading profiles...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No public profiles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div key={profile.userId} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profile.displayName}
                    </h3>
                    {profile.bio && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-500">
                      {profile.publicContentCount}
                    </div>
                    <div className="text-xs text-gray-500">Articles</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-500">
                      {profile.followersCount}
                    </div>
                    <div className="text-xs text-gray-500">Followers</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-500">
                      {profile.followingCount}
                    </div>
                    <div className="text-xs text-gray-500">Following</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {following.includes(profile.userId) ? (
                    <button
                      onClick={() => unfollowUser(profile.userId)}
                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
                    >
                      Unfollow
                    </button>
                  ) : (
                    <button
                      onClick={() => followUser(profile.userId)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                    >
                      Follow
                    </button>
                  )}
                  <Link
                    href={`/profile/${profile.userId}`}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 