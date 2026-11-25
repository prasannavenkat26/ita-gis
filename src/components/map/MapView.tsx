/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Farm, IrrigationPoint } from '@/types';
import { CROP_COLORS, IRRIGATION_POINT_COLORS } from '@/types';
import { geoJSONToPoints } from '@/lib/geo';

interface MapViewProps {
  farms: Farm[];
  irrigationPoints?: IrrigationPoint[];
  selectedFarmId?: string | null;
  onSelectFarm?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  showControls?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  drawingMode?: boolean;
  drawnPoints?: [number, number][];
  onDrawComplete?: (points: [number, number][]) => void;
  showLegend?: boolean;
  showCoordinates?: boolean;
  selectionMode?: boolean;
}

const LAYER_STYLES = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
};

export type LayerType = 'street' | 'satellite' | 'terrain';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const googleMapsEnabled = Boolean(googleMapsApiKey);

declare global {
  interface Window {
    google?: any;
    __farmGisGoogleMapsReady?: Promise<void>;
    __farmGisGoogleMapsLoaded?: boolean;
  }
}

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined' || !googleMapsApiKey) {
    return Promise.resolve();
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__farmGisGoogleMapsReady) {
    return window.__farmGisGoogleMapsReady;
  }

  const scriptId = 'farm-gis-google-maps-script';
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (existing) {
    window.__farmGisGoogleMapsReady = new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
    });
    return window.__farmGisGoogleMapsReady;
  }

  window.__farmGisGoogleMapsReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=geometry,drawing,places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return window.__farmGisGoogleMapsReady;
}

function getGoogleMapType(layer: LayerType): string {
  switch (layer) {
    case 'satellite':
      return window.google?.maps.MapTypeId.SATELLITE ?? 'satellite';
    case 'terrain':
      return window.google?.maps.MapTypeId.TERRAIN ?? 'terrain';
    default:
      return window.google?.maps.MapTypeId.ROADMAP ?? 'roadmap';
  }
}

// Fix default marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCropIcon(color: string, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'custom-farm-marker',
    html: `<div style="
      width: ${selected ? '16' : '12'}px;
      height: ${selected ? '16' : '12'}px;
      background: ${color};
      border: 2px solid ${selected ? '#F3CD79' : '#ffffff'};
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(23,38,56,0.3);
      transition: all 0.2s ease;
    "></div>`,
    iconSize: [selected ? 16 : 12, selected ? 16 : 12],
    iconAnchor: [selected ? 8 : 6, selected ? 8 : 6],
  });
}

