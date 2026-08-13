import React, { useEffect, useRef, useState } from 'react';

const KNOWN_COORDINATES = {
  'santos': [-23.9608, -46.3339],
  'são vicente': [-23.9631, -46.3919],
  'sao vicente': [-23.9631, -46.3919],
  'guarujá': [-23.9931, -46.2564],
  'guaruja': [-23.9931, -46.2564],
  'praia grande': [-24.0058, -46.4028],
  'cubatão': [-23.8950, -46.4253],
  'cubatao': [-23.8950, -46.4253],
  'bertioga': [-23.8540, -46.1387],
  'itanhaém': [-24.1831, -46.7889],
  'itanhaem': [-24.1831, -46.7889],
  'peruíbe': [-24.3200, -46.9986],
  'peruibe': [-24.3200, -46.9986],
  'são paulo': [-23.5505, -46.6333],
  'sao paulo': [-23.5505, -46.6333],
  'sp': [-23.5505, -46.6333],
  'santo andré': [-23.6639, -46.5383],
  'santo andre': [-23.6639, -46.5383],
  'são bernardo do campo': [-23.6944, -46.5653],
  'sao bernardo': [-23.6944, -46.5653],
  'são caetano do sul': [-23.6225, -46.5547],
  'sao caetano': [-23.6225, -46.5547],
  'osasco': [-23.5325, -46.7917],
  'campinas': [-22.9099, -47.0626],
  'sorocaba': [-23.5015, -47.4526],
  'jundiaí': [-23.1857, -46.8892],
  'jundiai': [-23.1857, -46.8892],
  'taubaté': [-23.0264, -45.5558],
  'taubate': [-23.0264, -45.5558],
  'são josé dos campos': [-23.1896, -45.8841],
  'sao jose dos campos': [-23.1896, -45.8841],
  'mongaguá': [-24.0928, -46.6206],
  'mongagua': [-24.0928, -46.6206]
};

export default function EventsMapHeatmap({ leads = [] }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [regionStats, setRegionStats] = useState([]);

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

  // 2. Processar Leads para agrupamento geográfico
  useEffect(() => {
    if (!leads || leads.length === 0) {
      setRegionStats([]);
      return;
    }

    const groups = {};

    leads.forEach((lead) => {
      const cidadeRaw = (lead.cidade || lead.city || 'Outra Região').trim();
      const key = cidadeRaw.toLowerCase();

      if (!groups[key]) {
        groups[key] = {
          name: cidadeRaw,
          key: key,
          count: 0,
          fechadosCount: 0,
          faturamento: 0,
          convidados: 0,
          leads: []
        };
      }

      groups[key].count += 1;
      groups[key].leads.push(lead);

      const isFechado = lead.status === 'fechado' || lead.status === 'realizado';
      if (isFechado) groups[key].fechadosCount += 1;

      const fat = parseFloat(lead.financeiro?.faturamento) || 0;
      groups[key].faturamento += fat;

      const conv = parseInt(lead.convidados || lead.numConvidados || 0, 10);
      groups[key].convidados += conv;
    });

    const arr = Object.values(groups);
    const maxCount = Math.max(...arr.map((g) => g.count), 1);

    arr.forEach((g) => {
      g.ratio = g.count / maxCount;
      g.ticketMedio = g.count > 0 ? g.faturamento / g.count : 0;
    });

    arr.sort((a, b) => b.count - a.count);
    setRegionStats(arr);
  }, [leads]);

  // 3. Renderizar e Atualizar o Mapa Leaflet
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    // Inicializar mapa se ainda não existir
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-23.9608, -46.3339],
        zoom: 10,
        zoomControl: true
      });

      // Layer Escuro CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Limpar marcadores anteriores
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (regionStats.length === 0) return;

    const bounds = [];

    regionStats.forEach((stat) => {
      const coords = KNOWN_COORDINATES[stat.key];
      if (!coords) return;

      bounds.push(coords);

      let heatColor = '#00E5FF'; // Azul/Ciano (Baixa)
      let strokeColor = '#00E5FF';

      if (stat.ratio >= 0.75) {
        heatColor = '#FF3D00'; // Vermelho Fogo (Máxima)
        strokeColor = '#FF6D00';
      } else if (stat.ratio >= 0.4) {
        heatColor = '#FF9800'; // Laranja Quente (Alta)
        strokeColor = '#FFA726';
      } else if (stat.ratio >= 0.2) {
        heatColor = '#FFD54F'; // Amarelo (Média)
        strokeColor = '#FFEE58';
      }

      const radius = Math.max(16, Math.min(45, stat.count * 8));

      const circle = L.circleMarker(coords, {
        radius: radius,
        fillColor: heatColor,
        color: strokeColor,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.55
      }).addTo(map);

      L.circleMarker(coords, {
        radius: radius + 10,
        fillColor: heatColor,
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.15
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; color: #fff; padding: 4px; min-width: 190px;">
          <div style="font-size: 1.1rem; font-weight: bold; color: ${heatColor}; margin-bottom: 6px;">
            📍 ${stat.name}
          </div>
          <div style="font-size: 0.85rem; color: #ddd; margin-bottom: 4px;">
            🎉 <strong>${stat.count} evento(s)</strong> (${stat.fechadosCount} confirmados)
          </div>
          <div style="font-size: 0.85rem; color: #4CAF50; margin-bottom: 4px;">
            💰 <strong>Faturamento:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.faturamento)}
          </div>
          <div style="font-size: 0.8rem; color: #aaa;">
            📊 <strong>Ticket Médio:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.ticketMedio)}
          </div>
          <div style="font-size: 0.78rem; color: #888; margin-top: 4px;">
            👥 <strong>${stat.convidados}</strong> convidados totais
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [mapLoaded, regionStats]);

  const topRegion = regionStats[0];

  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔥 Mapa de Calor Geográfico dos Eventos
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Visualize a densidade em tempo real das festas por região e cidade.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Densidade:</span>
          <span style={{ fontSize: '0.75rem', color: '#FF3D00', fontWeight: 'bold' }}>🔴 Pico 🔥</span>
          <span style={{ fontSize: '0.75rem', color: '#FF9800', fontWeight: 'bold' }}>🟠 Alta</span>
          <span style={{ fontSize: '0.75rem', color: '#FFD54F', fontWeight: 'bold' }}>🟡 Média</span>
          <span style={{ fontSize: '0.75rem', color: '#00E5FF', fontWeight: 'bold' }}>🔵 Inicial</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0a0d0b' }} />

        {!mapLoaded && (
          <div style={{ position: 'absolute', inset: 0, background: '#0a0d0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.9rem' }}>
            ⏳ Carregando mapa interativo...
          </div>
        )}
      </div>

      {topRegion && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(255, 61, 0, 0.08)', border: '1px solid rgba(255, 61, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: '#FF6D00', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏆 Região Líder em Festas
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
              📍 {topRegion.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <strong>{topRegion.count} evento(s)</strong> · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(topRegion.faturamento)}
            </div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.25)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: '#00E5FF', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📊 Total de Regiões Atendidas
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
              {regionStats.length} Cidades / Regiões
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Concentração média: {(topRegion.ratio * 100).toFixed(0)}% da demanda na região central
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
