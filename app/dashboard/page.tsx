'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

interface Polygon {
  id: string;
  area: number;
  coordinates: any[];
  createdAt: string;
  userId: string;
  userEmail: string;
}

export default function Dashboard() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Fields</h1>
          <button
            onClick={handleCreateNew}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} />
            Create New
          </button>
        </div>

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
  );
} 