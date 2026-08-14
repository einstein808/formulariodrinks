import React, { useEffect, useRef, useState } from 'react';

// Cache global em memória de geocodificação
const GEO_CACHE = {};

// Dicionário expandido de coordenadas pré-calculadas de bairros e cidades
const PRESET_COORDS = {
  // Santos - Bairros Específicos
  'gonzaga, santos': [-23.9669, -46.3331],
  'boqueirao, santos': [-23.9658, -46.3242],
  'ponta da praia, santos': [-23.9856, -46.3056],
  'embare, santos': [-23.9711, -46.3150],
  'aparecida, santos': [-23.9744, -46.3117],
  'campo grande, santos': [-23.9542, -46.3422],
  'marape, santos': [-23.9575, -46.3467],
  'jose menino, santos': [-23.9689, -46.3489],
  'pompeia, santos': [-23.9664, -46.3428],
  'pompéia, santos': [-23.9664, -46.3428],
  'macuco, santos': [-23.9558, -46.3183],
  'encruzilhada, santos': [-23.9483, -46.3283],
  'vila belmiro, santos': [-23.9511, -46.3389],
  'bairro centro, santos': [-23.9350, -46.3289],

  // São Vicente - Bairros Específicos
  'gonzaguinha, sao vicente': [-23.9692, -46.3889],
  'itaparica, sao vicente': [-23.9650, -46.3789],
  'boa vista, sao vicente': [-23.9683, -46.3764],
  'bairro centro, sao vicente': [-23.9631, -46.3919],

  // Guarujá - Bairros Específicos
  'pitangueiras, guaruja': [-23.9931, -46.2564],
  'enseada, guaruja': [-23.9789, -46.2239],
  'asturias, guaruja': [-24.0003, -46.2658],
  'tombo, guaruja': [-24.0069, -46.2731],
  'pereque, guaruja': [-23.9369, -46.1750],

  // Praia Grande - Bairros Específicos
  'canto do forte, praia grande': [-24.0058, -46.4028],
  'boqueirao, praia grande': [-24.0089, -46.4139],
  'guilhermina, praia grande': [-24.0142, -46.4258],
  'aviacao, praia grande': [-24.0200, -46.4367],
  'tupi, praia grande': [-24.0264, -46.4497],
  'ocian, praia grande': [-24.0347, -46.4636],

  // Minas Gerais
  'grama, juiz de fora': [-21.7200, -43.3400],
  'bairro grama, juiz de fora': [-21.7200, -43.3400],
  'grama': [-21.7200, -43.3400],
  'manoel honorio, juiz de fora': [-21.7450, -43.3450],
  'benfica, juiz de fora': [-21.6850, -43.4250],
  'bandeirantes, juiz de fora': [-21.7350, -43.3550],
  'represa, juiz de fora': [-21.7850, -43.3950],
  'represa': [-21.7850, -43.3950],
  'sao pedro, juiz de fora': [-21.7750, -43.3850],
  'sao mateus, juiz de fora': [-21.7750, -43.3550],
  'granbery, juiz de fora': [-21.7680, -43.3440],
  'condominio refugio do sol, juiz de fora': [-21.7800, -43.3700],
  'refugio do sol, juiz de fora': [-21.7800, -43.3700],
  'refugio do sol': [-21.7800, -43.3700],
  'juiz de fora': [-21.7642, -43.3503],
  'santos dumont': [-21.4567, -43.5525],
  'belo horizonte': [-19.9167, -43.9345],

  // Cidades Base (Centro da cidade apenas quando a cidade em si for o termo)
  'santos': [-23.9608, -46.3339],
  'sao vicente': [-23.9631, -46.3919],
  'guaruja': [-23.9931, -46.2564],
  'praia grande': [-24.0058, -46.4028],
  'cubatao': [-23.8950, -46.4253],
  'bertioga': [-23.8540, -46.1387],
  'itanhaem': [-24.1831, -46.7889],
  'peruibe': [-24.3200, -46.9986],
  'mongagua': [-24.0928, -46.6206],
  'sao roque': [-23.5294, -47.1342],
  'sao paulo': [-23.5505, -46.6333],
  'campinas': [-22.9099, -47.0626],
  'sorocaba': [-23.5015, -47.4526]
};

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\/-]\s*sp$/gi, '')
    .replace(/[\/-]\s*mg$/gi, '')
    .replace(/,\s*sp$/gi, '')
    .replace(/,\s*mg$/gi, '')
    .trim();
};

