'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { database } from '../../firebase/config';
import { ref, push, set } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';

interface SaveButtonProps {
  polygon: google.maps.Polygon | null;
}

const SaveButton: React.FC<SaveButtonProps> = ({ polygon }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const handleSave = async () => {
    if (!user || !polygon) return;

    setIsSaving(true);
    try {
      const path = polygon.getPath().getArray();
      const coordinates = path.map(point => ({
        lat: point.lat(),
        lng: point.lng()
      }));

      // Calculate area in hectares
      const area = google.maps.geometry.spherical.computeArea(path) / 10000;

      const polygonData = {
        userId: user.uid,
        coordinates,
        area,
        createdAt: new Date().toISOString(),
        userEmail: user.email,
      };

      // Save to Firebase under user's polygons
      const polygonsRef = ref(database, `users/${user.uid}/polygons`);
      const newPolygonRef = push(polygonsRef);
      await set(newPolygonRef, polygonData);

      alert('Polygon saved successfully!');
    } catch (error) {
      console.error('Error saving polygon:', error);
      alert('Error saving polygon. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!polygon) return null;

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className={`flex items-center space-x-2 ${
        isSaving ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
      } text-white px-4 py-2 rounded-lg transition-colors shadow-lg`}
    >
      <FontAwesomeIcon icon={faSave} />
      <span>{isSaving ? 'Saving...' : 'Save Polygon'}</span>
    </button>
  );
};

export default SaveButton; 