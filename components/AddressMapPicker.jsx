import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiMapPin, FiCheckCircle, FiCrosshair, FiX, FiMap, FiEdit2 } from 'react-icons/fi';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBIlY1_e2_I1Qro82_WTwJH0s3s36J_36o';

// Função para extrair dados limpos a partir do Place do Google
function parseGooglePlace(place, fallbackLat, fallbackLng) {
  if (!place) return null;

  let rua = '';
  let numero = '';
  let bairro = '';
  let cidade = 'Juiz de Fora';
  let cep = '';

  const components = place.address_components || [];
  for (const c of components) {
    const types = c.types || [];
    if (types.includes('route')) rua = c.long_name;
    if (types.includes('street_number')) numero = c.long_name;
    if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
      bairro = c.long_name;
    }
    if (types.includes('administrative_area_level_2') || types.includes('locality')) {
      cidade = c.long_name;
    }
    if (types.includes('postal_code')) cep = c.long_name;
  }

  // Se for um buffet ou nome de estabelecimento específico
  if (!rua && place.name && place.name !== place.formatted_address) {
    rua = place.name;
  }

  let lat = fallbackLat;
  let lng = fallbackLng;
  if (place.geometry && place.geometry.location) {
    lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
    lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
  }

  return {
    rua,
    numero,
    bairro,
    cidade,
    cep,
    lat,
    lng,
    fullAddress: place.formatted_address || [rua, numero, bairro, cidade].filter(Boolean).join(', ')
  };
}

