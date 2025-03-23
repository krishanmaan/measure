'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { database } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

interface Polygon {
  id: string;
  area: number;
  coordinates: { lat: number; lng: number }[];
  createdAt: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [polygons, setPolygons] = useState<Polygon[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Subscribe to polygon updates
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
    });

    return () => unsubscribe();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt="Profile"
                className="h-8 w-8 rounded-full"
              />
              <span className="ml-2 text-gray-800 font-medium">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">My Fields</h1>
          <button
            onClick={() => router.push('/map')}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Create New</span>
          </button>
        </div>

        {/* Polygons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polygons.map((polygon) => (
            <div
              key={polygon.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Field {polygon.id.slice(0, 8)}
                    </h3>
                  </div>
                  <p className="text-gray-600 mt-2">
                    Area: {polygon.area.toFixed(2)} hectares
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Created: {formatDate(polygon.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {polygons.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">
                No fields created yet. Click "Create New" to add your first field.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 