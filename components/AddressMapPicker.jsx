import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiMapPin, FiCheckCircle, FiCrosshair, FiX, FiMap, FiEdit2 } from 'react-icons/fi';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBIlY1_e2_I1Qro82_WTwJH0s3s36J_36o';

// Extração de dados a partir do Google Place
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
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    fullAddress: place.formatted_address || [rua, numero, bairro, cidade].filter(Boolean).join(', ')
  };
}

// Extração de dados a partir do Nominatim (OpenStreetMap Fallback)
function parseNominatimData(data, fallbackLat, fallbackLng) {
  if (!data) return null;
  const address = data.address || {};
  
  const rua = address.road || address.pedestrian || address.street || address.footway || address.avenue || address.square || '';
  const numero = address.house_number || address.street_number || '';
  const bairro = address.suburb || address.neighbourhood || address.city_district || address.residential || address.quarter || (data.display_name ? data.display_name.split(',')[0].trim() : '');
  const cidade = address.city || address.town || address.village || address.municipality || address.county || 'Juiz de Fora';
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
    fullAddress: data.display_name || [rua, numero, bairro, cidade].filter(Boolean).join(', ')
  };
}

export default function AddressMapPicker({
  value = {},
  onChange,
  placeholder = "Digite o nome do buffet, sítio, chácara, rua ou bairro..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

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
  const debounceTimerRef = useRef(null);

  // Sincroniza dados com valor externo
  useEffect(() => {
    setTempLocation({
      rua: value.rua || '',
      numero: value.numero || '',
      bairro: value.bairro || '',
      cidade: value.cidade || '',
      lat: parseFloat(value.lat) || -21.7642,
      lng: parseFloat(value.lng) || -43.3503,
      fullAddress: value.fullAddress || [value.rua, value.numero, value.bairro, value.cidade].filter(Boolean).join(', ')
    });
  }, [value.rua, value.numero, value.bairro, value.cidade, value.lat, value.lng, value.fullAddress]);

  // 1. Carregar Script do Google Maps SDK
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
      script.onerror = () => {
        console.warn("Google Maps SDK indisponível ou com restrição de domínio. Usando fallback.");
      };
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.maps) {
          setGoogleLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Geocodificação reversa
  const reverseGeocode = useCallback(async (lat, lng) => {
    // 1. Tentar via Google Geocoder
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const parsed = parseGooglePlace(results[0], lat, lng);
            if (parsed) {
              setTempLocation(parsed);
              setSearchQuery(parsed.fullAddress || `${parsed.bairro}, ${parsed.cidade}`);
              return;
            }
          }
        });
      } catch (err) {
        console.warn("Erro no Google Geocoder, tentando fallback:", err);
      }
    }

    // 2. Fallback via Nominatim
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

  // 2. Inicializar Mapa Google quando o modal abrir
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const currentLat = parseFloat(tempLocation.lat) || -21.7642;
    const currentLng = parseFloat(tempLocation.lng) || -43.3503;
    const centerCoords = { lat: currentLat, lng: currentLng };

    const initTimer = setTimeout(() => {
      if (window.google && window.google.maps && mapContainerRef.current) {
        if (!googleMapRef.current) {
          const map = new window.google.maps.Map(mapContainerRef.current, {
            center: centerCoords,
            zoom: tempLocation.rua ? 16 : 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            gestureHandling: 'greedy'
          });

          const marker = new window.google.maps.Marker({
            position: centerCoords,
            map: map,
            draggable: true,
            animation: window.google.maps.Animation.DROP,
            title: "Local do Evento"
          });

          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            const lat = pos.lat();
            const lng = pos.lng();
            reverseGeocode(lat, lng);
          });

          map.addListener('click', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            reverseGeocode(lat, lng);
          });

          googleMapRef.current = map;
          markerRef.current = marker;
        } else {
          googleMapRef.current.setCenter(centerCoords);
          googleMapRef.current.setZoom(tempLocation.rua ? 16 : 14);
          if (markerRef.current) {
            markerRef.current.setPosition(centerCoords);
          }
          window.google.maps.event.trigger(googleMapRef.current, 'resize');
        }
      }
    }, 150);

    return () => clearTimeout(initTimer);
  }, [isOpen, googleLoaded, reverseGeocode, tempLocation.lat, tempLocation.lng, tempLocation.rua]);

  // 3. Mecanismo de Busca Inteligente e Resiliente
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    const resultsList = [];
    const cleanQuery = query.trim();

    // Estratégia 1: Google Geocoder (Alta precisão para ruas, bairros e sítios)
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        await new Promise((resolve) => {
          const geocoder = new window.google.maps.Geocoder();
          // Busca com preferência para a região de Juiz de Fora e MG
          const queryWithContext = cleanQuery.toLowerCase().includes('juiz de fora') 
            ? cleanQuery 
            : `${cleanQuery}, Juiz de Fora, MG, Brasil`;

          geocoder.geocode(
            { 
              address: queryWithContext,
              componentRestrictions: { country: 'BR' }
            }, 
            (results, status) => {
              if (status === 'OK' && results && results.length > 0) {
                results.slice(0, 5).forEach(res => {
                  const parsed = parseGooglePlace(res, res.geometry.location.lat(), res.geometry.location.lng());
                  if (parsed) {
                    resultsList.push({
                      type: 'google_geocoder',
                      main_text: parsed.rua ? `${parsed.rua}${parsed.numero ? ', ' + parsed.numero : ''}` : res.formatted_address.split(',')[0],
                      secondary_text: [parsed.bairro, parsed.cidade].filter(Boolean).join(' • ') || res.formatted_address,
                      display_name: parsed.fullAddress,
                      data: parsed,
                      lat: parsed.lat,
                      lng: parsed.lng
                    });
                  }
                });
              }
              resolve();
            }
          );
        });
      } catch (err) {
        console.warn("Aviso no Google Geocoder:", err);
      }
    }

    // Estratégia 2: Google Places AutocompleteService (Para nomes comerciais e buffets)
    if (resultsList.length === 0 && window.google && window.google.maps && window.google.maps.places && window.google.maps.places.AutocompleteService) {
      try {
        await new Promise((resolve) => {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: cleanQuery,
              componentRestrictions: { country: 'br' }
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                predictions.slice(0, 5).forEach(p => {
                  resultsList.push({
                    type: 'google_place',
                    place_id: p.place_id,
                    main_text: p.structured_formatting?.main_text || p.description,
                    secondary_text: p.structured_formatting?.secondary_text || '',
                    display_name: p.description
                  });
                });
              }
              resolve();
            }
          );
        });
      } catch (err) {
        console.warn("Aviso no Google Places Service:", err);
      }
    }

    // Estratégia 3: OpenStreetMap Nominatim (Fallback garantido)
    if (resultsList.length === 0) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', Juiz de Fora, Brasil')}&addressdetails=1&limit=5&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
        if (res.ok) {
          const data = await res.json();
          (data || []).forEach(item => {
            const parsed = parseNominatimData(item, item.lat, item.lon);
            if (parsed) {
              resultsList.push({
                type: 'nominatim',
                main_text: parsed.rua || item.display_name.split(',')[0],
                secondary_text: [parsed.bairro, parsed.cidade].filter(Boolean).join(' • ') || item.display_name,
                display_name: parsed.fullAddress,
                data: parsed,
                lat: parsed.lat,
                lng: parsed.lng
              });
            }
          });
        }
      } catch (err) {
        console.warn("Aviso no fallback Nominatim:", err);
      }
    }

    setSuggestions(resultsList);
    setShowSuggestions(resultsList.length > 0);
    setIsSearching(false);
  }, []);

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 250);
  };

  // Executar busca ao pressionar Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      performSearch(searchQuery);
    }
  };

  // Ao selecionar uma sugestão da lista
  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);

    // Caso 1: Item do Google Geocoder ou Nominatim com dados prontos
    if (item.data) {
      const parsed = item.data;
      setTempLocation(parsed);
      setSearchQuery(parsed.fullAddress || item.display_name);

      if (googleMapRef.current) {
        googleMapRef.current.setCenter({ lat: parsed.lat, lng: parsed.lng });
        googleMapRef.current.setZoom(17);
      }
      if (markerRef.current) {
        markerRef.current.setPosition({ lat: parsed.lat, lng: parsed.lng });
      }
      return;
    }

    // Caso 2: Item do Google Places (necessita getDetails)
    if (item.type === 'google_place' && item.place_id && window.google && window.google.maps && googleMapRef.current) {
      try {
        const placesService = new window.google.maps.places.PlacesService(googleMapRef.current);
        placesService.getDetails(
          {
            placeId: item.place_id,
            fields: ['address_components', 'geometry', 'formatted_address', 'name']
          },
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const parsed = parseGooglePlace(place, lat, lng);

              if (parsed) {
                setTempLocation(parsed);
                setSearchQuery(parsed.fullAddress || place.name || item.display_name);

                if (googleMapRef.current) {
                  googleMapRef.current.setCenter({ lat, lng });
                  googleMapRef.current.setZoom(17);
                }
                if (markerRef.current) {
                  markerRef.current.setPosition({ lat, lng });
                }
              }
            }
          }
        );
      } catch (err) {
        console.warn("Erro ao buscar detalhes do Place:", err);
      }
    }
  };

  // Localização via GPS
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

        reverseGeocode(lat, lng);
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
    const initialAddress = value.fullAddress || [value.rua, value.numero, value.bairro, value.cidade].filter(Boolean).join(', ');
    setSearchQuery(initialAddress);
    setSuggestions([]);
    setShowSuggestions(false);
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
            <div style={{ padding: '14px 20px', background: '#111b15', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 5000 }}>
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
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
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
                  onClick={() => performSearch(searchQuery)}
                  style={{
                    background: 'var(--primary, #CBA153)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 16px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FiSearch size={14} />
                  <span>Buscar</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingGps}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '0 14px',
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
                  <span>{isLocatingGps ? 'GPS...' : 'Meu GPS'}</span>
                </button>
              </div>

              {/* Dropdown de Sugestões de Endereço (Google Places + Nominatim) */}
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
                  boxShadow: '0 16px 40px rgba(0,0,0,0.95)',
                  maxHeight: '260px',
                  overflowY: 'auto'
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
                      <FiMapPin style={{ color: '#FF9800', flexShrink: 0, fontSize: '1.1rem' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontWeight: 'bold', color: '#FFF' }}>
                          {item.main_text || item.display_name.split(',')[0]}
                        </span>
                        {item.secondary_text && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #aaa)', marginTop: '2px' }}>
                            {item.secondary_text}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Container do Google Map */}
            <div style={{ flex: 1, position: 'relative', width: '100%', background: '#e5e3df', zIndex: 1 }}>
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

              {/* Dica Flutuante na Base do Mapa */}
              {!showSuggestions && (
                <div style={{
                  position: 'absolute',
                  bottom: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(10, 18, 13, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(203, 161, 83, 0.4)',
                  fontSize: '0.75rem',
                  color: '#FFF',
                  fontWeight: '600',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
                }}>
                  📍 Toque no mapa ou arraste o pino para ajustar o ponto exato
                </div>
              )}
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
