'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Calendar,
  ChevronDown,
  Clock,
  Filter,
  MapPin,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';
import { eventsApi, type Event } from '@/lib/api';

type MapPlace = {
  id: string;
  name: string;
  category: string;
  address: string;
  date: string;
  time: string;
  color: string;
  lat: number;
  lng: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  Фестиваль: '#a855f7',
  Вечеринка: '#f59e0b',
  Выставка: '#06b6d4',
  'Фуд-Фест': '#f97316',
  Стендап: '#ec4899',
  Концерт: '#8b5cf6',
  Спорт: '#22c55e',
  Акция: '#ef4444',
};

function isUpcoming(event: Event) {
  const timestamp = new Date(event.date).getTime();
  return Number.isFinite(timestamp) && timestamp + 86_400_000 >= Date.now();
}

function eventToPlace(event: Event): MapPlace | null {
  if (event.latitude == null || event.longitude == null || !isUpcoming(event)) {
    return null;
  }

  const date = new Date(event.date);
  return {
    id: event.id,
    name: event.title,
    category: event.category || 'Событие',
    address: event.address || event.location || 'Адрес уточняется',
    date: date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    }),
    time: event.startTime || 'Время уточняется',
    color: CATEGORY_COLORS[event.category] || '#a855f7',
    lat: event.latitude,
    lng: event.longitude,
  };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

