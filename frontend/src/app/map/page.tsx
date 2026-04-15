'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Navigation, ChevronDown, Calendar, Clock, Users, Flame, Star, Filter } from 'lucide-react';
import Link from 'next/link';

// Demo venue/event data with real Tashkent coordinates
const DEMO_PLACES = [
  {
    id: '1',
    name: 'Electric Nights Festival',
    category: 'Фестиваль',
    address: 'Центральный Парк, ул. Паркова 42',
    distance: '1.2 км',
    rating: 4.8,
    attendees: 3200,
    date: '15 Авг',
    time: '19:00',
    color: '#a855f7',
    lat: 41.3111,
    lng: 69.2797,
    hot: true,
  },
  {
    id: '2',
    name: 'Skyline Gala',
    category: 'Вечеринка',
    address: 'Sky Lounge, пр. Амира Темура 88',
    distance: '2.8 км',
    rating: 4.9,
    attendees: 1200,
    date: '20 Июл',
    time: '21:00',
    color: '#f59e0b',
    lat: 41.3145,
    lng: 69.2520,
    hot: true,
  },
  {
    id: '3',
    name: 'Abstract Voices',
    category: 'Выставка',
    address: 'Галерея Modern, ул. Навои 15',
    distance: '0.8 км',
    rating: 4.6,
    attendees: 2400,
    date: '10 Июн',
    time: '11:00',
    color: '#06b6d4',
    lat: 41.3260,
    lng: 69.2890,
    hot: false,
  },
  {
    id: '4',
    name: 'Night Bites Фуд-Маркет',
    category: 'Фуд-Фест',
    address: 'Magic City, ул. Буюк Ипак Йули 154',
    distance: '4.1 км',
    rating: 4.7,
    attendees: 5100,
    date: '5 Сен',
    time: '18:00',
    color: '#f97316',
    lat: 41.2988,
    lng: 69.3350,
    hot: true,
  },
  {
    id: '5',
    name: 'Вечер Стендапа',
    category: 'Стендап',
    address: 'Comedy Club, ул. Шота Руставели 26',
    distance: '1.5 км',
    rating: 4.5,
    attendees: 800,
    date: '28 Июл',
    time: '20:00',
    color: '#ec4899',
    lat: 41.3050,
    lng: 69.2650,
    hot: false,
  },
  {
    id: '6',
    name: 'Yoga in the Park',
    category: 'Спорт',
    address: 'Парк Бабура, центральная аллея',
    distance: '3.2 км',
    rating: 4.3,
    attendees: 150,
    date: '12 Июл',
    time: '07:00',
    color: '#22c55e',
    lat: 41.3180,
    lng: 69.2420,
    hot: false,
  },
];

const CATEGORIES = ['Все', 'Фестиваль', 'Вечеринка', 'Выставка', 'Фуд-Фест', 'Стендап', 'Спорт'];