function createIrrigationIcon(color: string, type: string): L.DivIcon {
  const icons: Record<string, string> = {
    'Drip Valve': 'D',
    'Sprinkler Head': 'S',
    'Center Pivot': 'P',
    'Canal Intake': 'C',
    'Water Source': 'W',
    'Pump Station': 'P',
    'Reservoir': 'R',
  };
  return L.divIcon({
    className: 'irrigation-marker',
    html: `<div style="
      width: 24px; height: 24px;
      background: ${color};
      border: 2px solid white;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: white;
      box-shadow: 0 2px 8px rgba(23,38,56,0.25);
    ">${icons[type] || 'I'}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function MapView({
  farms,
  irrigationPoints = [],
  selectedFarmId = null,
  onSelectFarm,
  center = [20.5937, 78.9629],
  zoom = 4.5,
  height = '100%',
  className = '',
  onMapClick,
  drawingMode = false,
  drawnPoints = [],
  onDrawComplete,
  showLegend = false,
  showCoordinates = false,
  selectionMode = true,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapSetupRef = useRef({ center, zoom, showCoordinates });
  mapSetupRef.current = { center, zoom, showCoordinates };
  const mapInstance = useRef<L.Map | null>(null);
  const googleMapInstance = useRef<any>(null);
  const layerRef = useRef<L.TileLayer | null>(null);
  const currentLayer = useRef<LayerType>('street');
  const markersRef = useRef<L.Marker[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);
  const irrigationMarkersRef = useRef<L.Marker[]>([]);
  const drawPointsRef = useRef<L.Layer[]>([]);
  const drawLineRef = useRef<L.Layer | null>(null);
  const coordDisplayRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const layerControlRef = useRef<HTMLDivElement | null>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const googlePolygonsRef = useRef<any[]>([]);
  const googleIrrigationMarkersRef = useRef<any[]>([]);
  const googleDrawMarkersRef = useRef<any[]>([]);
  const googlePolylineRef = useRef<any>(null);
  const googlePolygonRef = useRef<any>(null);
  const interactionRef = useRef({ drawingMode, drawnPoints, onDrawComplete, onMapClick });
  interactionRef.current = { drawingMode, drawnPoints, onDrawComplete, onMapClick };

  const farmsById = useMemo(() => {
    const map = new Map<string, Farm>();
    farms.forEach((f) => map.set(f.id, f));
    return map;
  }, [farms]);

  useEffect(() => {
    if (!mapRef.current || googleMapsEnabled) return;
    if (mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomSnap: 0.25,
      zoomControl: true,
      attributionControl: true,
    });

    const style = LAYER_STYLES[currentLayer.current];
    layerRef.current = L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: style.maxZoom,
    }).addTo(map);

    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);
    mapInstance.current = map;

    if (mapRef.current) {
      const controlDiv = L.DomUtil.create('div', 'leaflet-layer-control');
      controlDiv.style.cssText = `
        position: absolute; top: 10px; right: 10px; z-index: 1000;
        background: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
        border-radius: 10px; padding: 6px; display: flex; gap: 4px;
        box-shadow: 0 4px 16px rgba(23,38,56,0.12);
        border: 1px solid rgba(23,38,56,0.08);
      `;
      const layers: { key: LayerType; label: string }[] = [
        { key: 'street', label: 'Street' },
        { key: 'satellite', label: 'Satellite' },
        { key: 'terrain', label: 'Terrain' },
      ];
      layers.forEach((l) => {
        const btn = L.DomUtil.create('button', 'leaflet-layer-btn', controlDiv);
        btn.textContent = l.label;
        btn.style.cssText = `
          padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 500; font-family: Inter, sans-serif;
          background: ${l.key === currentLayer.current ? '#405A78' : 'transparent'};
          color: ${l.key === currentLayer.current ? 'white' : '#172638'};
          transition: all 0.2s ease;
        `;
        btn.onclick = (e) => {
          e.stopPropagation();
          currentLayer.current = l.key;
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
          }
          const newStyle = LAYER_STYLES[l.key];
          layerRef.current = L.tileLayer(newStyle.url, {
            attribution: newStyle.attribution,
            maxZoom: newStyle.maxZoom,
          }).addTo(map);
          controlDiv.querySelectorAll('button').forEach((b, i) => {
            const selected = i === layers.findIndex((x) => x.key === l.key);
            b.style.background = selected ? '#405A78' : 'transparent';
            b.style.color = selected ? 'white' : '#172638';
          });
        };
        controlDiv.appendChild(btn);
      });
      mapRef.current.appendChild(controlDiv);
      layerControlRef.current = controlDiv;
    }

    if (showCoordinates && mapRef.current) {
      const coordDiv = L.DomUtil.create('div', 'leaflet-coord-display');
      coordDiv.style.cssText = `
        position: absolute; bottom: 28px; right: 10px; z-index: 1000;
        background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
        border-radius: 8px; padding: 6px 12px;
        font-size: 11px; font-family: 'JetBrains Mono', monospace;
        color: #172638; font-weight: 500;
        box-shadow: 0 2px 8px rgba(23,38,56,0.08);
        border: 1px solid rgba(23,38,56,0.06);
        pointer-events: none;
      `;
      coordDiv.textContent = 'Lat: 0.000000°, Lng: 0.000000°';
      mapRef.current.appendChild(coordDiv);
      coordDisplayRef.current = coordDiv;

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        coordDiv.textContent = `Lat: ${e.latlng.lat.toFixed(6)}°, Lng: ${e.latlng.lng.toFixed(6)}°`;
      });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const current = interactionRef.current;
      if (current.drawingMode) {
        current.onDrawComplete?.([...current.drawnPoints, [e.latlng.lat, e.latlng.lng]]);
      } else if (current.onMapClick) {
        current.onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstance.current = null;
      layerControlRef.current?.remove();
      layerControlRef.current = null;
      coordDisplayRef.current?.remove();
      coordDisplayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsEnabled]);

  useEffect(() => {
    if (!googleMapsEnabled || !mapRef.current) return;
    if (googleMapInstance.current) return;

    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapRef.current || !window.google?.maps) return;

      const setup = mapSetupRef.current;
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: setup.center[0], lng: setup.center[1] },
        zoom: setup.zoom,
        mapTypeId: getGoogleMapType(currentLayer.current),
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: true,
        rotateControl: false,
      });

      const layerControl = document.createElement('div');
      layerControl.style.cssText = `
        position: absolute; top: 10px; right: 10px; z-index: 1000;
        display: flex; gap: 4px; background: rgba(255,255,255,0.95);
        border-radius: 10px; padding: 6px; border: 1px solid rgba(23,38,56,0.08);
        box-shadow: 0 4px 16px rgba(23,38,56,0.12);
      `;
      const layers: { key: LayerType; label: string }[] = [
        { key: 'street', label: 'Street' },
        { key: 'satellite', label: 'Satellite' },
        { key: 'terrain', label: 'Terrain' },
      ];
      layers.forEach((layer) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = layer.label;
        button.style.cssText = `
          border: none; cursor: pointer; border-radius: 6px; padding: 6px 12px;
          font-size: 12px; font-weight: 500; color: ${layer.key === currentLayer.current ? '#ffffff' : '#172638'};
          background: ${layer.key === currentLayer.current ? '#405A78' : 'transparent'};
        `;
        button.addEventListener('click', () => {
          currentLayer.current = layer.key;
          map.setMapTypeId(getGoogleMapType(layer.key));
          layerControl.querySelectorAll('button').forEach((btn, i) => {
            const selected = layers[i].key === layer.key;
            (btn as HTMLButtonElement).style.background = selected ? '#405A78' : 'transparent';
            (btn as HTMLButtonElement).style.color = selected ? '#ffffff' : '#172638';
          });
        });
        layerControl.appendChild(button);
      });
      mapRef.current.appendChild(layerControl);

      if (setup.showCoordinates) {
        const coordDiv = document.createElement('div');
        coordDiv.style.cssText = `
          position: absolute; bottom: 28px; right: 10px; z-index: 1000;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
          border-radius: 8px; padding: 6px 12px; font-size: 11px;
          font-family: 'JetBrains Mono', monospace; color: #172638; font-weight: 500;
          box-shadow: 0 2px 8px rgba(23,38,56,0.08);
          border: 1px solid rgba(23,38,56,0.06);
        `;
        coordDiv.textContent = 'Lat: 0.000000°, Lng: 0.000000°';
        mapRef.current.appendChild(coordDiv);
        map.addListener('mousemove', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          coordDiv.textContent = `Lat: ${lat.toFixed(6)}°, Lng: ${lng.toFixed(6)}°`;
        });
      }

      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        const current = interactionRef.current;
        if (current.drawingMode) {
          current.onDrawComplete?.([...current.drawnPoints, [lat, lng]]);
        } else if (current.onMapClick) {
          current.onMapClick(lat, lng);
        }
      });

      googleMapInstance.current = map;
      if (mapRef.current) {
        (mapRef.current as HTMLElement).style.position = 'relative';
      }
    });

    return () => {
      cancelled = true;
      googleMapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!googleMapsEnabled || !googleMapInstance.current) return;
    const map = googleMapInstance.current;

    googleMarkersRef.current.forEach((marker) => marker.setMap(null));
    googlePolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    googleIrrigationMarkersRef.current.forEach((marker) => marker.setMap(null));
    googleDrawMarkersRef.current.forEach((marker) => marker.setMap(null));
    if (googlePolylineRef.current) googlePolylineRef.current.setMap(null);
    if (googlePolygonRef.current) googlePolygonRef.current.setMap(null);

    googleMarkersRef.current = [];
    googlePolygonsRef.current = [];
    googleIrrigationMarkersRef.current = [];
    googleDrawMarkersRef.current = [];
    googlePolylineRef.current = null;
    googlePolygonRef.current = null;

    farms.forEach((farm) => {
      const isSelected = farm.id === selectedFarmId;
      const color = CROP_COLORS[farm.crop_type] || '#4387AE';
      const points = geoJSONToPoints(farm.boundary);
      if (points.length >= 3) {
        const polygon = new window.google.maps.Polygon({
          paths: points.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: isSelected ? '#F3CD79' : color,
          strokeWeight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#F3CD79' : color,
          fillOpacity: isSelected ? 0.25 : 0.15,
          map,
          clickable: true,
        });
        polygon.addListener('click', () => onSelectFarm?.(farm.id));
        googlePolygonsRef.current.push(polygon);
      }

      const marker = new window.google.maps.Marker({
        position: { lat: farm.center_lat, lng: farm.center_lng },
        map,
        title: farm.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 9 : 7,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: isSelected ? 2 : 1,
        },
      });
      marker.addListener('click', () => {
        onSelectFarm?.(farm.id);
      });
      googleMarkersRef.current.push(marker);
    });

    if (selectedFarmId) {
      const farm = farmsById.get(selectedFarmId);
      if (farm) {
        const pts = geoJSONToPoints(farm.boundary);
        if (pts.length >= 3) {
          const bounds = new window.google.maps.LatLngBounds();
          pts.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
          map.fitBounds(bounds, 40);
        } else {
          map.setCenter({ lat: farm.center_lat, lng: farm.center_lng });
          map.setZoom(14);
        }
      }
    }
  }, [farms, selectedFarmId, onSelectFarm, farmsById]);

  useEffect(() => {
    if (!googleMapsEnabled || !googleMapInstance.current) return;
    const map = googleMapInstance.current;

    googleIrrigationMarkersRef.current.forEach((marker) => marker.setMap(null));
    googleIrrigationMarkersRef.current = [];

    irrigationPoints.forEach((point) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        label: {
          text: (point.type || 'I').charAt(0).toUpperCase(),
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '12px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: IRRIGATION_POINT_COLORS[point.type] || '#67B7D9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      const info = new window.google.maps.InfoWindow({ content: `<div style="font-family:Inter,sans-serif;color:#172638;"><strong>${point.type}</strong><br/>${point.notes || 'No notes'}</div>` });
      marker.addListener('click', () => info.open({ map, anchor: marker }));
      googleIrrigationMarkersRef.current.push(marker);
    });
  }, [irrigationPoints]);

  useEffect(() => {
    if (!googleMapsEnabled || !googleMapInstance.current) return;
    googleDrawMarkersRef.current.forEach((marker) => marker.setMap(null));
    if (googlePolylineRef.current) googlePolylineRef.current.setMap(null);
    if (googlePolygonRef.current) googlePolygonRef.current.setMap(null);
    googleDrawMarkersRef.current = [];
    googlePolylineRef.current = null;
    googlePolygonRef.current = null;

    if (drawnPoints.length === 0) return;

    const map = googleMapInstance.current;
    drawnPoints.forEach((point, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point[0], lng: point[1] },
        map,
        label: `${index + 1}`,
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#F3CD79',
          fillOpacity: 1,
          strokeColor: '#405A78',
          strokeWeight: 2,
        },
      });
      marker.addListener('dragend', (event: any) => {
        const current = interactionRef.current;
        const updatedPoints = [...current.drawnPoints];
        if (!updatedPoints[index]) return;
        updatedPoints[index] = [event.latLng.lat(), event.latLng.lng()];
        current.onDrawComplete?.(updatedPoints);
      });
      googleDrawMarkersRef.current.push(marker);
    });

    if (drawnPoints.length >= 2) {
      const polyline = new window.google.maps.Polyline({
        path: drawnPoints.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#F3CD79',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map,
      });
      googlePolylineRef.current = polyline;
    }

    if (drawnPoints.length >= 3) {
      const polygon = new window.google.maps.Polygon({
        paths: drawnPoints.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#F3CD79',
        strokeWeight: 2,
        fillColor: '#4387AE',
        fillOpacity: 0.15,
        map,
      });
      googlePolygonRef.current = polygon;
    }
  }, [drawnPoints, drawingMode]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    drawPointsRef.current.forEach((m) => map.removeLayer(m));
    drawPointsRef.current = [];
    if (drawLineRef.current) {
      map.removeLayer(drawLineRef.current);
      drawLineRef.current = null;
    }

    if (drawnPoints.length > 0) {
      drawnPoints.forEach((pt, i) => {
        const marker = L.marker(pt, {
          draggable: true,
          icon: L.divIcon({
            className: 'farm-boundary-vertex',
            html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:2px solid #405A78;border-radius:50%;background:#F3CD79;color:#172638;font:600 11px Inter,sans-serif;box-shadow:0 2px 6px rgba(23,38,56,.3)">${i + 1}</span>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        })
          .addTo(map)
          .bindTooltip(`Vertex ${i + 1}`, { permanent: false });
        marker.on('dragend', (event: L.DragEndEvent) => {
          const current = interactionRef.current;
          const updatedPoints = [...current.drawnPoints];
          if (!updatedPoints[i]) return;
          const position = event.target.getLatLng();
          updatedPoints[i] = [position.lat, position.lng];
          current.onDrawComplete?.(updatedPoints);
        });
        drawPointsRef.current.push(marker as unknown as L.Layer);
      });

      if (drawnPoints.length >= 2) {
        drawLineRef.current = L.polyline(drawnPoints, {
          color: '#F3CD79',
          weight: 2,
          dashArray: '6 4',
          opacity: 0.8,
        }).addTo(map);

        if (drawnPoints.length >= 3) {
          drawLineRef.current = L.polygon(drawnPoints, {
            color: '#F3CD79',
            weight: 2,
            fillColor: '#4387AE',
            fillOpacity: 0.15,
            dashArray: '6 4',
          }).addTo(map);
        }
      }
    }
  }, [drawnPoints, drawingMode]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    polygonsRef.current.forEach((p) => map.removeLayer(p));
    markersRef.current.forEach((m) => map.removeLayer(m));
    polygonsRef.current = [];
    markersRef.current = [];

    farms.forEach((farm) => {
      const isSelected = farm.id === selectedFarmId;
      const color = CROP_COLORS[farm.crop_type] || '#4387AE';
      const points = geoJSONToPoints(farm.boundary);

      if (points.length >= 3) {
        const polygon = L.polygon(points, {
          color: isSelected ? '#F3CD79' : color,
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#F3CD79' : color,
          fillOpacity: isSelected ? 0.25 : 0.15,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${farm.name}</strong><br/>${farm.crop_type || 'Uncropped'} · ${farm.area_hectares.toFixed(2)} ha<br/>${farm.location || ''}`
          );

        polygon.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onSelectFarm?.(farm.id);
        });
        polygonsRef.current.push(polygon);
      }

      const marker = L.marker([farm.center_lat, farm.center_lng], {
        icon: createCropIcon(color, isSelected),
      })
        .addTo(map)
        .bindTooltip(farm.name, { direction: 'top', offset: [0, -8] });

      marker.on('click', () => {
        onSelectFarm?.(farm.id);
        map.flyTo([farm.center_lat, farm.center_lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
      });
      markersRef.current.push(marker);
    });

    if (selectedFarmId) {
      const farm = farmsById.get(selectedFarmId);
      if (farm) {
        const pts = geoJSONToPoints(farm.boundary);
        if (pts.length >= 3) {
          map.flyToBounds(L.latLngBounds(pts).pad(0.15), { duration: 0.8 });
        } else {
          map.flyTo([farm.center_lat, farm.center_lng], 14, { duration: 0.8 });
        }
      }
    }
  }, [farms, selectedFarmId, onSelectFarm, farmsById]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    irrigationMarkersRef.current.forEach((m) => map.removeLayer(m));
    irrigationMarkersRef.current = [];

    irrigationPoints.forEach((pt) => {
      const color = IRRIGATION_POINT_COLORS[pt.type] || '#67B7D9';
      const marker = L.marker([pt.lat, pt.lng], {
        icon: createIrrigationIcon(color, pt.type),
      })
        .addTo(map)
        .bindPopup(`<strong>${pt.type}</strong><br/>${pt.notes || 'No notes'}`);
      irrigationMarkersRef.current.push(marker);
    });
  }, [irrigationPoints]);

  useEffect(() => {
    if (!showLegend || !mapRef.current) return;
    if (legendRef.current) return;

    const legend = L.DomUtil.create('div', 'leaflet-legend');
    legend.style.cssText = `
      position: absolute; bottom: 28px; left: 50px; z-index: 1000;
      background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
      border-radius: 10px; padding: 10px 14px;
      box-shadow: 0 4px 16px rgba(23,38,56,0.1);
      border: 1px solid rgba(23,38,56,0.06);
      font-family: Inter, sans-serif; font-size: 11px;
      max-width: 200px;
    `;

    const crops = [...new Set(farms.map((f) => f.crop_type).filter(Boolean))];
    let html = '<div style="font-weight:600;color:#172638;margin-bottom:6px;font-size:12px;">Legend</div>';
    if (crops.length > 0) {
      html += '<div style="font-weight:500;color:#405A78;margin-bottom:4px;">Crops</div>';
      crops.forEach((c) => {
        const color = CROP_COLORS[c] || '#4387AE';
        html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;color:#172638;"><span style="width:10px;height:10px;background:${color};border-radius:50%;display:inline-block;border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.1);"></span>${c}</div>`;
      });
    }
    if (irrigationPoints.length > 0) {
      html += '<div style="font-weight:500;color:#405A78;margin:6px 0 4px;">Irrigation</div>';
      const types = [...new Set(irrigationPoints.map((p) => p.type))];
      types.forEach((t) => {
        const color = IRRIGATION_POINT_COLORS[t] || '#67B7D9';
        html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;color:#172638;"><span style="width:10px;height:10px;background:${color};border-radius:3px;display:inline-block;border:1px solid #fff;"></span>${t}</div>`;
      });
    }
    legend.innerHTML = html;
    mapRef.current.appendChild(legend);
    legendRef.current = legend;

    return () => {
      if (legendRef.current) {
        legendRef.current.remove();
        legendRef.current = null;
      }
    };
  }, [showLegend, farms, irrigationPoints]);

  return (
    <div
      ref={mapRef}
      className={`relative overflow-hidden rounded-xl border border-forest-200/80 bg-forest-100 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-forest-800 ${className}`}
      style={{
        height,
        cursor: drawingMode ? 'crosshair' : selectionMode ? 'pointer' : 'default',
      }}
    />
  );
}
