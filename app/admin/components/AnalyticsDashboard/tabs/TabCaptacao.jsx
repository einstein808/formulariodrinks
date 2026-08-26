import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { COLORS } from '../hooks/useDashboardData';

export default function TabCaptacao({
  pieData = [],
  tipoEventoPieData = [],
  barData = [],
  lineData = []
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
      
      {/* ── GRÁFICOS DE PIZZA (PACOTES & TIPOS DE EVENTO) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Pacotes Mais Contratados */}
        <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            🍹 Pacotes Mais Contratados
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
            Distribuição de preferências dos clientes.
          </p>
          {pieData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="99%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(value) => [`${value} pedidos`, 'Total']}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum dado de pacotes.</div>
          )}
        </div>

        {/* Tipos de Evento */}
        <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            💍 Tipos de Evento
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
            Casamentos, 15 anos, corporativos e confraternizações.
          </p>
          {tipoEventoPieData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="99%" height={260}>
                <PieChart>
                  <Pie
                    data={tipoEventoPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tipoEventoPieData.map((entry, index) => (
                      <Cell key={`cell-tipo-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(value, name, item) => [`${value} eventos`, `${item.payload.emoji || ''} ${name}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum dado de tipos de evento.</div>
          )}
        </div>

      </div>

      {/* ── SAZONALIDADE & HISTÓRICO DE CAPTAÇÃO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Sazonalidade dos Eventos Fechados */}
        <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            📅 Calendário: Festas Fechadas por Mês
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
            Concentração dos eventos ao longo dos meses do ano.
          </p>
          {barData.length > 0 ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(value) => [`${value} eventos`, 'Fechados/Realizados']}
                  />
                  <Bar dataKey="Eventos" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum evento fechado com data no período.</div>
          )}
        </div>

        {/* Captação no Tempo */}
        <div style={{ background: 'var(--bg-input)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            📥 Ritmo de Entrada de Novos Leads
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
            Quantos novos orçamentos foram solicitados a cada mês.
          </p>
          {lineData.length > 0 ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="99%" height={240}>
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(value) => [`${value} leads`, 'Captação']}
                  />
                  <Line type="monotone" dataKey="Leads" stroke="#00E5FF" strokeWidth={2} dot={{ fill: '#00E5FF', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum lead com data de criação.</div>
          )}
        </div>

      </div>

    </div>
  );
}