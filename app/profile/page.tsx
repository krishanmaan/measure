'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import Image from 'next/image';
import Link from 'next/link';

interface GoogleProfile {
  locale: string;
  picture: string;
  given_name: string;
  family_name: string;
  verified_email: boolean;
}

interface UserData {
  name: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  createdAt: string;
  lastLogin: string;
  provider: string;
  googleProfile?: GoogleProfile;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch user data
    const userRef = ref(database, `users/${user.uid}`);
    const userUnsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.val());
        setLoading(false);
      }
    });

    return () => {
      userUnsubscribe();
    };
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center md:flex-row md:items-start gap-8">
            <div className="flex flex-col items-center">
              {userData?.photoURL ? (
                <Image
                  src={userData.photoURL}
                  alt="Profile"
                  width={120}
                  height={120}
                  className="rounded-full"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-green-500 flex items-center justify-center text-white text-3xl font-bold">
                  {userData?.name?.[0] || userData?.email?.[0] || 'U'}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {userData?.googleProfile?.given_name 
                  ? `${userData.googleProfile.given_name} ${userData.googleProfile.family_name}`
                  : userData?.name || 'User'}
              </h1>

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
                  <div className="mt-2 text-gray-600">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Email:</span> 
                      {userData?.email}
                      {userData?.googleProfile?.verified_email && (
                        <span className="ml-2 text-green-500 text-sm">(Verified)</span>
                      )}
                    </p>
                    {userData?.phoneNumber && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Phone:</span> 
                        {userData.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
                  <div className="mt-2 text-gray-600">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Member since:</span> 
                      {new Date(userData?.createdAt || '').toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Last login:</span> 
                      {new Date(userData?.lastLogin || '').toLocaleString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-medium">Login provider:</span> 
                      {userData?.provider}
                    </p>
                    {userData?.googleProfile?.locale && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Region:</span> 
                        {userData.googleProfile.locale.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Back to Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 