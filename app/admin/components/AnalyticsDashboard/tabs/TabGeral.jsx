import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import EventsMapHeatmap from '../../EventsMapHeatmap';
import { normalizePackageName, normalizeEventType } from '../hooks/useDashboardData';

export default function TabGeral({ leads = [], pipelineData = [] }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Faixas de convidados
  const faixas = [
    { label: 'Até 50', min: 0, max: 50 },
    { label: '51-100', min: 51, max: 100 },
    { label: '101-150', min: 101, max: 150 },
    { label: '151-200', min: 151, max: 200 },
    { label: '201-300', min: 201, max: 300 },
    { label: '300+', min: 301, max: Infinity }
  ];

  const histData = faixas.map(f => ({
    name: f.label,
    Eventos: leads.filter(l => {
      const n = Number(l.convidados);
      return !isNaN(n) && n >= f.min && n <= f.max;
    }).length
  }));

  // Radar: Tipo de Evento × Pacote
  const pacotesUnicos = [...new Set(leads.map(l => normalizePackageName(l.pacote)).filter(Boolean))];
  const tiposUnicos = [...new Set(leads.map(l => normalizeEventType(l.tipoEvento)).filter(t => t && t !== 'Não informado'))].slice(0, 6);
  const radarData = tiposUnicos.map(tipo => {
    const entry = { tipo };
    pacotesUnicos.forEach(pac => {
      entry[pac] = leads.filter(l =>
        normalizeEventType(l.tipoEvento) === tipo &&
        normalizePackageName(l.pacote) === pac
      ).length;
    });
    return entry;
  });
  const RADAR_COLORS = ['#cba153', '#00E5FF', '#4CAF50', '#F44336', '#FF9800'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
      
      {/* ── FUNIL / PIPELINE DE LEADS ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
          ⚡ Funil do Pipeline de Leads
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 20px 0' }}>
          Distribuição atual de todos os contatos em cada estágio do funil.
        </p>

        {pipelineData.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            {pipelineData.map(st => (
              <div key={st.name} style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${st.color}33`,
                borderLeft: `4px solid ${st.color}`,
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{st.name}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: st.color }}>{st.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum dado de pipeline.</div>
        )}
      </div>

      {/* ── GRID DE GRÁFICOS GERAIS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Histograma de Convidados */}
        <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
            👥 Faixas de Convidados
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
            Volume de eventos por porte de festa.
          </p>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="99%" height={240}>
              <BarChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                  formatter={(value) => [`${value} eventos`, 'Quantidade']}
                />
                <Bar dataKey="Eventos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Tipo de Evento x Pacote */}
        {radarData.length > 0 && pacotesUnicos.length > 0 && (
          <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
              🎯 Tipo de Evento × Pacote
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
              Preferência de pacote por ocasião.
            </p>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="99%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="tipo" tick={{ fill: '#aaa', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#666', fontSize: 9 }} />
                  {pacotesUnicos.slice(0, 4).map((pac, i) => (
                    <Radar key={pac} name={pac} dataKey={pac} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* ── MAPA DE CALOR (LAZY / ON DEMAND) ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHeatmap ? '16px' : '0' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>📍 Mapa Geográfico de Eventos</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Concentração geográfica de festas e orçamentos.</p>
          </div>
          <button
            onClick={() => setShowHeatmap(v => !v)}
            style={{
              background: showHeatmap ? 'rgba(255,255,255,0.06)' : 'rgba(255,152,0,0.15)',
              border: `1px solid ${showHeatmap ? 'var(--border-color)' : '#FF9800'}`,
              color: showHeatmap ? 'var(--text-secondary)' : '#FF9800',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {showHeatmap ? '✕ Ocultar Mapa' : '🔥 Abrir Mapa de Calor'}
          </button>
        </div>

        {showHeatmap && (
          <div style={{ marginTop: '16px' }}>
            <EventsMapHeatmap leads={leads} />
          </div>
        )}
      </div>

    </div>
  );
}