// Encontra coordenadas no dicionário priorizando correspondência exata e chaves mais longas
// Gera pequenos desvios geográficos para evitar que bairros diferentes fiquem sobrepostos no mesmo ponto
const getOffsetCoordinates = (baseCoords, index) => {
  if (!baseCoords) return null;
  if (index === 0) return baseCoords;
  const angle = (index * 137.5) * (Math.PI / 180);
  const distance = 0.005 * Math.sqrt(index); // ~400 a 800 metros de dispersão visual
  const lat = baseCoords[0] + (distance * 0.7) * Math.cos(angle);
  const lng = baseCoords[1] + distance * Math.sin(angle);
  return [lat, lng];
};

// Extrai informações completas de bairro e cidade de qualquer lead (suporta lead.bairro, lead.cidade, lead.local, lead.endereco, lead.rua)
const extractLeadLocationInfo = (lead) => {
  let bairro = (lead.bairro || lead.neighborhood || '').trim();
  let cidade = (lead.cidade || lead.city || '').trim();
  let local = (lead.local || lead.endereco || lead.rua || '').trim();

  if (local && local.includes(',')) {
    const parts = local.split(',');
    if (!bairro) bairro = parts[0].trim();
    if (!cidade && parts[1]) cidade = parts[1].trim();
  }

  if (!bairro && !cidade && local) {
    bairro = local;
  }

  if (bairro && !cidade) {
    const bLower = bairro.toLowerCase();
    if (bLower.includes('juiz de fora') || bLower.includes('represa') || bLower.includes('grama') || bLower.includes('santos dumont')) {
      cidade = 'Juiz de Fora';
    } else if (bLower.includes('santos') || bLower.includes('gonzaga') || bLower.includes('boqueirao') || bLower.includes('embare')) {
      cidade = 'Santos';
    }
  }

  return { bairro, cidade, local };
};

const findCoordinatesFromPresets = (normKey) => {
  if (!normKey) return null;

  // 1. Correspondência Exata
  if (PRESET_COORDS[normKey]) return PRESET_COORDS[normKey];

  // 2. Correspondência por Substring (A chave normKey do lead deve conter a chave predefinida k)
  // Ordenar chaves da mais longa para a mais curta (ex: 'gonzaga, santos' antes de 'santos')
  const sortedKeys = Object.keys(PRESET_COORDS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (normKey.includes(k)) {
      return PRESET_COORDS[k];
    }
  }
  return null;
};

