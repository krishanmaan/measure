'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import Link from 'next/link';


interface Polygon {
  id: string;
  area: number;
  coordinates: any[];
  createdAt: string;
  userId: string;
}

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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

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
      }
    });

    // Fetch polygons
    const polygonsRef = ref(database, `users/${user.uid}/polygons`);
    const polygonsUnsubscribe = onValue(polygonsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        try {
          const polygonList = Object.entries(data).map(([id, value]: [string, any]) => ({
            id,
            ...value,
          }));
          setPolygons(polygonList);
        } catch (error) {
          console.error("Error processing polygon data:", error);
        }
      } else {
        setPolygons([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching polygons:", error);
      setLoading(false);
    });

    return () => {
      userUnsubscribe();
      polygonsUnsubscribe();
    };
  }, [user, router]);

  const handleCreateNew = () => {
    router.push('/map');
  };

  const handleFieldClick = (polygon: Polygon) => {
    router.push(`/map?field=${encodeURIComponent(JSON.stringify(polygon))}`);
  };

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
    <>
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/profile" className="cursor-pointer">
                {userData?.photoURL ? (
                  <Image
                    src={userData.photoURL}
                    alt="Profile"
                    width={60}
                    height={60}
                    className="rounded-full hover:ring-2 hover:ring-green-500 transition-all"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-black text-xl font-bold hover:ring-2 hover:ring-green-300 transition-all">
                    {userData?.name?.[0] || userData?.email?.[0] || 'U'}
                  </div>
                )}
              </Link>
              <h2 className="text-2xl font-semibold text-gray-900">
                {userData?.googleProfile?.given_name 
                  ? `${userData.googleProfile.given_name} ${userData.googleProfile.family_name}`
                  : userData?.name || 'User'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/map"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                New Field
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
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {polygons.map((polygon) => (
              <div
                key={polygon.id}
                onClick={() => handleFieldClick(polygon)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-500" />
                      Field - {polygon.id.slice(0, 7)}
                    </h2>
                    <p className="text-gray-600">Area: {polygon.area.toFixed(2)} hectares</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Created: {new Date(polygon.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {polygons.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              No fields saved yet Click "New Field" to add your first field.
            </div>
          )}
        </div>
      </div>
    </>
  );
} 