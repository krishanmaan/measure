'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, DrawingManager } from '@react-google-maps/api';
import Navbar from './Navbar';
import MapControls from './MapControls';
import SaveButton from './SaveButton';

const libraries: ("places" | "drawing" | "geometry")[] = ["places", "drawing", "geometry"];

const mapStyles = {
  container: {
    width: '100%',
    height: 'calc(100vh - 48px)',
    position: 'relative' as const
  },
  map: {
    width: '100%',
    height: '100%'
  }
};

const defaultCenter = {
  lat: 27.342860470286933,
  lng: 75.79046143662488,
};

interface MapComponentProps {
  onAreaUpdate?: (newArea: number) => void;
  className?: string;
  savedField?: {
    coordinates: any[];
    area: number;
  } | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ onAreaUpdate, className, savedField }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap' | 'terrain'>('satellite');
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fieldPolygons, setFieldPolygons] = useState<google.maps.Polygon[]>([]);
  const [activePolygonIndex, setActivePolygonIndex] = useState<number | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  // Function to lock polygon (make it non-editable and non-draggable)
  const lockPolygon = useCallback((polygon: google.maps.Polygon) => {
    polygon.setOptions({
      editable: false,
      draggable: false,
      strokeColor: '#00C853',
      fillColor: '#00C853',
    });
  }, []);

  // Function to unlock polygon (make it editable and draggable)
  const unlockPolygon = useCallback((polygon: google.maps.Polygon) => {
    polygon.setOptions({
      editable: true,
      draggable: true,
      strokeColor: '#00C853',
      fillColor: '#00C853',
    });
  }, []);

  // Toggle polygon lock state when clicked
  const handlePolygonClick = useCallback((polygon: google.maps.Polygon, index: number) => {
    // Lock all polygons first
    fieldPolygons.forEach((p, i) => {
      if (i !== index) {
        lockPolygon(p);
      }
    });

    if (activePolygonIndex === index) {
      // If clicking on active polygon, lock it
      lockPolygon(polygon);
      setActivePolygonIndex(null);
    } else {
      // If clicking on inactive polygon, unlock it
      unlockPolygon(polygon);
      setActivePolygonIndex(index);
    }
  }, [fieldPolygons, activePolygonIndex, lockPolygon, unlockPolygon]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);

    // Initialize drawing manager
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: '#00C853',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#00C853',
        editable: true,
        draggable: true,
      },
    });
    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Add polygon complete listener
    google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
      // Add click listener to the polygon
      google.maps.event.addListener(polygon, 'click', () => {
        const newIndex = fieldPolygons.length;
        handlePolygonClick(polygon, newIndex);
      });

      // Add the polygon to state
      setFieldPolygons((prev) => [...prev, polygon]);
      
      // Set drawing mode to null and disable drawing if we have a polygon
      drawingManager.setDrawingMode(null);
      drawingManager.setOptions({
        drawingControl: false // Disable drawing control after polygon is created
      });
      
      // Lock the newly created polygon after a short delay (to ensure it's fully drawn)
      setTimeout(() => {
        lockPolygon(polygon);
      }, 100);
    });
  }, [lockPolygon, handlePolygonClick, fieldPolygons]);

  // Enable or disable drawing manager based on polygon count
  useEffect(() => {
    if (drawingManagerRef.current && map) {
      // If we have polygons, disable drawing
      if (fieldPolygons.length > 0) {
        drawingManagerRef.current.setOptions({
          drawingControl: false
        });
      } else {
        // If no polygons, enable drawing
        drawingManagerRef.current.setOptions({
          drawingControl: true
        });
      }
    }
  }, [fieldPolygons.length, map]);

  // Function to handle polygon deletion
  const handleDeletePolygon = useCallback(() => {
    if (activePolygonIndex !== null && fieldPolygons.length > 0) {
      // Remove the active polygon from the map
      fieldPolygons[activePolygonIndex].setMap(null);
      
      // Remove from state
      const newPolygons = fieldPolygons.filter((_, i) => i !== activePolygonIndex);
      setFieldPolygons(newPolygons);
      setActivePolygonIndex(null);
      
      // Re-enable drawing control if all polygons are removed
      if (newPolygons.length === 0 && drawingManagerRef.current) {
        drawingManagerRef.current.setOptions({
          drawingControl: true
        });
      }
    }
  }, [activePolygonIndex, fieldPolygons]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleLocationClick = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          setUserLocation(newLocation);
          if (map) {
            map.panTo(newLocation);
            map.setZoom(18);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
          alert('Unable to get your location. Please check your location permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setIsLocating(false);
    }
  }, [map]);

  const handlePlaceSelect = useCallback((location: google.maps.LatLng) => {
    if (map) {
      map.panTo(location);
      map.setZoom(18);
    }
  }, [map]);

  const handleToggleFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (!isFullscreen) {
      elem.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Map options
  const mapOptions = useMemo(() => ({
    mapTypeId: mapType,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false,
    scaleControl: true,
    rotateControl: false,
    panControl: false,
    scrollwheel: true,
    clickableIcons: false,
    disableDefaultUI: true,
    tilt: 0,
  }), [mapType]);

  // Handle displaying saved field
  useEffect(() => {
    if (savedField && map && drawingManagerRef.current) {
      // Clear existing polygons
      fieldPolygons.forEach(polygon => polygon.setMap(null));

      // Create polygon from saved coordinates
      const polygon = new google.maps.Polygon({
        paths: savedField.coordinates,
        fillColor: '#00C853',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#00C853',
        editable: false,
        draggable: false,
      });

      // Set polygon on map
      polygon.setMap(map);
      
      // Add click listener to the polygon
      google.maps.event.addListener(polygon, 'click', () => {
        handlePolygonClick(polygon, 0);
      });
      
      setFieldPolygons([polygon]);

      // Fit bounds to show the polygon
      const bounds = new google.maps.LatLngBounds();
      savedField.coordinates.forEach((coord: any) => {
        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
      });
      map.fitBounds(bounds);

      // Disable drawing mode and drawing control
      drawingManagerRef.current.setDrawingMode(null);
      drawingManagerRef.current.setOptions({
        drawingControl: false
      });

      // Cleanup function
      return () => {
        polygon.setMap(null);
      };
    }
  }, [savedField, map, handlePolygonClick]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <Navbar onPlaceSelect={handlePlaceSelect} />
      <div style={mapStyles.container}>
        <GoogleMap
          mapContainerStyle={mapStyles.map}
          center={defaultCenter}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* User location marker */}
          {userLocation && (
            <>
              <Marker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
                zIndex={1000}
              />
              <Circle
                center={userLocation}
                radius={20}
                options={{
                  fillColor: '#4285F4',
                  fillOpacity: 0.2,
                  strokeColor: '#4285F4',
                  strokeOpacity: 0.5,
                  strokeWeight: 1,
                }}
              />
            </>
          )}
        </GoogleMap>

        {/* Add Save Button */}
        {fieldPolygons.length > 0 && activePolygonIndex !== null && (
          <div className="absolute bottom-24 right-4 flex flex-col gap-3">
            <SaveButton polygon={fieldPolygons[activePolygonIndex]} />
            <button
              onClick={handleDeletePolygon}
              className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition-colors"
              title="Delete polygon"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <MapControls
        currentMapType={mapType}
        onMapTypeChange={setMapType}
        onLocationClick={handleLocationClick}
        onToggleFullscreen={handleToggleFullscreen}
        isLocating={isLocating}
      />
    </div>
  );
};

export default MapComponent;