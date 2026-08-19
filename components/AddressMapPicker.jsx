import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiMapPin, FiCheckCircle, FiCrosshair, FiX, FiMap, FiEdit2 } from 'react-icons/fi';

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
  placeholder = "Digite o nome do buffet, sítio, rua ou bairro..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Estado temporário dentro do modal antes de confirmar
  const [tempLocation, setTempLocation] = useState({
    rua: value.rua || '',
    numero: value.numero || '',
    bairro: value.bairro || '',
    cidade: value.cidade || '',
    lat: value.lat || -21.7642,
    lng: value.lng || -43.3503,
    fullAddress: value.fullAddress || ''
  });

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sincroniza dados com o valor externo
  useEffect(() => {
    setTempLocation({
      rua: value.rua || '',
      numero: value.numero || '',
      bairro: value.bairro || '',
      cidade: value.cidade || '',
      lat: value.lat || -21.7642,
      lng: value.lng || -43.3503,
      fullAddress: value.fullAddress || [value.rua, value.bairro, value.cidade].filter(Boolean).join(', ')
    });
  }, [value.rua, value.numero, value.bairro, value.cidade, value.lat, value.lng, value.fullAddress]);

  // 1. Carregar Leaflet via CDN quando necessário
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
    map.setView([lat, lng], zoomLevel, { animate: true, duration: 0.5 });
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
          setTempLocation(parsed);
          setSearchQuery(parsed.fullAddress || `${parsed.bairro}, ${parsed.cidade}`);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar endereço das coordenadas:", err);
    }
  }, []);

  // 2. Inicializar o Mapa Leaflet quando o modal for aberto
  useEffect(() => {
    if (!isOpen || !mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    const initialLat = parseFloat(tempLocation.lat) || -21.7642;
    const initialLng = parseFloat(tempLocation.lng) || -43.3503;
    const initialCoords = [initialLat, initialLng];
    const initialZoom = tempLocation.rua ? 16 : 13;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCoords,
        zoom: initialZoom,
        zoomControl: true,
        preferCanvas: true,
        fadeAnimation: false
      });

      // Camada de Mapa Voyager Clara e Rápida
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
        keepBuffer: 4,
        updateWhenIdle: true
      }).addTo(map);

      // Pino Interativo
      const marker = L.marker(initialCoords, {
        draggable: true,
        title: "Arraste este pino para o local exato do evento"
      }).addTo(map);

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        centerMapOn(pos.lat, pos.lng, map.getZoom());
        await reverseGeocode(pos.lat, pos.lng);
      });

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        centerMapOn(lat, lng, map.getZoom());
        await reverseGeocode(lat, lng);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
    } else {
      leafletMapRef.current.setView(initialCoords, initialZoom);
      if (markerRef.current) {
        markerRef.current.setLatLng(initialCoords);
      }
    }

    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, mapLoaded, centerMapOn, reverseGeocode, tempLocation.lat, tempLocation.lng, tempLocation.rua]);

  // Busca Autocomplete com Debounce
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&addressdetails=1&limit=6&countrycodes=br`,
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

  // Ao selecionar uma sugestão da busca
  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const parsed = parseNominatimData(item, lat, lng);

    if (parsed) {
      setTempLocation(parsed);
      setSearchQuery(parsed.fullAddress || item.display_name);
      centerMapOn(lat, lng, 16);
    }
  };

  // Localização via GPS
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
        alert("Não foi possível obter sua localização atual via GPS. Por favor, digite o endereço na busca.");
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Abrir Modal
  const handleOpenModal = () => {
    setTempLocation({
      rua: value.rua || '',
      numero: value.numero || '',
      bairro: value.bairro || '',
      cidade: value.cidade || '',
      lat: value.lat || -21.7642,
      lng: value.lng || -43.3503,
      fullAddress: value.fullAddress || [value.rua, value.bairro, value.cidade].filter(Boolean).join(', ')
    });
    setSearchQuery(value.fullAddress || [value.rua, value.bairro, value.cidade].filter(Boolean).join(', '));
    setIsOpen(true);
  };

  // Confirmar localização selecionada
  const handleConfirmLocation = () => {
    if (onChange) {
      onChange(tempLocation);
    }
    setIsOpen(false);
  };

  const hasSelectedAddress = value.rua || value.bairro || value.cidade;

  return (
    <div style={{ width: '100%' }}>
      {/* ── CARD PRINCIPAL NO FORMULÁRIO (CLEAN & DIRETO) ── */}
      <div
        onClick={handleOpenModal}
        style={{
          background: hasSelectedAddress ? 'rgba(203, 161, 83, 0.08)' : 'rgba(255,255,255,0.03)',
          border: hasSelectedAddress ? '1.5px solid var(--primary, #CBA153)' : '1.5px dashed rgba(203, 161, 83, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          transition: 'all 0.25s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(203, 161, 83, 0.14)'}
        onMouseLeave={(e) => e.currentTarget.style.background = hasSelectedAddress ? 'rgba(203, 161, 83, 0.08)' : 'rgba(255,255,255,0.03)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: hasSelectedAddress ? 'var(--primary, #CBA153)' : 'rgba(255,255,255,0.08)',
            color: hasSelectedAddress ? '#000' : 'var(--primary, #CBA153)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            flexShrink: 0
          }}>
            <FiMapPin />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasSelectedAddress ? [value.rua, value.numero, value.bairro].filter(Boolean).join(', ') : 'Buscar Endereço & Marcar no Mapa'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasSelectedAddress 
                ? `📍 ${value.cidade || 'Juiz de Fora'} • Clique para alterar o ponto no mapa` 
                : 'Toque aqui para pesquisar buffet, sítio ou rua do evento'}
            </span>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: hasSelectedAddress ? 'transparent' : 'var(--primary, #CBA153)',
            border: hasSelectedAddress ? '1px solid var(--primary, #CBA153)' : 'none',
            color: hasSelectedAddress ? 'var(--primary, #CBA153)' : '#000',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {hasSelectedAddress ? <><FiEdit2 size={13} /> Alterar</> : <><FiSearch size={13} /> Abrir Mapa</>}
        </button>
      </div>

      {/* ── MODAL POPUP DE SELEÇÃO DE ENDEREÇO & MAPA ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: '#0d1611',
              border: '1px solid rgba(203, 161, 83, 0.4)',
              borderRadius: '16px',
              maxWidth: '780px',
              width: '100%',
              height: '88vh',
              maxHeight: '750px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            {/* Header do Modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary, #CBA153)', fontSize: '1.15rem', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiMap /> Selecionar Local do Evento
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)' }}>
                  Digite o nome do local ou arraste o pino no mapa para ajustar
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  cursor: 'pointer',
                  fontSize: '1.1rem'
                }}
              >
                <FiX />
              </button>
            </div>

            {/* Barra de Pesquisa e GPS */}
            <div style={{ padding: '14px 20px', background: '#111b15', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1000 }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(203, 161, 83, 0.3)',
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
                      color: '#FFF',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
                    >
                      <FiX size={16} />
                    </button>
                  )}
                  {isSearching && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary, #CBA153)' }}>Buscando...</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingGps}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FiCrosshair style={{ color: '#2196F3' }} />
                  <span>{isLocatingGps ? 'Localizando...' : 'Meu GPS'}</span>
                </button>
              </div>

              {/* Dropdown de Sugestões de Endereço */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '20px',
                  right: '20px',
                  zIndex: 99999,
                  background: '#16221b',
                  border: '1.5px solid var(--primary, #CBA153)',
                  borderRadius: '10px',
                  marginTop: '6px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.9)'
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
                        transition: 'background 0.15s'
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

            {/* Container do Mapa Leaflet */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: '#e5e3df' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

              {!mapLoaded && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#0d1611',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary, #CBA153)',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  ⚡ Carregando mapa...
                </div>
              )}

              {/* Dica Flutuante no Topo do Mapa */}
              <div style={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(6px)',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '0.75rem',
                color: '#FFF',
                fontWeight: '600',
                zIndex: 1000,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}>
                👆 Toque no mapa ou arraste o marcador para ajustar o ponto
              </div>
            </div>

            {/* Footer com Detalhes Detectados & Botão Confirmar */}
            <div style={{
              padding: '16px 20px',
              background: '#111b15',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FiCheckCircle style={{ color: '#4CAF50', flexShrink: 0, fontSize: '1.1rem' }} />
                  <div style={{ fontSize: '0.85rem', color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>Local Selecionado:</strong>{' '}
                    <span>
                      {[tempLocation.rua, tempLocation.numero, tempLocation.bairro, tempLocation.cidade].filter(Boolean).join(', ') || 'Juiz de Fora - MG'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary, #aaa)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: 'var(--primary, #CBA153)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(203,161,83,0.3)'
                  }}
                >
                  <FiCheckCircle size={17} /> Confirmar Este Endereço
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
