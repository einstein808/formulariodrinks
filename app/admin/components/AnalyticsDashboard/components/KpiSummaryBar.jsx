import React from 'react';
import { formatCurrency } from '@/lib/utils';

const cardStyle = {
  background: 'var(--bg-input)',
  padding: '15px 16px',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  minWidth: 0,
};

function KpiCard({ label, value, detail, color = 'var(--text-primary)', accent = 'var(--primary)', help }) {
  return (
    <div style={{ ...cardStyle, borderTop: `3px solid ${accent}` }} title={help}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
        {label}
      </div>
      <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.45rem)', lineHeight: 1.2, fontWeight: 800, color, overflowWrap: 'anywhere' }}>
        {value}
      </div>
      {detail && <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.35 }}>{detail}</div>}
    </div>
  );
}

export default function KpiSummaryBar({
  totalLeads = 0,
  totalFechados = 0,
  totalPerdidos = 0,
  totalEmAberto = 0,
  possiveisDuplicados = 0,
  taxaConversao = 0,
  taxaFechamentoResolvidos = 0,
  totalFaturamento = 0,
  totalValorPago = 0,
  totalCustosGlobal = 0,
  totalLucroGlobal = 0,
  totalOportunidadeAberta = 0,
  margemGlobalMedia = 0,
  ticketMedio = 0,
  totalValorRestante = 0,
  contratosSemFinanceiro = 0,
  contratosSemCustos = 0,
  contratosComDivergenciaPagamento = 0,
  totalValorAcimaDoContrato = 0,
}) {
  return (
    <section aria-label="Indicadores do negócio" style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10 }}>
        <KpiCard
          label="Leads no período"
          value={totalLeads}
          detail={`${totalEmAberto} em aberto · ${totalFechados} ganhos · ${totalPerdidos} perdidos`}
          accent="#00E5FF"
          help="Contagem baseada na data de entrada ou na data do evento selecionada."
        />
        <KpiCard
          label="Conversão do período"
          value={`${taxaConversao}%`}
          detail={`${taxaFechamentoResolvidos}% dos leads resolvidos foram ganhos`}
          color="#4CAF50"
          accent="#4CAF50"
          help="Conversão = ganhos ÷ todos os leads. Taxa de ganhos resolvidos = ganhos ÷ (ganhos + perdidos)."
        />
        <KpiCard
          label="Oportunidade aberta"
          value={formatCurrency(totalOportunidadeAberta)}
          detail="Orçamentos em novo ou negociação"
          color="#FFD54F"
          accent="#FFD54F"
          help="Soma estimada dos orçamentos em aberto; não é faturamento contratado."
        />
        <KpiCard
          label="Receita contratada"
          value={formatCurrency(totalFaturamento)}
          detail={`${formatCurrency(totalValorPago)} recebidos · ${formatCurrency(totalValorRestante)} a receber`}
          color="#4CAF50"
          accent="#4CAF50"
          help="Receita líquida dos eventos com status fechado ou realizado e dados financeiros cadastrados."
        />
        <KpiCard
          label="Custos registrados"
          value={formatCurrency(totalCustosGlobal)}
          detail="Custos associados a contratos ganhos"
          color="#FF7043"
          accent="#FF7043"
        />
        <KpiCard
          label="Lucro estimado"
          value={formatCurrency(totalLucroGlobal)}
          detail={`${margemGlobalMedia.toFixed(1)}% de margem sobre a receita contratada`}
          color={totalLucroGlobal >= 0 ? 'var(--primary)' : '#F44336'}
          accent="var(--primary)"
          help="Receita contratada menos os custos lançados. Contratos sem custos podem inflar a margem."
        />
        <KpiCard
          label="Ticket médio ganho"
          value={formatCurrency(ticketMedio)}
          detail="Somente contratos com faturamento lançado"
          accent="#9C27B0"
        />
      </div>
      <p style={{ margin: '8px 2px 0', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
        A conversão usa todos os status da coorte. O filtro de status recorta gráficos e financeiro; conversão, parceiros e teste A/B usam o período completo.
      </p>

      {(contratosSemFinanceiro > 0 || contratosSemCustos > 0 || contratosComDivergenciaPagamento > 0 || possiveisDuplicados > 0) && (
        <div role="status" style={{ marginTop: 10, padding: '10px 14px', color: '#FFD54F', background: 'rgba(255, 213, 79, 0.08)', border: '1px solid rgba(255, 213, 79, 0.2)', borderRadius: 9, fontSize: '0.78rem', lineHeight: 1.45 }}>
          {(contratosSemFinanceiro > 0 || contratosSemCustos > 0) && (
            <>Dados a completar: {contratosSemFinanceiro > 0 && <strong>{contratosSemFinanceiro} sem faturamento/financeiro</strong>}
              {contratosSemFinanceiro > 0 && contratosSemCustos > 0 ? ' · ' : ''}
              {contratosSemCustos > 0 && <strong>{contratosSemCustos} sem custos lançados</strong>}. </>
          )}
          {contratosComDivergenciaPagamento > 0 && (
            <> <strong>{contratosComDivergenciaPagamento} com valor recebido acima do contratado</strong> ({formatCurrency(totalValorAcimaDoContrato)} para reconciliar).</>
          )}
          {possiveisDuplicados > 0 && (
            <> <strong>{possiveisDuplicados} possíveis duplicidades</strong> (mesmo telefone e data do evento; confira antes de consolidar os resultados).</>
          )}
          {contratosSemCustos > 0 && ' O lucro pode estar acima do real enquanto faltarem custos.'}
        </div>
      )}
    </section>
  );
}