export default function MapPage() {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [showList, setShowList] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const categories = useMemo(
    () => ['Все', ...Array.from(new Set(places.map((place) => place.category)))],
    [places],
  );
  const filteredPlaces = useMemo(
    () =>
      selectedCategory === 'Все'
        ? places
        : places.filter((place) => place.category === selectedCategory),
    [places, selectedCategory],
  );

  const loadPlaces = useCallback(async () => {
    setPlacesLoading(true);
    setPlacesError(false);
    try {
      const response = await eventsApi.list({ take: 100 });
      const currentPlaces = (response.data ?? [])
        .map(eventToPlace)
        .filter((place): place is MapPlace => place !== null);
      setPlaces(currentPlaces);
    } catch (error) {
      console.error('Map events fetch failed:', error);
      setPlaces([]);
      setPlacesError(true);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const addMarkers = useCallback((items: MapPlace[]) => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return;

    markersRef.current.forEach((marker) => map.geoObjects.remove(marker));
    markersRef.current = [];

    items.forEach((place) => {
      const pinSvg = `
        <svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${place.id}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="${place.color}" flood-opacity="0.45"/>
            </filter>
          </defs>
          <path d="M24 2C12.95 2 4 10.95 4 22c0 14 20 32 20 32s20-18 20-32C44 10.95 35.05 2 24 2z"
                fill="${place.color}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"
                filter="url(#shadow-${place.id})"/>
          <circle cx="24" cy="20" r="8" fill="rgba(255,255,255,0.25)"/>
          <circle cx="24" cy="20" r="4" fill="white"/>
        </svg>
      `;

      const placemark = new window.ymaps.Placemark(
        [place.lat, place.lng],
        {
          hintContent: `<b>${place.name}</b><br>${place.category}`,
        },
        {
          iconLayout: 'default#imageWithContent',
          iconImageHref: `data:image/svg+xml,${encodeURIComponent(pinSvg)}`,
          iconImageSize: [48, 56],
          iconImageOffset: [-24, -56],
          iconContentOffset: [0, 0],
        },
      );

      placemark.events.add('click', () => {
        setSelectedPlace(place);
        setShowList(false);
      });

      map.geoObjects.add(placemark);
      markersRef.current.push(placemark);
    });
  }, []);

  const initMap = useCallback(() => {
    if (!window.ymaps || !mapContainerRef.current) return;

    window.ymaps.ready(() => {
      if (mapRef.current || !mapContainerRef.current) return;

      try {
        mapRef.current = new window.ymaps.Map(
          mapContainerRef.current,
          {
            center: [41.3111, 69.2797],
            zoom: 12,
            controls: ['zoomControl'],
          },
          {
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true,
          },
        );
        setMapReady(true);
      } catch (error) {
        console.error('Map init error:', error);
        setMapError(true);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.ymaps) {
      initMap();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-perkly-yandex-map]',
    );
    const script = existingScript ?? document.createElement('script');
    if (!existingScript) {
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
      script.async = true;
      script.dataset.perklyYandexMap = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', initMap);
    script.addEventListener('error', () => setMapError(true));

    return () => {
      script.removeEventListener('load', initMap);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  useEffect(() => {
    if (!mapReady) return;
    addMarkers(filteredPlaces);
  }, [addMarkers, filteredPlaces, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !selectedPlace) return;
    void mapRef.current
      .panTo([selectedPlace.lat, selectedPlace.lng], {
        flying: true,
        duration: 500,
      })
      .then(() => mapRef.current?.setZoom(14, { duration: 300 }));
  }, [selectedPlace]);

  const centerOnMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((position) => {
      void mapRef.current?.panTo(
        [position.coords.latitude, position.coords.longitude],
        { flying: true, duration: 600 },
      );
    });
  };

  return (
    <div className="map-page">
      <div className="map-area">
        <div ref={mapContainerRef} className="yandex-map-container" />

        {!mapReady && !mapError && (
          <div className="map-loading">
            <div className="map-loading-spinner" />
            <span>Загрузка карты...</span>
          </div>
        )}

        {mapError && (
          <div className="map-loading">
            <MapPin className="h-10 w-10 text-white/10" />
            <span>Не удалось загрузить карту</span>
            <button
              onClick={() => {
                setMapError(false);
                initMap();
              }}
              className="map-retry-btn"
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div className="map-search-bar">
          <MapPin className="h-4 w-4 text-white/40" />
          <span className="text-sm text-white/40">
            Актуальные мероприятия на карте
          </span>
        </div>

        <button
          className="map-center-btn"
          onClick={centerOnMe}
          aria-label="Центрировать карту на моей позиции"
          title="Моя позиция"
        >
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {categories.length > 1 && (
        <div className="map-categories">
          {categories.map((category) => (
            <button
              key={category}
              className={`map-cat-chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(category);
                setSelectedPlace(null);
              }}
            >
              {category === 'Все' && <Filter className="h-3.5 w-3.5" />}
              {category}
            </button>
          ))}
        </div>
      )}

      <div className={`map-bottom-sheet ${showList ? 'expanded' : ''}`}>
        <button
          className="sheet-handle"
          onClick={() => places.length > 0 && setShowList((value) => !value)}
          disabled={places.length === 0}
        >
          <div className="handle-bar" />
          <span className="mt-1 text-xs text-white/30">
            {placesLoading
              ? 'Обновляем мероприятия'
              : `${filteredPlaces.length} актуальных мероприятий`}
          </span>
          {places.length > 0 && (
            <ChevronDown
              className={`sheet-chevron h-4 w-4 text-white/30 ${showList ? 'rotated' : ''}`}
            />
          )}
        </button>

        {!placesLoading && placesError && (
          <div className="px-6 pb-7 text-center">
            <p className="text-sm text-white/45">Не удалось получить мероприятия</p>
            <button className="map-retry-btn mt-4" onClick={() => void loadPlaces()}>
              Повторить
            </button>
          </div>
        )}

        {!placesLoading && !placesError && places.length === 0 && (
          <div className="px-6 pb-8 text-center">
            <MapPin className="mx-auto mb-3 h-7 w-7 text-white/15" />
            <h2 className="text-base font-semibold text-white/65">
              На карте пока нет актуальных событий
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-white/30">
              Событие появится здесь после публикации даты и точного адреса.
            </p>
          </div>
        )}

        {selectedPlace && !showList && (
          <div className="selected-place-card">
            <div className="place-card-header">
              <div
                className="place-cat-dot"
                style={{ background: selectedPlace.color }}
              />
              <span className="place-cat-label">{selectedPlace.category}</span>
            </div>
            <h3 className="place-name">{selectedPlace.name}</h3>
            <p className="place-address">{selectedPlace.address}</p>
            <div className="place-meta-row">
              <div className="place-meta-item">
                <Calendar className="h-3.5 w-3.5" />
                <span>{selectedPlace.date}</span>
              </div>
              <div className="place-meta-item">
                <Clock className="h-3.5 w-3.5" />
                <span>{selectedPlace.time}</span>
              </div>
            </div>
            <div className="place-actions">
              <Link href="/feed" className="place-action-btn primary">
                Подробнее
              </Link>
            </div>
          </div>
        )}

        {showList && (
          <div className="places-list">
            {filteredPlaces.map((place) => (
              <button
                key={place.id}
                className="place-list-item"
                onClick={() => {
                  setSelectedPlace(place);
                  setShowList(false);
                }}
              >
                <div
                  className="place-list-dot"
                  style={{ background: place.color }}
                />
                <div className="place-list-info">
                  <h4>{place.name}</h4>
                  <p>{place.address}</p>
                </div>
                <div className="place-list-meta">
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