export default function AddressMapPicker({
  value = {},
  onChange,
  placeholder = "Digite o nome do buffet, sítio, chácara, rua ou bairro..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Estado temporário da localização dentro do modal
  const [tempLocation, setTempLocation] = useState({
    rua: value.rua || '',
    numero: value.numero || '',
    bairro: value.bairro || '',
    cidade: value.cidade || '',
    lat: parseFloat(value.lat) || -21.7642,
    lng: parseFloat(value.lng) || -43.3503,
    fullAddress: value.fullAddress || ''
  });

  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Sincroniza dados com o valor externo
  useEffect(() => {
    setTempLocation({
      rua: value.rua || '',
      numero: value.numero || '',
      bairro: value.bairro || '',
      cidade: value.cidade || '',
      lat: parseFloat(value.lat) || -21.7642,
      lng: parseFloat(value.lng) || -43.3503,
      fullAddress: value.fullAddress || [value.rua, value.bairro, value.cidade].filter(Boolean).join(', ')
    });
  }, [value.rua, value.numero, value.bairro, value.cidade, value.lat, value.lng, value.fullAddress]);

  // 1. Carregar Script do Google Maps com Places API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleLoaded(true);
      return;
    }

    const scriptId = 'google-maps-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      script.onerror = () => console.error("Erro ao carregar SDK do Google Maps");
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setGoogleLoaded(true);
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // Geocodificação reversa via Google Geocoder
  const reverseGeocodeGoogle = useCallback((lat, lng) => {
    if (!window.google || !window.google.maps) return;
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const parsed = parseGooglePlace(results[0], lat, lng);
        if (parsed) {
          setTempLocation(parsed);
          setSearchQuery(parsed.fullAddress || `${parsed.bairro}, ${parsed.cidade}`);
        }
      }
    });
  }, []);

  // 2. Inicializar o Google Map e o Autocomplete quando o modal abrir
  useEffect(() => {
    if (!isOpen || !googleLoaded || !window.google || !mapContainerRef.current) return;

    const currentLat = parseFloat(tempLocation.lat) || -21.7642;
    const currentLng = parseFloat(tempLocation.lng) || -43.3503;
    const centerCoords = { lat: currentLat, lng: currentLng };

    // Inicializa Mapa Google
    if (!googleMapRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: centerCoords,
        zoom: tempLocation.rua ? 16 : 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy', // Permite arrastar com 1 dedo no mobile
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] }
        ]
      });

      // Marcador Interativo
      const marker = new window.google.maps.Marker({
        position: centerCoords,
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: "Local do Evento"
      });

      // Evento: Arrastar o pino
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        reverseGeocodeGoogle(lat, lng);
      });

      // Evento: Clicar no mapa para reposicionar o pino
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocodeGoogle(lat, lng);
      });

      googleMapRef.current = map;
      markerRef.current = marker;
    } else {
      googleMapRef.current.setCenter(centerCoords);
      googleMapRef.current.setZoom(tempLocation.rua ? 16 : 14);
      if (markerRef.current) {
        markerRef.current.setPosition(centerCoords);
      }
    }

    // Inicializa o Google Places Autocomplete no input
    if (searchInputRef.current && !autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'br' },
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
        types: ['geocode', 'establishment']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place || !place.geometry || !place.geometry.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const parsed = parseGooglePlace(place, lat, lng);

        if (parsed) {
          setTempLocation(parsed);
          setSearchQuery(parsed.fullAddress || place.name || '');

          if (googleMapRef.current) {
            googleMapRef.current.setCenter({ lat, lng });
            googleMapRef.current.setZoom(17);
          }
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
          }
        }
      });

      autocompleteRef.current = autocomplete;
    }

    // Garante que o mapa redesenhe se a janela mudar
    const resizeTimer = setTimeout(() => {
      if (window.google && googleMapRef.current) {
        window.google.maps.event.trigger(googleMapRef.current, 'resize');
        googleMapRef.current.setCenter(centerCoords);
      }
    }, 300);

    return () => clearTimeout(resizeTimer);
  }, [isOpen, googleLoaded, reverseGeocodeGoogle, tempLocation.lat, tempLocation.lng, tempLocation.rua]);

  // Localização atual via GPS do dispositivo
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada neste dispositivo.");
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (googleMapRef.current) {
          googleMapRef.current.setCenter({ lat, lng });
          googleMapRef.current.setZoom(17);
        }
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        }

        reverseGeocodeGoogle(lat, lng);
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn("Erro no GPS:", err);
        alert("Não foi possível obter sua localização GPS. Por favor, pesquise o endereço na barra de busca.");
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Abrir Modal
  const handleOpenModal = () => {
    const initialAddress = value.fullAddress || [value.rua, value.bairro, value.cidade].filter(Boolean).join(', ');
    setSearchQuery(initialAddress);
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
              {hasSelectedAddress ? [value.rua, value.numero, value.bairro].filter(Boolean).join(', ') : 'Buscar Endereço no Google Maps'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasSelectedAddress 
                ? `📍 ${value.cidade || 'Juiz de Fora'} • Clique para alterar o ponto no mapa` 
                : 'Pesquise buffets, sítios, chácaras ou ruas com Google Places'}
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

      {/* ── MODAL POPUP DE SELEÇÃO GOOGLE MAPS ── */}
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
                  <FiMap /> Localização do Evento (Google Maps)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)' }}>
                  Pesquise pelo nome do buffet, sítio, espaço ou arraste o pino no mapa
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

            {/* Barra de Pesquisa Google Places e GPS */}
            <div style={{ padding: '14px 20px', background: '#111b15', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1000 }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(203, 161, 83, 0.4)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  gap: '10px'
                }}>
                  <FiSearch style={{ color: 'var(--primary, #CBA153)', fontSize: '1.1rem', flexShrink: 0 }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    defaultValue={searchQuery}
                    placeholder={placeholder}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#FFF',
                      outline: 'none',
                      fontSize: '0.92rem'
                    }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        if (searchInputRef.current) searchInputRef.current.value = '';
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
                    >
                      <FiX size={16} />
                    </button>
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
            </div>

            {/* Container do Google Map */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: '#e5e3df' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

              {!googleLoaded && (
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
                  ⚡ Carregando Google Maps...
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
                📍 Toque no mapa ou arraste o pino vermelho para ajustar o ponto exato
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
