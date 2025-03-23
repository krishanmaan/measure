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
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'roadmap' | 'terrain'>('hybrid');
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fieldPolygons, setFieldPolygons] = useState<google.maps.Polygon[]>([]);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  
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
      setFieldPolygons((prev) => [...prev, polygon]);
      drawingManager.setDrawingMode(null);
    });
  }, []);

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
        editable: true,
            draggable: true,
      });

      // Set polygon on map
      polygon.setMap(map);
      setFieldPolygons([polygon]);

      // Fit bounds to show the polygon
      const bounds = new google.maps.LatLngBounds();
      savedField.coordinates.forEach((coord: any) => {
        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
      });
      map.fitBounds(bounds);

      // Disable drawing mode
      drawingManagerRef.current.setDrawingMode(null);

      // Cleanup function
    return () => {
        polygon.setMap(null);
      };
    }
  }, [savedField, map]);

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
        {fieldPolygons.length > 0 && (
          <div className="absolute bottom-24 right-4">
            <SaveButton polygon={fieldPolygons[fieldPolygons.length - 1]} />
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