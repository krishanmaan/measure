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
  userEmail: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const polygonsRef = ref(database, `users/${user.uid}/polygons`);
    const unsubscribe = onValue(polygonsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const polygonList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setPolygons(polygonList);
      } else {
        setPolygons([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, router]);

  const handleCreateNew = () => {
    router.push('/map');
  };

  const handleFieldClick = (polygon: Polygon) => {
    // Navigate to map with polygon data
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
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                  {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.displayName || 'User'}
                </h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polygons.map((polygon) => (
              <div
                key={polygon.id}
                onClick={() => handleFieldClick(polygon)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-500" />
                      Field -{polygon.id.slice(0, 7)}
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
              No fields saved yet. Click &quot;Create New&quot; to add your first field.
            </div>
          )}
        </div>
      </div>
    </>
  );
} 