import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiMapPin, FiCheckCircle } from 'react-icons/fi';

export default function AddressMapPicker({
  value = {},
  onChange,
  placeholder = "Digite a rua, bairro, sítio ou cidade do evento..."
}) {
  const [searchQuery, setSearchQuery] = useState(value.fullAddress || value.rua || value.cidade || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Injetar Leaflet CSS & JS dinamicamente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // 2. Inicializar Mapa e Pino Arrastável
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    // Coordenadas padrão inicial focadas na cidade principal (Juiz de Fora) em zoom aproximado
    const initialLat = parseFloat(value.lat) || -21.7642;
    const initialLng = parseFloat(value.lng) || -43.3503;
    const initialCoords = [initialLat, initialLng];

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCoords,
        zoom: value.lat ? 15 : 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Criar Pino Arrastável
      const marker = L.marker(initialCoords, {
        draggable: true,
        title: "Arraste este pino para ajustar a localização exata do evento"
      }).addTo(map);

      // Evento de arrastar o pino
      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        await reverseGeocode(position.lat, position.lng);
      });

      // Evento de toque / clique no mapa (perfeito para celulares)
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        await reverseGeocode(lat, lng);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
    }
  }, [mapLoaded]);

  // Reverse Geocoding (Converter latitude/longitude em dados de rua/bairro/cidade)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};

        const parsedData = {
          rua: address.road || address.pedestrian || address.suburb || '',
          bairro: address.suburb || address.neighbourhood || address.residential || address.city_district || '',
          cidade: address.city || address.town || address.village || address.municipality || 'Juiz de Fora',
          cep: address.postcode || '',
          lat: lat,
          lng: lng,
          fullAddress: data.display_name || ''
        };

        setSearchQuery(data.display_name || `${parsedData.bairro}, ${parsedData.cidade}`);
        if (onChange) onChange(parsedData);
      }
    } catch (err) {
      console.warn("Erro ao reverter coordenadas:", err);
    }
  };

  // Autocomplete de Busca no Nominatim API
  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&addressdetails=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn("Erro na busca de endereço:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Ao selecionar uma sugestão da lista
  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.address || {};

    const parsedData = {
      rua: address.road || address.pedestrian || '',
      bairro: address.suburb || address.neighbourhood || address.residential || address.city_district || item.display_name.split(',')[0],
      cidade: address.city || address.town || address.village || address.municipality || 'Juiz de Fora',
      cep: address.postcode || '',
      lat: lat,
      lng: lng,
      fullAddress: item.display_name
    };

    setSearchQuery(item.display_name);

    // Mover o mapa e o pino para a localização selecionada
    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
    }

    if (onChange) onChange(parsedData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Campo de Pesquisa de Endereço Autocomplete */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', gap: '10px' }}>
          <FiSearch style={{ color: 'var(--primary)', fontSize: '1.1rem', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          />
          {isSearching && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buscando...</span>}
        </div>

        {/* Dropdown de Sugestões de Endereço */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
            background: '#111b15', border: '1px solid var(--border-color)', borderRadius: '10px',
            marginTop: '4px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
          }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', fontSize: '0.85rem', color: '#eee',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,152,0,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FiMapPin style={{ color: '#FF9800', flexShrink: 0 }} />
                <span>{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mapa com Pino Arrastável */}
      <div style={{ display: isMobile && !showFullscreen ? 'block' : 'none' }}>
        <button
          type="button"
          onClick={() => setShowFullscreen(true)}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            background: 'var(--bg-input)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer'
          }}
        >
          📍 Toque aqui para selecionar no mapa
        </button>
      </div>

      <div style={{
        display: isMobile && !showFullscreen ? 'none' : 'flex',
        flexDirection: 'column',
        ...(showFullscreen 
          ? { position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-main)' }
          : { position: 'relative', width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }
        )
      }}>
        {showFullscreen && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-card)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Selecione o Local</h3>
            <button 
              type="button"
              onClick={() => setShowFullscreen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >✕</button>
          </div>
        )}
        
        <div style={{ position: 'relative', flex: 1, ...(showFullscreen ? { height: 'calc(100vh - 120px)' } : { height: '100%' }) }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f8f9fa' }} />

          {!mapLoaded && (
            <div style={{ position: 'absolute', inset: 0, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.85rem' }}>
              Carregando mapa do evento...
            </div>
          )}

          <div style={{ position: 'absolute', bottom: showFullscreen ? 20 : 10, left: 10, right: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.78rem', color: '#111', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 1000 }}>
            📍 <span>Dica: Toque no mapa ou arraste o pino para indicar o local exato da sua festa!</span>
          </div>
        </div>

        {showFullscreen && (
          <div style={{ padding: '16px', background: 'var(--bg-card)' }}>
            <button
              type="button"
              onClick={() => setShowFullscreen(false)}
              style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✅ Confirmar Local
            </button>
          </div>
        )}
      </div>

      {/* Badge de Confirmação do Bairro e Cidade */}
      {(value.bairro || value.cidade) && (
        <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4CAF50' }}>
          <FiCheckCircle size={16} />
          <div>
            <strong>Local Confirmado:</strong> {value.bairro ? `${value.bairro}, ` : ''}{value.cidade || 'Juiz de Fora'}
          </div>
        </div>
      )}
    </div>
  );
}
