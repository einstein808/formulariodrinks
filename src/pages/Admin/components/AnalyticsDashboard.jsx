import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../firebase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const COLORS = ['#00E5FF', '#FFD54F', '#4CAF50', '#F44336', '#9C27B0', '#FF9800'];

export default function AnalyticsDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribe = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLeads(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setLeads([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  // --- Processar Dados: Gráfico de Pizza (Pacotes) ---
  const pacotesCount = {};
  leads.forEach(lead => {
    const pacote = lead.pacote || 'Não informado';
    pacotesCount[pacote] = (pacotesCount[pacote] || 0) + 1;
  });
  
  const pieData = Object.keys(pacotesCount).map(key => ({
    name: key,
    value: pacotesCount[key]
  })).sort((a, b) => b.value - a.value);

  // --- Processar Dados: Gráfico de Barras (Sazonalidade - Fechados) ---
  const mesesCount = {};
  leads.forEach(lead => {
    if (lead.status === 'fechado' && lead.dataEvento) {
      const [ano, mes] = lead.dataEvento.split('-');
      const mesFormatado = `${mes}/${ano}`;
      mesesCount[mesFormatado] = (mesesCount[mesFormatado] || 0) + 1;
    }
  });

  const barData = Object.keys(mesesCount).map(key => ({
    name: key,
    Eventos: mesesCount[key]
  })).sort((a, b) => {
    const [mesA, anoA] = a.name.split('/');
    const [mesB, anoB] = b.name.split('/');
    return new Date(`${anoA}-${mesA}-01`) - new Date(`${anoB}-${mesB}-01`);
  });

  // --- Processar Dados: Gráfico de Linha (Captação de Leads) ---
  const captacaoCount = {};
  leads.forEach(lead => {
    if (lead.criadoEm) {
      const date = new Date(lead.criadoEm);
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      const mesFormatado = `${mes}/${ano}`;
      captacaoCount[mesFormatado] = (captacaoCount[mesFormatado] || 0) + 1;
    }
  });

  const lineData = Object.keys(captacaoCount).map(key => ({
    name: key,
    Leads: captacaoCount[key]
  })).sort((a, b) => {
    const [mesA, anoA] = a.name.split('/');
    const [mesB, anoB] = b.name.split('/');
    return new Date(`${anoA}-${mesA}-01`) - new Date(`${anoB}-${mesB}-01`);
  });

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Visualize a distribuição de pacotes e a sazonalidade de eventos fechados.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
        
        {/* Gráfico 1: Captação de Leads (Linha) */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Volume de Captação (Novos Orçamentos por Mês)</h3>
          {lineData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                  />
                  <Line type="monotone" dataKey="Leads" stroke="#00E5FF" strokeWidth={3} dot={{ r: 6, fill: '#00E5FF', stroke: '#111', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Nenhum orçamento captado ainda.
            </div>
          )}
        </div>

        {/* Gráfico 2: Pacotes mais vendidos */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Distribuição de Pacotes (Todos os Leads)</h3>
          {pieData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }} 
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado disponível.</div>
          )}
        </div>

        {/* Gráfico 3: Eventos por Mês */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Sazonalidade (Eventos Fechados por Mês)</h3>
          {barData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                    cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="Eventos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Nenhum evento fechado com data informada.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
