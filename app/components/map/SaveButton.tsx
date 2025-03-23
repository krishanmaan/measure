'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { database } from '../../firebase/config';
import { ref, push, set } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';

interface SaveButtonProps {
  polygon: google.maps.Polygon;
}

const SaveButton = ({ polygon }: SaveButtonProps) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      alert('Please log in to save fields');
      return;
    }

    try {
      setIsSaving(true);

      // Get polygon coordinates
      const path = polygon.getPath();
      const coordinates = Array.from(path.getArray()).map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng()
      }));

      // Calculate area in hectares
      const areaInSquareMeters = google.maps.geometry.spherical.computeArea(path);
      const areaInHectares = areaInSquareMeters / 10000; // Convert to hectares

      // Create polygon data object
      const polygonData = {
        userId: user.uid,
        userEmail: user.email,
        coordinates: coordinates,
        area: areaInHectares,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase under user's polygons
      const userPolygonsRef = ref(database, `users/${user.uid}/polygons`);
      const newPolygonRef = push(userPolygonsRef); // Generate a new unique ID
      await set(newPolygonRef, polygonData);

      alert('Field saved successfully!');
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Error saving field. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors"
    >
      <FontAwesomeIcon icon={faSave} />
      {isSaving ? 'Saving...' : 'Save Field'}
    </button>
  );
};

export default SaveButton; 