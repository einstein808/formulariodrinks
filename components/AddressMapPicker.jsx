import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiMapPin, FiCheckCircle, FiCrosshair, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

// Função auxiliar para extrair dados limpos do Nominatim
function parseNominatimData(data, fallbackLat, fallbackLng) {
  if (!data) return null;
  const address = data.address || {};
  
  // Extração inteligente de rua
  const rua = address.road || address.pedestrian || address.street || address.footway || address.avenue || address.square || '';
  
  // Extração inteligente de número
  const numero = address.house_number || address.street_number || '';
  
  // Extração inteligente de bairro
  const bairro = address.suburb || address.neighbourhood || address.city_district || address.residential || address.quarter || (data.display_name ? data.display_name.split(',')[0].trim() : '');
  
  // Extração inteligente de cidade
  const cidade = address.city || address.town || address.village || address.municipality || address.county || 'Juiz de Fora';
  
  // Extração de CEP
  const cep = address.postcode || '';
  
  const lat = parseFloat(data.lat || fallbackLat);
  const lng = parseFloat(data.lon || fallbackLng);

  return {
    rua,
    numero,
    bairro,
    cidade,
    cep,
    lat,
    lng,
    fullAddress: data.display_name || (bairro && cidade ? `${bairro}, ${cidade}` : '')
  };
}

