import { NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { db } from '../../../lib/firebase';

const formatStaffQty = (count, singular, plural) => {
  if (count <= 0) return '';
  const numberWords = {
    1: '01 (um)',
    2: '02 (dois)',
    3: '03 (três)',
    4: '04 (quatro)',
    5: '05 (cinco)',
    6: '06 (seis)',
    7: '07 (sete)',
    8: '08 (oito)',
    9: '09 (nove)',
    10: '10 (dez)'
  };
  const word = numberWords[count] || String(count).padStart(2, '0');
  return `${word} ${count === 1 ? singular : plural}`;
};

const getMaoDeObraTemplate = (data) => {
  const numBarmans = parseInt(data.barmans || 1, 10);
  const numAjudantes = parseInt(data.ajudantes || 0, 10);
  const isAjudante = numAjudantes > 0;
  const servicoText = isAjudante ? "Contrato de Prestação de Serviços de Barman – Mão de Obra + Ajudante" : "Contrato de Prestação de Serviços de Barman – Mão de Obra";
  const ajudanteObjeto = isAjudante ? `com ${numAjudantes === 1 ? 'ajudante' : `${numAjudantes} ajudantes`}` : "";
  const barmansLi = `<li>${formatStaffQty(numBarmans, 'barman', 'barmans')};</li>`;
  const ajudanteLi = isAjudante ? `<li>${formatStaffQty(numAjudantes, 'ajudante', 'ajudantes')};</li>` : "";
  
  const rateBarman = parseFloat(data.valor_hora_extra_barman || 70);
  const rateAjudante = parseFloat(data.valor_hora_extra_ajudante || 40);
  const totalBarmanHE = (numBarmans * rateBarman).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalAjudanteHE = (numAjudantes * rateAjudante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const barmansHoraExtra = `<li><strong>Barman:</strong> ${numBarmans} × R$ ${data.valor_hora_extra_barman_formatado || '70,00'}/h = R$ ${totalBarmanHE} por hora extra.</li>`;
  const ajudanteHoraExtra = isAjudante ? `<li><strong>Ajudante:</strong> ${numAjudantes} × R$ ${data.valor_hora_extra_ajudante_formatado || '40,00'}/h = R$ ${totalAjudanteHE} por hora extra.</li>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${servicoText}</title>
    <style>
        :root {
            --text: #1f2937;
            --muted: #6b7280;
            --title: #111827;
            --border: #d1d5db;
            --soft: #f9fafb;
            --bg: #ffffff;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 24px;
            background: #f3f4f6;
            font-family: Arial, Helvetica, sans-serif;
            color: var(--text);
            line-height: 1.6;
            font-size: 13.5px;
        }
        .page {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg);
            padding: 48px 56px;
            border-radius: 12px;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
        }
        h1 {
            margin: 0 0 24px;
            text-align: center;
            font-size: 22px;
            color: var(--title);
            text-transform: uppercase;
            line-height: 1.3;
        }
        h2 {
            font-size: 15px;
            margin: 28px 0 10px;
            color: var(--title);
            text-transform: uppercase;
            border-bottom: 1px solid var(--border);
            padding-bottom: 6px;
        }
        p { margin: 8px 0; text-align: justify; }
        .partes {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            margin-bottom: 24px;
        }
        .box {
            background: var(--soft);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px 16px;
        }
        .box strong { display: inline-block; min-width: 60px; }
        ul { margin: 8px 0 8px 22px; padding: 0; }
        li { margin: 4px 0; }
        .clausula { margin-bottom: 10px; }
        .assinaturas { margin-top: 48px; }
        .assinaturas-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 56px;
        }
        .assinatura { text-align: center; }
        .linha-assinatura { border-top: 1px solid #000; margin-bottom: 8px; height: 1px; width: 100%; }
        .rodape-data { margin-top: 28px; }
        .highlight { font-weight: bold; color: var(--title); }
        
        @media print {
            body { background: #fff; padding: 0; }
            .page { max-width: 100%; border-radius: 0; box-shadow: none; padding: 24px 32px; }
            .assinaturas { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="page">
        <h1>${servicoText}</h1>

        <div class="partes">
            <div class="box">
                <p><strong>CONTRATANTE:</strong></p>
                <p><strong>Nome:</strong> ${data.nome || ''}</p>
                <p><strong>CPF:</strong> ${data.cpf || ''}</p>
            </div>
            <div class="box">
                <p><strong>CONTRATADO:</strong></p>
                <p><strong>Nome:</strong> Gabryel Einstein de Carvalho Amaro</p>
                <p><strong>CPF:</strong> 144.612.766-43</p>
            </div>
        </div>

        <h2>Cláusula 1 – Objeto</h2>
        <p class="clausula">
            <span class="highlight">1.1</span> O presente contrato tem por objeto a prestação de serviços de barman ${ajudanteObjeto}, a serem realizados no dia <strong>${data.data_formatada || ''}</strong>, no horário das <strong>${data.horario_evento || ''}</strong>, no endereço <strong>Rua ${data.rua || ''}, ${data.numero || ''}, Bairro ${data.bairro || ''}, ${data.cidade || ''}</strong>.
        </p>
        <p class="clausula">
            <span class="highlight">1.2</span> A duração total do serviço será de <strong>${data.duracao || ''} horas</strong>.
        </p>
        <p class="clausula">
            <span class="highlight">1.3</span> Estão incluídos neste contrato:
        </p>
        <ul>
            ${barmansLi}
            ${ajudanteLi}
            <li>deslocamento;</li>
            <li>acessórios de bar;</li>
            <li>espuma de gengibre.</li>
            ${data.coposDeVidro ? `<li>fornecimento de copos de vidro adicional (5 por convidado).</li>` : ''}
        </ul>
        <p class="clausula">
            <span class="highlight">1.4</span> Não estão incluídos: bebidas, frutas, gelo ou quaisquer outros insumos, os quais serão de inteira responsabilidade do CONTRATANTE.
        </p>

        <h2>Cláusula 2 – Valor e Forma de Pagamento</h2>
        <p class="clausula">
            <span class="highlight">2.1</span> O valor total deste contrato é de <strong>${data.valor_total_formatado || ''}</strong>${data.desconto && parseFloat(data.desconto) > 0 ? ` (sendo o valor original de R$ ${data.valor_original_formatado || ''} com R$ ${data.desconto_formatado || ''} de desconto concedido)` : ''}.
        </p>
        <p class="clausula">
            <span class="highlight">2.2</span> O pagamento será realizado da seguinte forma:
        </p>
        <ul>
            <li>50% (${data.valor_entrada_formatado || "R$ 0,00"}) no ato da assinatura deste contrato;</li>
            <li>50% (${data.valor_final_formatado || "R$ 0,00"}) na chegada do CONTRATADO ao local do evento.</li>
        </ul>

        <h2>Cláusula 3 – Horas Extras</h2>
        <p class="clausula">
            <span class="highlight">3.1</span> Caso o CONTRATANTE solicite a permanência do CONTRATADO além do período inicialmente contratado, e havendo disponibilidade do profissional, poderão ser realizadas horas extras de atendimento.
        </p>
        <p class="clausula">
            <span class="highlight">3.2</span> O valor da hora extra é calculado com base no tamanho da equipe e valores de diária contratados, conforme a modalidade do serviço.
        </p>
        <p class="clausula">
            <span class="highlight">3.3</span> Os valores de hora extra ficam definidos da seguinte forma:
        </p>
        <ul>
            ${barmansHoraExtra}
            ${ajudanteHoraExtra}
        </ul>
        <p class="clausula">
            <span class="highlight">3.4</span> A realização de hora extra dependerá exclusivamente da disponibilidade do CONTRATADO no momento do evento.
        </p>

        <h2>Cláusula 4 – Cancelamento</h2>
        <p class="clausula">
            <span class="highlight">4.1</span> Por parte do CONTRATANTE: será aplicada multa de 20% do valor total do contrato. Em caso de cancelamento com menos de 30 (trinta) dias da data do evento, os valores já pagos não serão reembolsados.
        </p>
        <p class="clausula">
            <span class="highlight">4.2</span> Por parte do CONTRATADO: somente em casos de força maior (doença ou acidente devidamente comprovados), com reembolso integral dos valores pagos.
        </p>

        <h2>Cláusula 5 – Responsabilidades</h2>
        <p class="clausula">
            <span class="highlight">5.1</span> O CONTRATADO não se responsabiliza por condutas inadequadas de convidados nem por consumo excessivo de bebidas alcoólicas.
        </p>
        <p class="clausula">
            <span class="highlight">5.2</span> É expressamente proibido o fornecimento de bebidas alcoólicas a menores de 18 anos, sendo a fiscalização de responsabilidade do CONTRATANTE.
        </p>

        ${data.autorizarimagem !== false ? `
        <h2>Cláusula 6 – Uso de Imagem e Proteção de Dados (LGPD)</h2>
        <p class="clausula">
            <span class="highlight">6.1</span> O CONTRATANTE AUTORIZA, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), de forma gratuita, irrevogável e por prazo indeterminado, o CONTRATADO a utilizar sua imagem captada em fotos e/ou vídeos realizados durante o evento, exclusivamente para fins de divulgação institucional, promocional e publicitária em redes sociais (como Instagram, Facebook, TikTok e similares), websites e materiais de marketing.
        </p>
        <p class="clausula">
            <span class="highlight">6.2</span> O CONTRATADO compromete-se a não utilizar a imagem de forma a atingir a honra, a moral ou a reputação do CONTRATANTE. A autorização é concedida a título gratuito, não gerando qualquer direito de indenização ou remuneração.
        </p>
        ` : `
        <h2>Cláusula 6 – Uso de Imagem e Proteção de Dados (LGPD)</h2>
        <p class="clausula">
            <span class="highlight">6.1</span> O CONTRATANTE DECLARA QUE NÃO AUTORIZA o uso de sua imagem ou de seus convidados para fins de divulgação institucional, promocional ou publicitária pelo CONTRATADO, devendo ser respeitada a sua privacidade em conformidade com as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
        `}

        <h2>Cláusula 7 – Foro</h2>
        <p class="clausula">
            <span class="highlight">7.1</span> Fica eleito o Foro da Comarca de Juiz de Fora/MG para dirimir eventuais conflitos oriundos deste contrato.
        </p>

        <p class="rodape-data">
            Juiz de Fora/MG, ${data.data_contrato_formatada || "____/____/________"}.
        </p>

        <div class="assinaturas">
            <div class="assinaturas-grid">
                <div class="assinatura">
                    <div class="linha-assinatura"></div>
                    <p><strong>CONTRATANTE</strong></p>
                    <p>${data.nome || ''}</p>
                </div>
                <div class="assinatura">
                    <div class="linha-assinatura"></div>
                    <p><strong>CONTRATADO</strong></p>
                    <p>Gabryel Einstein de Carvalho Amaro</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

const getStandardTemplate = (data) => {
  const numBarmans = parseInt(data.barmans || 1, 10);
  const numAjudantes = parseInt(data.ajudantes || 0, 10);
  const drinksAlcoolText = Array.isArray(data.drinks_alcool) ? data.drinks_alcool.join(', ') : (data.drinks_alcool || 'Não selecionado');
  const drinksSemAlcoolText = Array.isArray(data.drinks_sem_alcool) ? data.drinks_sem_alcool.join(', ') : (data.drinks_sem_alcool || 'Não selecionado');
  const drinksSofisticadosText = Array.isArray(data.drinks_sofisticados) ? data.drinks_sofisticados.join(', ') : (data.drinks_sofisticados || 'Não selecionado');
  const drinksFrozenText = Array.isArray(data.drinks_frozen) ? data.drinks_frozen.join(', ') : (data.drinks_frozen || 'Não selecionado');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato de Prestação de Serviços de Barman</title>
  <style>
    :root {
      --text: #1f2937;
      --muted: #6b7280;
      --border: #d1d5db;
      --title: #111827;
      --bg: #ffffff;
      --soft: #f9fafb;
      --accent: #111827;
      --accent-soft: #e5e7eb;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--text);
      line-height: 1.55;
      padding: 24px;
      font-size: 13.5px;
    }

    .page {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      background: var(--bg);
      padding: 42px 46px;
      border-radius: 14px;
      box-shadow: 0 12px 34px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }

    .header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 18px;
      margin-bottom: 26px;
    }

    .header h1 {
      text-align: center;
      font-size: 23px;
      margin: 0 0 8px;
      color: var(--title);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .header p {
      text-align: center;
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }

    .box {
      background: var(--soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 22px;
    }

    .box-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 22px;
    }

    .item {
      margin: 0;
    }

    .label {
      font-weight: bold;
      color: var(--title);
    }

    .intro {
      margin: 0 0 16px;
      text-align: justify;
    }

    .clausula {
      margin-top: 24px;
      page-break-inside: avoid;
    }

    .clausula h2 {
      font-size: 16px;
      margin: 0 0 12px;
      color: var(--title);
      text-transform: uppercase;
      border-left: 5px solid var(--accent);
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
    }

    .clausula p {
      margin: 0 0 10px;
      text-align: justify;
    }

    .resumo-financeiro {
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }

    .resumo-financeiro .topo {
      background: var(--accent);
      color: white;
      padding: 12px 16px;
      font-weight: bold;
      font-size: 14px;
    }

    .resumo-financeiro .corpo {
      padding: 14px 16px;
      background: #fcfcfd;
    }

    .resumo-financeiro table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    .resumo-financeiro td {
      padding: 8px 0;
      border-bottom: 1px solid #eceff3;
      vertical-align: top;
    }

    .resumo-financeiro tr:last-child td {
      border-bottom: none;
    }

    .valor-destaque {
      font-size: 20px;
      font-weight: bold;
      color: var(--title);
    }

    .assinaturas {
      margin-top: 42px;
      page-break-inside: avoid;
    }

    .assinaturas p {
      margin: 0 0 8px;
    }

    .assinatura-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 42px;
    }

    .assinatura-box {
      text-align: center;
      padding-top: 34px;
    }

    .linha {
      border-top: 1px solid #111827;
      margin-bottom: 8px;
    }

    .muted {
      color: var(--muted);
      font-size: 12.5px;
    }

    .small {
      font-size: 12px;
      color: var(--muted);
    }

    ul.clean {
      margin: 8px 0 0 18px;
      padding: 0;
    }

    ul.clean li {
      margin-bottom: 4px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .page {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: 100%;
        padding: 18mm 16mm;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>Contrato de Prestação de Serviços de Barman</h1>
      <p>Instrumento particular de prestação de serviços para evento</p>
    </div>

<div class="box">
  <div class="box-grid">

    <!-- COLUNA CONTRATANTE -->
    <div>
      <p class="item"><span class="label">CONTRATANTE</span></p>
      <p class="item"><span class="label">Nome:</span> ${data.nome || ''}</p>
      <p class="item"><span class="label">CPF:</span> ${data.cpf || ''}</p>
      <p class="item"><span class="label">Whatsapp:</span> ${data.whatsapp || ''}</p>

      <p class="item"><span class="label">Endereço:</span> Rua ${data.rua || ''}, nº ${data.numero || ''}</p>
      <p class="item"><span class="label">Bairro/Cidade:</span> ${data.bairro || ''} - ${data.cidade || ''}</p>
      <p class="item"><span class="label">Referência:</span> ${data.referencia || 'Não informado'}</p>

      <p class="item"><span class="label">Data do Evento:</span> ${data.data_formatada || ''}</p>
      <p class="item"><span class="label">Horário:</span> ${data.horario_evento || ''}</p>
    </div>

    <!-- COLUNA CONTRATADO -->
    <div>
      <p class="item"><span class="label">CONTRATADO</span></p>
      <p class="item"><span class="label">Nome:</span> Gabryel Einstein de Carvalho Amaro</p>
      <p class="item"><span class="label">CPF:</span> 144.612.766-43</p>
      <p class="item"><span class="label">Profissão:</span> Barman</p>
      <p class="item"><span class="label">Responsável pelo serviço de bar no evento.</span></p>
    </div>

  </div>
</div>
    <p class="intro">
      As partes acima identificadas têm entre si justo e contratado o presente instrumento particular de prestação de serviços de barman, que se regerá pelas cláusulas e condições abaixo.
    </p>

    <div class="clausula">
      <h2>Cláusula 1 – Objeto</h2>
      <p>
        1.1 O presente contrato tem como objeto a prestação de serviços de barman para evento a ser realizado em
        <strong>${data.data_formatada || ''}</strong>,
        no horário de <strong>${data.horario_evento || ''}</strong>,
        no endereço <strong>Rua ${data.rua || ''}, nº ${data.numero || ''}, bairro ${data.bairro || ''}, cidade ${data.cidade || ''}</strong>,
        com duração de <strong>${data.duracao || ''} horas</strong> de atendimento efetivo.
      </p>
      <p>
        1.2 O serviço contratado corresponde ao plano <strong>${data.Servico || ''}</strong>, contando com equipe de <strong>${formatStaffQty(numBarmans, 'barman', 'barmans')}</strong>${numAjudantes > 0 ? ` e <strong>${formatStaffQty(numAjudantes, 'ajudante', 'ajudantes')}</strong>` : ''}, incluindo mão de obra, insumos necessários para o preparo dos drinks, deslocamento e acessórios de bar, conforme a modalidade efetivamente contratada.
      </p>
      <p>
        1.3 O tipo de drinks selecionado para o evento é <strong>${data.tipodrink || ''}</strong>.
      </p>
      <p>
        1.4 Drinks alcoólicos selecionados:
        <strong>${drinksAlcoolText}</strong>.
      </p>
      <p>
        1.5 Drinks sem álcool selecionados:
        <strong>${drinksSemAlcoolText}</strong>.
      </p>
      <p>
        1.6 Drinks sofisticados selecionados:
        <strong>${drinksSofisticadosText}</strong>.
      </p>
      <p>
        1.7 Drinks frozen selecionados:
        <strong>${drinksFrozenText}</strong>.
      </p>
      <p>
        1.8 O pacote inclui os insumos necessários ao preparo dos drinks, tais como bebidas, frutas, gelo, xaropes e demais ingredientes, além da bancada de bar quando aplicável.
      </p>
      <p>
        1.9 Os insumos utilizados para o preparo dos drinks não permanecem com o CONTRATANTE ou convidados após o término do evento, sendo recolhidos pelo CONTRATADO, exceto perecíveis já abertos ou inutilizados.
      </p>
      <p>
        1.10 O transporte do CONTRATADO é de inteira responsabilidade do próprio CONTRATADO, não cabendo ao CONTRATANTE o custeio ou a disponibilização de meios de locomoção, salvo ajuste expresso em contrário.
      </p>
      ${data.coposDeVidro ? `
      <p>
        1.11 O presente contrato inclui o fornecimento adicional de copos de vidro para o evento (na proporção de 5 copos por convidado), conforme opção de contratação selecionada pelo CONTRATANTE.
      </p>
      ` : ''}
    </div>

    <div class="clausula">
      <h2>Cláusula 2 – Valor e Forma de Pagamento</h2>

      <div class="resumo-financeiro">
        <div class="topo">Resumo Financeiro do Evento</div>
        <div class="corpo">
          <table>
            <tr>
              <td><strong>Serviço contratado</strong></td>
              <td>${data.Servico || ''}</td>
            </tr>
            ${data.coposDeVidro ? `
            <tr>
              <td><strong>Adicional Copos de Vidro</strong></td>
              <td>Sim (5 por convidado - R$ ${Number(data.precoCopoVidro !== undefined ? data.precoCopoVidro : 5).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/pessoa)</td>
            </tr>
            ` : ''}
            <tr>
              <td><strong>Convidados informados</strong></td>
              <td>${data.convidados_informados || 0}</td>
            </tr>
            <tr>
              <td><strong>Mínimo contratual</strong></td>
              <td>${data.minimo_convidados || 40}</td>
            </tr>
            <tr>
              <td><strong>Convidados cobrados</strong></td>
              <td>${data.convidados_cobrados || 0}</td>
            </tr>
            <tr>
              <td><strong>Valor por convidado</strong></td>
              <td>R$ ${data.valor_por_convidado_formatado || '0,00'}</td>
            </tr>
            ${data.desconto && parseFloat(data.desconto) > 0 ? `
            <tr>
              <td>Valor bruto</td>
              <td>R$ ${data.valor_original_formatado || '0,00'}</td>
            </tr>
            <tr>
              <td>Desconto</td>
              <td style="color: #F44336;">- R$ ${data.desconto_formatado || '0,00'}</td>
            </tr>
            ` : ''}
            <tr>
              <td><strong>Hora extra (adicional)</strong></td>
              <td>R$ ${data.valor_hora_extra_formatado || '0,00'}/hora</td>
            </tr>
            <tr>
              <td><strong>Valor total</strong></td>
              <td class="valor-destaque">R$ ${data.valor_total_formatado || '0,00'}</td>
            </tr>
          </table>
        </div>
      </div>

      <p>
        2.1 O valor deste contrato foi calculado com base em <strong>${data.convidados_cobrados || 0} convidados cobrados</strong>,
        ao valor unitário de <strong>R$ ${data.valor_por_convidado_formatado || '0,00'}</strong> por convidado,
        totalizando <strong>R$ ${data.valor_total_formatado || '0,00'}</strong>${data.desconto && parseFloat(data.desconto) > 0 ? ` (sendo o valor bruto de R$ ${data.valor_original_formatado || '0,00'} com desconto de R$ ${data.desconto_formatado || '0,00'})` : ''}.
      </p>
      <p>
        2.2 Ainda que o CONTRATANTE informe número inferior de participantes, fica estabelecido o mínimo contratual de
        <strong>${data.minimo_convidados || 40} convidados</strong> para fins de cobrança.
      </p>
      <p>
        2.3 O valor total será pago em duas parcelas, conforme abaixo:
      </p>
      <ul class="clean">
        <li><strong>Primeira parcela:</strong> R$ ${data.parcela_1_valor_formatado || '0,00'} no ato da assinatura deste contrato;</li>
        <li><strong>Segunda parcela:</strong> R$ ${data.parcela_2_valor_formatado || '0,00'} até o dia do evento ${data.parcela_2_data || ''};</li>
      </ul>
      <p>
        2.4 A quitação integral das parcelas é condição essencial para a execução dos serviços contratados.
      </p>
      <p>
        2.5 O pagamento poderá ser efetuado por PIX, transferência bancária ou dinheiro, conforme ajustado entre as partes.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 3 – Cancelamento pelo Contratante</h2>
      <p>
        3.1 O cancelamento implicará multa de 20% sobre o valor total do contrato, podendo ser descontada de quaisquer valores já pagos.
      </p>
      <p>
        3.2 Cancelamentos realizados com menos de 30 (trinta) dias da data do evento não dão direito a reembolso dos valores já pagos.
      </p>
      <p>
        3.3 A redução no número de convidados não implica redução do valor contratado, especialmente em razão do mínimo contratual estabelecido.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 4 – Cancelamento pelo Contratado</h2>
      <p>
        4.1 O CONTRATADO poderá cancelar a prestação dos serviços em casos de força maior ou impossibilidade justificada, como doença grave, acidente ou falecimento de familiar direto.
      </p>
      <p>
        4.2 Nessa hipótese, o CONTRATANTE será reembolsado integralmente dos valores pagos ou poderá optar pela remarcação do evento, conforme disponibilidade de agenda.
      </p>
      <p>
        4.3 Sempre que possível, o CONTRATADO compromete-se a indicar profissional de qualificação equivalente para substituição.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 5 – Remarcação</h2>
      <p>
        5.1 O CONTRATANTE poderá solicitar a remarcação do evento com antecedência mínima de 20 (vinte) dias.
      </p>
      <p>
        5.2 A remarcação dependerá da disponibilidade de agenda do CONTRATADO e poderá implicar reajuste de valores conforme a nova data.
      </p>
      <p>
        5.3 Os valores pagos permanecerão como crédito para a nova data, não sendo reembolsáveis, salvo acordo diverso.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 6 – Responsabilidade por Danos e Consumo</h2>
      <p>
        6.1 O CONTRATADO não se responsabiliza por acidentes ou pelo consumo excessivo de bebidas alcoólicas por parte dos convidados.
      </p>
      <p>
        6.2 É vedado o fornecimento ou consumo de bebidas alcoólicas por menores de 18 (dezoito) anos, cabendo exclusivamente ao CONTRATANTE a fiscalização e o controle para impedir tal prática.
      </p>
      <p>
        6.3 Caso ocorra consumo de bebidas alcoólicas por menores durante o evento, toda responsabilidade civil, administrativa ou criminal recairá exclusivamente sobre o CONTRATANTE.
      </p>
      <p>
        6.4 O CONTRATANTE responderá por danos causados a copos, taças, utensílios, acessórios e demais materiais disponibilizados pelo CONTRATADO durante o evento.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 7 – Condições Gerais</h2>
      <p>
        7.1 O presente contrato é firmado em caráter particular, produzindo efeitos jurídicos mediante a assinatura das partes.
      </p>
      <p>
        7.2 Casos omissos ou dúvidas serão resolvidos de comum acordo e, não sendo possível, fica eleito o foro da Comarca de Juiz de Fora – MG.
      </p>
      <p>
        7.3 Qualquer alteração neste contrato somente terá validade se formalizada por escrito e assinada por ambas as partes.
      </p>
    </div>

    <div class="clausula">
      <h2>Cláusula 8 – Vigência</h2>
      <p>
        8.1 O presente contrato entra em vigor na data de sua assinatura e permanece válido até a conclusão do evento descrito na Cláusula 1, ressalvadas as obrigações pendentes de pagamento, multa ou indenização.
      </p>
    </div>
    <div class="clausula">
  <h2>Cláusula 9 – Convidados Excedentes</h2>
  <p>
    9.1 O presente contrato foi calculado com base na quantidade de convidados informada pelo CONTRATANTE,
    sendo considerados para planejamento do serviço, preparo de insumos e dimensionamento do atendimento
    o total de <strong>${data.convidados_informados || 0}</strong> convidados.
  </p>

  <p>
    9.2 Caso o número de pessoas presentes no evento ultrapasse a quantidade informada no momento da contratação,
    será considerado que houve convidados excedentes.
  </p>

  <p>
    9.3 Os convidados adicionais poderão ser identificados por contagem direta, observação do fluxo de pessoas,
    controle de consumo ou qualquer outro meio razoável utilizado pelo CONTRATADO durante a realização do evento.
  </p>

  <p>
    9.4 Cada convidado excedente será cobrado com base no valor unitário do pacote contratado,
    correspondente a <strong>R$ ${data.valor_por_convidado_formatado || '0,00'}</strong> por pessoa,
    podendo ser aplicado acréscimo de até 20% em razão de ajuste operacional de última hora.
  </p>

  <p>
    9.5 O valor referente aos convidados excedentes deverá ser pago pelo CONTRATANTE ao final do evento
    ou no prazo máximo de 24 horas após sua realização.
  </p>

  <p>
    9.6 Caso o número de convidados ultrapasse significativamente a quantidade informada,
    o CONTRATADO não garante a disponibilidade de insumos suficientes para todos os presentes,
    limitando o atendimento ao estoque previamente preparado para o evento.
  </p>
</div>
    <div class="clausula">
  <h2>Cláusula 10 – Hora Extra</h2>
  <p>
    10.1 O serviço contratado foi ajustado para a duração de <strong>${data.duracao || ''} horas</strong>,
    conforme descrito neste contrato.
  </p>
  <p>
    10.2 Caso o CONTRATANTE solicite a permanência do CONTRATADO além do período inicialmente contratado,
    e havendo disponibilidade do CONTRATADO, será cobrado valor adicional a título de hora extra.
  </p>
  <p>
    10.3 O valor de cada hora extra corresponderá ao valor total do pedido dividido por 5 (cinco),
    acrescido de 30% (trinta por cento), totalizando:
    <strong>
      R$ ${data.valor_hora_extra_formatado || ''}
    </strong>
    por hora excedente.
  </p>
  <p>
    10.4 Para fins de cálculo, será utilizada a seguinte fórmula:
    <strong>(valor total do pedido ÷ 5) + 30%</strong>.
  </p>
  <p>
    10.5 A hora extra será cobrada proporcionalmente por período iniciado superior a 30 (trinta) minutos,
    podendo o pagamento ser realizado ao final do evento ou no prazo máximo de 24 horas após sua realização.
  </p>
  <p>
    10.6 A realização de hora extra dependerá exclusivamente da disponibilidade do CONTRATADO no momento do evento,
    não havendo obrigação de prorrogação automática do atendimento.
  </p>
</div>

    ${data.autorizarimagem !== false ? `
    <div class="clausula">
      <h2>Cláusula 11 – Uso de Imagem e Proteção de Dados (LGPD)</h2>
      <p>
        11.1 O CONTRATANTE AUTORIZA, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), de forma gratuita, irrevogável e por prazo indeterminado, o CONTRATADO a utilizar sua imagem captada em fotos e/ou vídeos realizados durante o evento, exclusivamente para fins de divulgação institucional, promocional e publicitária em redes sociais (como Instagram, Facebook, TikTok e similares), websites e materiais de marketing.
      </p>
      <p>
        11.2 O CONTRATADO compromete-se a não utilizar a imagem de forma a atingir a honra, a moral ou a reputação do CONTRATANTE. A autorização é concedida a título gratuito, não gerando qualquer direito de indenização ou remuneração.
      </p>
    </div>
    ` : `
    <div class="clausula">
      <h2>Cláusula 11 – Uso de Imagem e Proteção de Dados (LGPD)</h2>
      <p>
        11.1 O CONTRATANTE DECLARA QUE NÃO AUTORIZA o uso de sua imagem ou de seus convidados para fins de divulgação institucional, promocional ou publicitária pelo CONTRATADO, devendo ser respeitada a sua privacidade em conformidade com as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>
    </div>
    `}

    <div class="assinaturas">
      <p><span class="label">Local e Data:</span> ${data.local_data_assinatura || ''}</p>
      <p class="small">E, por estarem justos e contratados, firmam o presente instrumento em duas vias de igual teor.</p>

      <div class="assinatura-grid">
        <div class="assinatura-box">
          <div class="linha"></div>
          <p><strong>CONTRATANTE</strong></p>
          <p class="muted">${data.nome || ''}</p>
          <p class="muted">CPF: ${data.cpf || ''}</p>
        </div>

        <div class="assinatura-box">
          <div class="linha"></div>
          <p><strong>CONTRATADO</strong></p>
          <p class="muted">Gabryel Einstein de Carvalho Amaro</p>
          <p class="muted">CPF: 144.612.766-43</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export async function POST(request) {
  try {
    const data = await request.json();

    // 1. Determine template and render HTML
    const isMaoDeObra = (data.Servico || data.servico_normalizado || '').toLowerCase().includes('mão de obra');
    const htmlContent = isMaoDeObra ? getMaoDeObraTemplate(data) : getStandardTemplate(data);

    // 2. Fetch general config for Evolution API from Firebase
    const configSnapshot = await get(ref(db, 'config'));
    if (!configSnapshot.exists()) {
      return NextResponse.json({ error: 'Configuração do Firebase não encontrada' }, { status: 500 });
    }
    const config = configSnapshot.val();
    const evolutionApi = config?.evolutionApi;

    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      return NextResponse.json({ error: 'Evolution API não configurada no painel administrativo' }, { status: 500 });
    }

    // 3. Send HTML to Gotenberg to convert to PDF
    const gotenbergUrl = 'https://gotenberg.gabryelamaro.com/forms/chromium/convert/html';
    
    // We construct a multipart/form-data payload with the HTML content
    const formData = new FormData();
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    formData.append('files', htmlBlob, 'index.html');

    const gotenbergResponse = await fetch(gotenbergUrl, {
      method: 'POST',
      body: formData
    });

    if (!gotenbergResponse.ok) {
      const errorText = await gotenbergResponse.text();
      console.error('Gotenberg error:', errorText);
      return NextResponse.json({ error: 'Falha ao converter HTML para PDF via Gotenberg' }, { status: 502 });
    }

    const pdfBuffer = await gotenbergResponse.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // 4. Send PDF to client via Evolution API
    let cleanNumber = (data.whatsapp || data.numero || '').replace(/\D/g, '');
    if (!cleanNumber) {
      return NextResponse.json({ error: 'Número de WhatsApp do cliente inválido' }, { status: 400 });
    }

    if (cleanNumber.startsWith('55') && cleanNumber.length >= 12) {
      // Já tem o código do país 55
    } else {
      cleanNumber = '55' + cleanNumber;
    }

    const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
    const evolutionEndpoint = `${baseUrl}/message/sendMedia/${evolutionApi.instance}`;

    const general = config?.general;
    let contratoLegenda = general?.contratoLegenda || 'Segue seu contrato, por gentileza , confira os dados e se estiverem corretos assine e me encaminhe';
    contratoLegenda = contratoLegenda
      .replace(/\{\{nome\}\}/gi, data.nome || '')
      .replace(/\{\{dataEvento\}\}/gi, data.dataEvento || data.Data || '')
      .replace(/\{\{cidade\}\}/gi, data.cidade || data.Cidade || '')
      .replace(/\{\{pacote\}\}/gi, data.pacote || data.Pacote || data.Servico || '');

    const evolutionPayload = {
      number: cleanNumber,
      mediatype: 'document',
      caption: contratoLegenda,
      media: base64Pdf,
      fileName: 'contrato.pdf'
    };

    const evolutionResponse = await fetch(evolutionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApi.apikey
      },
      body: JSON.stringify(evolutionPayload)
    });

    if (!evolutionResponse.ok) {
      const evolutionError = await evolutionResponse.text();
      console.error('Evolution API error:', evolutionError);
      return NextResponse.json({ error: 'Falha ao enviar contrato via WhatsApp (Evolution API)' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na geração/envio do contrato:', error);
    return NextResponse.json({ error: 'Erro interno ao processar e enviar o contrato', details: error.message }, { status: 500 });
  }
}