// Declare ymaps on window
declare global {
  interface Window {
    ymaps: any;
  }
}

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [selectedPlace, setSelectedPlace] = useState<typeof DEMO_PLACES[0] | null>(null);
  const [showList, setShowList] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const filteredPlaces = selectedCategory === 'Все'
    ? DEMO_PLACES
    : DEMO_PLACES.filter(p => p.category === selectedCategory);

  // Load Yandex Maps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ymaps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    script.async = true;
    script.onload = () => initMap();
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = useCallback(() => {
    if (!window.ymaps || !mapContainerRef.current) return;

    window.ymaps.ready(() => {
      if (mapRef.current) return; // Already initialized

      try {
        const map = new window.ymaps.Map(mapContainerRef.current, {
          center: [41.3111, 69.2797],
          zoom: 12,
          controls: ['zoomControl'],
        }, {
          suppressMapOpenBlock: true,
          yandexMapDisablePoiInteractivity: true,
        });

        mapRef.current = map;
        setMapReady(true);
        addMarkers(DEMO_PLACES);
      } catch (err) {
        console.error('Map init error:', err);
        setMapError(true);
      }
    });
  }, []);

  const addMarkers = (places: typeof DEMO_PLACES) => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    places.forEach(place => {
      const pinSvg = `
        <svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${place.id}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="${place.color}" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M24 2C12.95 2 4 10.95 4 22c0 14 20 32 20 32s20-18 20-32C44 10.95 35.05 2 24 2z"
                fill="${place.color}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"
                filter="url(#shadow-${place.id})"/>
          <circle cx="24" cy="20" r="8" fill="rgba(255,255,255,0.25)"/>
          <circle cx="24" cy="20" r="4" fill="white"/>
          ${place.hot ? `<circle cx="38" cy="8" r="6" fill="#ef4444" stroke="white" stroke-width="1.5"/>` : ''}
        </svg>
      `;

      const placemark = new window.ymaps.Placemark(
        [place.lat, place.lng],
        {
          hintContent: `<b>${place.name}</b><br>${place.category}`,
        },
        {
          iconLayout: 'default#imageWithContent',
          iconImageHref: 'data:image/svg+xml,' + encodeURIComponent(pinSvg),
          iconImageSize: [48, 56],
          iconImageOffset: [-24, -56],
          iconContentOffset: [0, 0],
        }
      );

      placemark.events.add('click', () => {
        setSelectedPlace(place);
        setShowList(false);
      });

      map.geoObjects.add(placemark);
      markersRef.current.push(placemark);
    });
  };

  // Update markers on filter change
  useEffect(() => {
    if (!mapReady) return;
    addMarkers(filteredPlaces);
  }, [selectedCategory, mapReady]);

  // Pan to selected place
  useEffect(() => {
    if (!mapRef.current || !selectedPlace) return;
    mapRef.current.panTo([selectedPlace.lat, selectedPlace.lng], {
      flying: true,
      duration: 500,
    }).then(() => {
      mapRef.current.setZoom(14, { duration: 300 });
    });
  }, [selectedPlace]);

  const centerOnMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current.panTo([pos.coords.latitude, pos.coords.longitude], {
          flying: true, duration: 600,
        });
      },
      () => {
        mapRef.current.panTo([41.3111, 69.2797], { flying: true, duration: 600 });
      }
    );
  };

  return (
    <div className="map-page">
      {/* Map Area */}
      <div className="map-area">
        <div ref={mapContainerRef} className="yandex-map-container" />

        {/* Loading state */}
        {!mapReady && !mapError && (
          <div className="map-loading">
            <div className="map-loading-spinner" />
            <span>Загрузка карты...</span>
          </div>
        )}

        {/* Error state */}
        {mapError && (
          <div className="map-loading">
            <MapPin className="w-10 h-10 text-white/10" />
            <span>Не удалось загрузить карту</span>
            <button
              onClick={() => { setMapError(false); initMap(); }}
              className="map-retry-btn"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Top search bar overlay */}
        <div className="map-search-bar">
          <MapPin className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/40">Поиск мест и мероприятий...</span>
        </div>

        {/* Center on me button */}
        <button className="map-center-btn" onClick={centerOnMe}>
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Category filter chips */}
      <div className="map-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`map-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat);
              setSelectedPlace(null);
            }}
          >
            {cat === 'Все' && <Filter className="w-3.5 h-3.5" />}
            {cat}
          </button>
        ))}
      </div>

      {/* Bottom sheet */}
      <div className={`map-bottom-sheet ${showList ? 'expanded' : ''}`}>
        <button className="sheet-handle" onClick={() => setShowList(!showList)}>
          <div className="handle-bar" />
          <span className="text-xs text-white/30 mt-1">
            {filteredPlaces.length} мест рядом
          </span>
          <ChevronDown className={`w-4 h-4 text-white/30 sheet-chevron ${showList ? 'rotated' : ''}`} />
        </button>

        {/* Selected Place Card */}
        {selectedPlace && !showList && (
          <div className="selected-place-card">
            <div className="place-card-header">
              <div className="place-cat-dot" style={{ background: selectedPlace.color }} />
              <span className="place-cat-label">{selectedPlace.category}</span>
              {selectedPlace.hot && (
                <span className="place-hot-tag">
                  <Flame className="w-3 h-3" /> Горячее
                </span>
              )}
            </div>
            <h3 className="place-name">{selectedPlace.name}</h3>
            <p className="place-address">{selectedPlace.address}</p>
            <div className="place-meta-row">
              <div className="place-meta-item">
                <Calendar className="w-3.5 h-3.5" />
                <span>{selectedPlace.date}</span>
              </div>
              <div className="place-meta-item">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedPlace.time}</span>
              </div>
              <div className="place-meta-item">
                <Users className="w-3.5 h-3.5" />
                <span>{selectedPlace.attendees}</span>
              </div>
              <div className="place-meta-item">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span>{selectedPlace.rating}</span>
              </div>
            </div>
            <div className="place-actions">
              <Link href="/feed" className="place-action-btn primary">Подробнее</Link>
              <button className="place-action-btn secondary">
                <Navigation className="w-4 h-4" />
                {selectedPlace.distance}
              </button>
            </div>
          </div>
        )}

        {/* Place List */}
        {showList && (
          <div className="places-list">
            {filteredPlaces.map(place => (
              <button
                key={place.id}
                className="place-list-item"
                onClick={() => {
                  setSelectedPlace(place);
                  setShowList(false);
                }}
              >
                <div className="place-list-dot" style={{ background: place.color }} />
                <div className="place-list-info">
                  <h4>{place.name}</h4>
                  <p>{place.address}</p>
                </div>
                <div className="place-list-meta">
                  <span className="place-list-distance">{place.distance}</span>
                  <span className="place-list-date">{place.date}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