export default function EventsMapHeatmap({ leads = [] }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geocodedLocations, setGeocodedLocations] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'fechados'
  const [groupByMode, setGroupByMode] = useState('bairros'); // 'bairros' | 'cidades'

  // 1. Carregar Leaflet CSS & JS dinamicamente
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

  // 2. Processar Bairros & Cidades com Busca Corrigida sem Falsos Centros
  useEffect(() => {
    if (!leads || leads.length === 0) {
      setGeocodedLocations([]);
      return;
    }

    let isSubscribed = true;
    setIsGeocoding(true);

    const processLeads = async () => {
      const activeLeads = leads.filter((lead) => {
        if (activeFilter === 'fechados') {
          return lead.status === 'fechado' || lead.status === 'realizado';
        }
        return true;
      });

      const groups = {};

      activeLeads.forEach((lead) => {
        const { bairro: rawBairro, cidade: rawCidade } = extractLeadLocationInfo(lead);

        let displayTitle = '';
        let normKey = '';
        let searchQuery = '';

        if (groupByMode === 'bairros') {
          if (rawBairro && rawCidade) {
            displayTitle = `${rawBairro}, ${rawCidade}`;
            normKey = normalizeText(`${rawBairro}, ${rawCidade}`);
            searchQuery = `${rawBairro}, ${rawCidade}, Brasil`;
          } else if (rawBairro) {
            displayTitle = rawBairro;
            normKey = normalizeText(rawBairro);
            searchQuery = `${rawBairro}, Brasil`;
          } else if (rawCidade) {
            displayTitle = rawCidade;
            normKey = normalizeText(rawCidade);
            searchQuery = `${rawCidade}, Brasil`;
          } else {
            return;
          }
        } else {
          if (!rawCidade) return;
          displayTitle = rawCidade;
          normKey = normalizeText(rawCidade);
          searchQuery = `${rawCidade}, Brasil`;
        }

        if (!groups[normKey]) {
          groups[normKey] = {
            rawName: displayTitle,
            bairro: rawBairro,
            cidade: rawCidade,
            normKey: normKey,
            searchQuery: searchQuery,
            count: 0,
            fechadosCount: 0,
            faturamento: 0,
            convidados: 0,
            coords: null,
            leads: []
          };
        }

        groups[normKey].count += 1;
        groups[normKey].leads.push(lead);

        if (lead.status === 'fechado' || lead.status === 'realizado') {
          groups[normKey].fechadosCount += 1;
        }

        groups[normKey].faturamento += parseFloat(lead.financeiro?.faturamento) || 0;
        groups[normKey].convidados += parseInt(lead.convidados || lead.numConvidados || 0, 10);
      });

      const locationList = Object.values(groups);

      for (const loc of locationList) {
        // 1. Tentar encontrar nos presets conhecidos por correspondência exata ou parcial correta
        const presetCoords = findCoordinatesFromPresets(loc.normKey);
        if (presetCoords) {
          loc.coords = presetCoords;
          continue;
        }

        // 2. Tentar encontrar no Cache de sessão
        if (GEO_CACHE[loc.normKey]) {
          loc.coords = GEO_CACHE[loc.normKey];
          continue;
        }

        // 3. Tentar busca na API com timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc.searchQuery)}&limit=1`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          }).catch(() => null);

          clearTimeout(timeoutId);

          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
              const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              GEO_CACHE[loc.normKey] = coords;
              loc.coords = coords;
              continue;
            }
          }
        } catch (_) {
          // Ignora silenciosamente
        }

        // 4. Fallback de busca pela cidade caso a busca específica do bairro não tenha retornado dados de GPS
        if (loc.cidade) {
          const cityCoords = findCoordinatesFromPresets(normalizeText(loc.cidade));
          if (cityCoords) {
            loc.coords = cityCoords;
          }
        }

        await new Promise((r) => setTimeout(r, 120));
      }

      if (!isSubscribed) return;

      const validLocations = locationList.filter((loc) => loc.coords !== null);

      const maxCount = Math.max(...validLocations.map((l) => l.count), 1);
      validLocations.forEach((l) => {
        l.ratio = l.count / maxCount;
        l.percentage = (l.count / activeLeads.length) * 100;
        l.ticketMedio = l.count > 0 ? l.faturamento / l.count : 0;
      });

      validLocations.sort((a, b) => b.count - a.count);

      setGeocodedLocations(validLocations);
      setIsGeocoding(false);
    };

    processLeads();

    return () => {
      isSubscribed = false;
    };
  }, [leads, activeFilter, groupByMode]);

  // 3. Desenhar Marcadores e Calor no Mapa Leaflet
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!leafletMapRef.current) {
      // Definir centro inicial dinâmico (priorizar cidade/bairro com mais clientes ou Juiz de Fora)
      const initialCenter = (geocodedLocations.length > 0 && geocodedLocations[0].coords)
        ? geocodedLocations[0].coords
        : [-21.7642, -43.3503];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    if (geocodedLocations.length === 0) return;

    const bounds = [];

    // Mapa de contagem por coordenada base para espalhar bairros da mesma cidade
    const baseCoordsCounts = {};

    geocodedLocations.forEach((loc) => {
      if (!loc.coords) return;

      const baseKey = loc.coords.join(',');
      const countIndex = baseCoordsCounts[baseKey] || 0;
      baseCoordsCounts[baseKey] = countIndex + 1;

      // Se for agrupamento por bairros e houver múltiplos bairros na mesma cidade, aplica micro-deslocamento visual
      const finalCoords = (groupByMode === 'bairros' && countIndex > 0) 
        ? getOffsetCoordinates(loc.coords, countIndex) 
        : loc.coords;

      bounds.push(finalCoords);
      loc.activeCoords = finalCoords;

      let heatColor = '#00E5FF';
      let labelText = 'Inicial';

      if (loc.ratio >= 0.7) {
        heatColor = '#FF3D00';
        labelText = 'Pico de Festas 🔥';
      } else if (loc.ratio >= 0.35) {
        heatColor = '#FF9800';
        labelText = 'Alta Densidade';
      } else if (loc.ratio >= 0.15) {
        heatColor = '#FFD54F';
        labelText = 'Média Densidade';
      }

      const displayCoords = loc.activeCoords || loc.coords;
      const glowRadius = Math.max(24, Math.min(70, loc.count * 12));
      L.circleMarker(displayCoords, {
        radius: glowRadius,
        fillColor: heatColor,
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.25
      }).addTo(map);

      const coreRadius = Math.max(12, Math.min(34, loc.count * 8));
      const circle = L.circleMarker(displayCoords, {
        radius: coreRadius,
        fillColor: heatColor,
        color: '#FFFFFF',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; color: #fff; padding: 4px; min-width: 190px;">
          <div style="font-size: 1.1rem; font-weight: bold; color: ${heatColor}; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>📍 ${loc.rawName}</span>
            <span style="font-size: 0.68rem; background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px;">${labelText}</span>
          </div>
          <div style="font-size: 0.85rem; color: #eee; margin-bottom: 4px;">
            🎉 <strong>${loc.count} festa(s)</strong> (${loc.fechadosCount} fechadas)
          </div>
          <div style="font-size: 0.85rem; color: #4CAF50; margin-bottom: 4px;">
            💰 <strong>Faturamento:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loc.faturamento)}
          </div>
          <div style="font-size: 0.8rem; color: #aaa; margin-bottom: 4px;">
            📊 <strong>Ticket Médio:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loc.ticketMedio)}
          </div>
          <div style="font-size: 0.78rem; color: #888;">
            👥 <strong>${loc.convidados}</strong> convidados totais
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
    });

    if (bounds.length > 0) {
      const topLoc = geocodedLocations[0];
      const topCoords = topLoc.activeCoords || topLoc.coords;

      // Focar aproximado (zoom fechado) na cidade/bairro principal com mais festas
      if (bounds.length === 1 || geocodedLocations.length === 1) {
        map.setView(topCoords, 13);
      } else {
        // Ajustar limites sem distanciar demais o zoom (máximo 13/14 para ver detalhes dos bairros)
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }
    }
  }, [mapLoaded, geocodedLocations]);

  const focusLocationOnMap = (coords) => {
    if (leafletMapRef.current && coords) {
      leafletMapRef.current.flyTo(coords, 14, { duration: 1.2 });
    }
  };

  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '24px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔥 Mapa de Calor por Bairros & Regiões
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Concentração de festas bairro a bairro informados pelos seus clientes.
          </p>
        </div>

        {/* Alternador Bairros / Cidades + Filtro Fechados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
            <button
              onClick={() => setGroupByMode('bairros')}
              style={{
                background: groupByMode === 'bairros' ? '#FF9800' : 'transparent',
                color: groupByMode === 'bairros' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              📍 Por Bairros
            </button>
            <button
              onClick={() => setGroupByMode('cidades')}
              style={{
                background: groupByMode === 'cidades' ? '#FF9800' : 'transparent',
                color: groupByMode === 'cidades' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              🌆 Por Cidades
            </button>
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setActiveFilter('todos')}
              style={{
                background: activeFilter === 'todos' ? 'var(--primary)' : 'transparent',
                color: activeFilter === 'todos' ? '#000' : 'var(--text-secondary)',
                border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Todos os Leads ({leads.length})
            </button>
            <button
              onClick={() => setActiveFilter('fechados')}
              style={{
                background: activeFilter === 'fechados' ? '#4CAF50' : 'transparent',
                color: activeFilter === 'fechados' ? '#fff' : 'var(--text-secondary)',
                border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Apenas Fechados
            </button>
          </div>
        </div>
      </div>

      {/* Container do Mapa */}
      <div style={{ position: 'relative', width: '100%', height: '440px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0a0d0b' }} />

        {(!mapLoaded || isGeocoding) && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.8)', color: '#FF9800', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 'bold', zIndex: 1000, border: '1px solid rgba(255,152,0,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            ⚡ Mapeando {groupByMode === 'bairros' ? 'bairros' : 'cidades'}...
          </div>
        )}
      </div>

      {/* Lista de Bairros Digitados pelos Clientes */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📍 {groupByMode === 'bairros' ? 'Bairros' : 'Cidades'} Identificados ({geocodedLocations.length} Locais)</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clique no card para voar até o local no mapa</span>
        </div>

        {geocodedLocations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            {geocodedLocations.map((loc) => {
              let badgeBg = 'rgba(0, 229, 255, 0.1)';
              let badgeBorder = 'rgba(0, 229, 255, 0.3)';
              let badgeColor = '#00E5FF';

              if (loc.ratio >= 0.7) {
                badgeBg = 'rgba(255, 61, 0, 0.15)';
                badgeBorder = 'rgba(255, 61, 0, 0.4)';
                badgeColor = '#FF3D00';
              } else if (loc.ratio >= 0.35) {
                badgeBg = 'rgba(255, 152, 0, 0.15)';
                badgeBorder = 'rgba(255, 152, 0, 0.4)';
                badgeColor = '#FF9800';
              } else if (loc.ratio >= 0.15) {
                badgeBg = 'rgba(255, 213, 79, 0.15)';
                badgeBorder = 'rgba(255, 213, 79, 0.4)';
                badgeColor = '#FFD54F';
              }

              return (
                <div
                  key={loc.normKey}
                  onClick={() => focusLocationOnMap(loc.activeCoords || loc.coords)}
                  style={{
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Clique para voar até este local no mapa"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {loc.rawName}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                      {loc.count} {loc.count === 1 ? 'festa' : 'festas'}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${Math.max(12, loc.percentage)}%`, height: '100%', background: badgeColor, borderRadius: '10px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Receita: <strong style={{ color: '#4CAF50' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loc.faturamento)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nenhum evento com bairro/cidade encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}