export default function AddressMapPicker({
  value = {},
  onChange,
  placeholder = "Digite o endereço, buffet, sítio, rua ou bairro..."
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sincronizar texto de busca inicial com os dados existentes
  useEffect(() => {
    if (value.fullAddress) {
      setSearchQuery(value.fullAddress);
    } else if (value.rua || value.bairro || value.cidade) {
      const parts = [value.rua, value.bairro, value.cidade].filter(Boolean);
      if (parts.length > 0) setSearchQuery(parts.join(', '));
    }
  }, [value.fullAddress, value.rua, value.bairro, value.cidade]);

  // 1. Carregar Leaflet com CDN de alta performance
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // Centralizar o mapa nas coordenadas e mover o pino
  const centerMapOn = useCallback((lat, lng, zoomLevel = 16) => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;
    map.setView([lat, lng], zoomLevel, { animate: true, duration: 0.8 });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, []);

  // Re-geocodificar por coordenadas (Reverse Geocoding)
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      );
      if (res.ok) {
        const data = await res.json();
        const parsed = parseNominatimData(data, lat, lng);
        if (parsed) {
          setSearchQuery(parsed.fullAddress || `${parsed.bairro}, ${parsed.cidade}`);
          if (onChange) onChange(parsed);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar endereço das coordenadas:", err);
    }
  }, [onChange]);

  // 2. Inicializar o Mapa Leaflet
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    // Coordenadas padrão inicial: valor atual ou Juiz de Fora (-21.7642, -43.3503)
    const initialLat = parseFloat(value.lat) || -21.7642;
    const initialLng = parseFloat(value.lng) || -43.3503;
    const initialCoords = [initialLat, initialLng];
    const initialZoom = value.lat ? 16 : 13;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCoords,
        zoom: initialZoom,
        zoomControl: true,
        preferCanvas: true,
        fadeAnimation: false
      });

      // Camada de Tiles CartoDB Voyager (Clara, limpa e rápida)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
        keepBuffer: 4,
        updateWhenIdle: true
      }).addTo(map);

      // Criar Pino Interativo
      const marker = L.marker(initialCoords, {
        draggable: true,
        title: "Arraste este pino ou toque no mapa para definir a localização da festa"
      }).addTo(map);

      // Evento: Arrastar o pino
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        centerMapOn(pos.lat, pos.lng, map.getZoom());
        await reverseGeocode(pos.lat, pos.lng);
      });

      // Evento: Toque ou clique em qualquer lugar do mapa
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        centerMapOn(lat, lng, map.getZoom());
        await reverseGeocode(lat, lng);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;

      // Garantir renderização imediata sem tela cinza
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [mapLoaded, centerMapOn, reverseGeocode, value.lat, value.lng]);

  // Se o valor de lat/lng mudar externamente e o mapa já existir, sincronizar centro
  useEffect(() => {
    if (leafletMapRef.current && value.lat && value.lng) {
      const lat = parseFloat(value.lat);
      const lng = parseFloat(value.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        centerMapOn(lat, lng, 16);
      }
    }
  }, [value.lat, value.lng, centerMapOn]);

  // Busca Autocomplete em tempo real com debounce
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&addressdetails=1&limit=5&countrycodes=br`,
          { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
        );
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
    }, 300);
  };

  // Ao selecionar uma sugestão da lista
  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const parsed = parseNominatimData(item, lat, lng);

    if (parsed) {
      setSearchQuery(parsed.fullAddress || item.display_name);
      centerMapOn(lat, lng, 16);
      if (onChange) onChange(parsed);
    }
  };

  // Botão de Obter Localização Atual via GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada neste navegador.");
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        centerMapOn(lat, lng, 17);
        await reverseGeocode(lat, lng);
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn("Erro ao obter GPS:", err);
        alert("Não foi possível obter sua localização atual. Por favor, digite o endereço na busca.");
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Alternar modo Tela Cheia
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Campo de Pesquisa Autocomplete */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input, #111b15)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
          borderRadius: '10px',
          padding: '10px 14px',
          gap: '10px'
        }}>
          <FiSearch style={{ color: 'var(--primary, #CBA153)', fontSize: '1.1rem', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #FFFFFF)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
          {isSearching && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', flexShrink: 0 }}>
              Buscando...
            </span>
          )}
        </div>

        {/* Dropdown de Sugestões de Endereço */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#1a241e',
            border: '1px solid var(--primary, #CBA153)',
            borderRadius: '10px',
            marginTop: '4px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(0,0,0,0.85)'
          }}>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <FiMapPin style={{ color: '#FF9800', flexShrink: 0, fontSize: '1rem' }} />
                <span style={{ lineHeight: 1.3 }}>{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Container do Mapa (Sempre visível inline + suporte a fullscreen) */}
      <div style={{
        ...(isFullscreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#0a0d0b',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px'
        } : {
          position: 'relative',
          width: '100%',
          height: '280px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        })
      }}>
        {/* Barra superior no modo tela cheia */}
        {isFullscreen && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--bg-card, #141f18)',
            borderRadius: '10px 10px 0 0',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))'
          }}>
            <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
              📍 Toque ou arraste o pino até o local da festa
            </span>
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                background: 'var(--primary, #CBA153)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              ✅ Concluir
            </button>
          </div>
        )}

        {/* Elemento do Mapa Leaflet */}
        <div style={{ position: 'relative', width: '100%', height: isFullscreen ? 'calc(100vh - 120px)' : '100%' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f8f9fa' }} />

          {!mapLoaded && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#333',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              ⚡ Carregando mapa do evento...
            </div>
          )}

          {/* Botões de Ação Rápida sobre o Mapa (GPS + Tela Cheia) */}
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            display: 'flex',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocatingGps}
              title="Usar localização do meu GPS"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: '#111',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <FiCrosshair style={{ color: '#2196F3', fontSize: '0.95rem' }} />
              <span>{isLocatingGps ? 'Buscando...' : 'Meu GPS'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da tela cheia" : "Expandir mapa"}
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: '#111',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
              <span>{isFullscreen ? 'Fechar' : 'Tela Cheia'}</span>
            </button>
          </div>

          {/* Banner de Instrução */}
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(6px)',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.12)',
            fontSize: '0.76rem',
            color: '#111',
            fontWeight: '600',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 1000
          }}>
            📍 <span>Toque no mapa ou pesquise para posicionar o pino no local do evento!</span>
          </div>
        </div>

        {/* Rodapé no modo tela cheia */}
        {isFullscreen && (
          <div style={{ padding: '12px', background: 'var(--bg-card, #141f18)', borderRadius: '0 0 10px 10px' }}>
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--primary, #CBA153)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ✅ Confirmar Localização
            </button>
          </div>
        )}
      </div>

      {/* Badge de Confirmação em Destaque */}
      {(value.bairro || value.cidade || value.rua) && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.12)',
          border: '1px solid rgba(76, 175, 80, 0.35)',
          padding: '10px 14px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: '#4CAF50'
        }}>
          <FiCheckCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Local Selecionado:</strong>{' '}
            <span style={{ color: '#fff' }}>
              {[value.rua, value.bairro, value.cidade].filter(Boolean).join(', ') || 'Local Definido no Mapa'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
