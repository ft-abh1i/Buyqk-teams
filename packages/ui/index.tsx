import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Navigation, Compass } from 'lucide-react';
import { LatLng } from '@buyqk/types';

// ==========================================
// VECTOR BRAND LOGO
// ==========================================
export const BuyQkLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => {
  return (
    <img src="/assets/logopng.png" className={className} alt="buyQk Logo" />
  );
};

// ==========================================
// BUTTON COMPONENT
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = "font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-gradient-to-b from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-300 hover:via-yellow-400 hover:to-amber-400 text-slate-950 font-bold border border-yellow-300/40 shadow-[0_4px_20px_rgba(255,193,7,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent",
    secondary: "bg-[#102A4C]/60 hover:bg-[#102A4C]/95 text-white border border-blue-900/40 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)]",
    danger: "bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 text-white font-semibold border border-red-400/40 shadow-[0_4px_16px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]",
    glass: "bg-white/5 hover:bg-white/12 text-white border border-white/20 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_8px_32px_rgba(3,13,26,0.3)]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3 text-lg"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ==========================================
// CARD COMPONENT
// ==========================================
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}> = ({ children, className = '', onClick, hoverEffect = true }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#102A4C]/45 backdrop-blur-xl border border-blue-900/20 rounded-2xl p-5 shadow-2xl transition-all duration-300
        ${hoverEffect ? 'hover:border-yellow-500/45 hover:shadow-yellow-500/5 hover:-translate-y-0.5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ==========================================
// INPUT COMPONENT
// ==========================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</label>}
        <input
          ref={ref}
          className={`
            bg-slate-900/60 border border-blue-900/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/60 transition-all duration-200
            ${error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-400">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ==========================================
// BADGE COMPONENT
// ==========================================
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    neutral: "bg-slate-700/10 text-slate-400 border border-slate-700/20"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border uppercase ${styles[variant]}`}>
      {children}
    </span>
  );
};

// ==========================================
// MODAL COMPONENT
// ==========================================
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#081C3A] border border-blue-900/40 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden z-10 p-6 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// TOAST ALERT MANAGER
// ==========================================
let toastFn: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (toastFn) toastFn(msg, type);
  else console.log(`[Toast ${type}]`, msg);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    toastFn = (msg, type = 'info') => {
      setToast({ message: msg, type });
    };
    return () => {
      toastFn = null;
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const bgColors = {
    success: 'bg-emerald-600/90 border-emerald-500/50 text-white',
    error: 'bg-red-600/90 border-red-500/50 text-white',
    info: 'bg-slate-800/90 border-blue-800/50 text-white'
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 ${bgColors[toast.type]}`}
          >
            <span className="text-sm font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-0.5 rounded hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==========================================
// LEAFLET MAP INTERACTIVE COMPONENT
// ==========================================
interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  marker?: LatLng;
  markerDraggable?: boolean;
  onMarkerDragEnd?: (latlng: LatLng) => void;
  onMapClick?: (latlng: LatLng) => void;
  polygonCoordinates?: LatLng[];
  shops?: { id: string; name: string; location: LatLng; address: string }[];
  onShopClick?: (shopId: string) => void;
  className?: string;
  tileProvider?: 'openstreetmap' | 'google';
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 13,
  marker,
  markerDraggable = false,
  onMarkerDragEnd,
  onMapClick,
  polygonCoordinates,
  shops = [],
  onShopClick,
  className = "h-[400px] w-full rounded-2xl overflow-hidden border border-blue-900/30 shadow-inner relative",
  tileProvider = 'openstreetmap'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const polygonInstanceRef = useRef<any>(null);
  const shopMarkersRef = useRef<any[]>([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Load Leaflet Script and CSS Dynamically from CDN
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setIsLeafletLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Keep styling and script to avoid flickering reload across pages,
      // but clean up map instances.
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Create Map
    const map = L.map(mapRef.current).setView([center.latitude, center.longitude], zoom);
    leafletMapInstanceRef.current = map;

    // Dynamic Tile Selection: standard OSM Voyager or Google Maps Road Layout
    const tileUrl = tileProvider === 'google'
      ? 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: tileProvider === 'google' ? '&copy; Google Maps' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Map Click Listener
    if (onMapClick) {
      map.on('click', (e: any) => {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      });
    }

    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [isLeafletLoaded, tileProvider]);

  // Update center when it changes
  useEffect(() => {
    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.setView([center.latitude, center.longitude]);
    }
  }, [center.latitude, center.longitude]);

  // Handle User/Selected Location Marker
  useEffect(() => {
    if (!isLeafletLoaded || !leafletMapInstanceRef.current) return;
    const L = (window as any).L;
    const map = leafletMapInstanceRef.current;

    // Remove existing marker
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    if (marker) {
      const markerOptions: any = { draggable: markerDraggable };
      
      // Make custom yellow marker icon using standard Leaflet icons
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-7 h-7 bg-yellow-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg animate-bounce">
                 <span class="text-slate-950 text-xs">📍</span>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });
      markerOptions.icon = customIcon;

      const userMarker = L.marker([marker.latitude, marker.longitude], markerOptions).addTo(map);
      userMarkerRef.current = userMarker;

      if (onMarkerDragEnd) {
        userMarker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          onMarkerDragEnd({ latitude: latlng.lat, longitude: latlng.lng });
        });
      }
    }
  }, [marker?.latitude, marker?.longitude, markerDraggable, isLeafletLoaded]);

  // Handle Polygon Boundaries (Zones)
  useEffect(() => {
    if (!isLeafletLoaded || !leafletMapInstanceRef.current) return;
    const L = (window as any).L;
    const map = leafletMapInstanceRef.current;

    if (polygonInstanceRef.current) {
      map.removeLayer(polygonInstanceRef.current);
    }

    if (polygonCoordinates && polygonCoordinates.length > 0) {
      const latlngs = polygonCoordinates.map(c => [c.latitude, c.longitude]);
      const polygon = L.polygon(latlngs, {
        color: '#FFC107',
        fillColor: '#FFC107',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(map);
      polygonInstanceRef.current = polygon;
    }
  }, [polygonCoordinates, isLeafletLoaded]);

  // Handle Shop Markers
  useEffect(() => {
    if (!isLeafletLoaded || !leafletMapInstanceRef.current) return;
    const L = (window as any).L;
    const map = leafletMapInstanceRef.current;

    // Clear old shop markers
    shopMarkersRef.current.forEach(m => map.removeLayer(m));
    shopMarkersRef.current = [];

    shops.forEach(shop => {
      const shopIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 bg-blue-900 text-white rounded-full border-2 border-yellow-500 flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer">
                 <span class="text-sm">🏪</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const m = L.marker([shop.location.latitude, shop.location.longitude], { icon: shopIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1 font-sans">
            <h4 class="font-bold text-slate-900 m-0 text-sm">${shop.name}</h4>
            <p class="text-xs text-slate-600 m-0 mt-1">${shop.address}</p>
          </div>
        `);

      m.on('click', () => {
        if (onShopClick) onShopClick(shop.id);
      });

      shopMarkersRef.current.push(m);
    });
  }, [shops, isLeafletLoaded]);

  return (
    <div className={className}>
      {!isLeafletLoaded && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
          <Compass className="w-10 h-10 text-yellow-500 animate-spin" />
          <span className="text-slate-400 font-semibold tracking-wider text-sm">Loading buyQk Map Canvas...</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};
