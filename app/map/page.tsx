'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import MapComponent with no SSR
const MapComponent = dynamic(
  () => import('../components/map/MapComponent'),
  { ssr: false }
);

interface Polygon {
  id: string;
  area: number;
  coordinates: any[];
  createdAt: string;
  userId: string;
  userEmail: string;
}

export default function MapPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedField, setSavedField] = useState<Polygon | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Check if we have a field in the URL params
    const fieldParam = searchParams.get('field');
    if (fieldParam) {
      try {
        const field = JSON.parse(decodeURIComponent(fieldParam));
        setSavedField(field);
      } catch (error) {
        console.error('Error parsing field data:', error);
      }
    }
  }, [user, router, searchParams]);

  if (!user) return null;

  return (
    <div className="h-screen w-screen">
      <MapComponent savedField={savedField} />
    </div>
  );
} 