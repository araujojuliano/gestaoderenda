// Banco de Dados convertido
const veiculosDB = [
  { id: 1, modelo: 'Honda CG 160 Start / Fan', consumo_medio_km_l: 35.0, custo_estimado_km: 0.17 },
  { id: 2, modelo: 'Honda CG 160 Titan', consumo_medio_km_l: 35.0, custo_estimado_km: 0.19 },
  { id: 3, modelo: 'Honda Bros 160', consumo_medio_km_l: 32.0, custo_estimado_km: 0.18 },
  { id: 4, modelo: 'Yamaha Factor 150', consumo_medio_km_l: 38.0, custo_estimado_km: 0.19 }
];

const PERCENTUAL_RESERVA_EMERGENCIA = 0.15;
const KM_MEDIO_PADRAO = 5.0; // usado enquanto não houver histórico real

// Versão atualizada do banco local para limpar lixos antigos do cache
const STORAGE_CONFIG = 'plataforma_gestao_config_v8';
const STORAGE_REGISTROS = 'plataforma_gestao_registros_v8';

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const formatarNumero = (valor, casas = 2) => Number(valor || 0).toFixed(casas);
const hojeISO = () => new Date().toISOString().slice(0, 10);
const mesAtualISO = () => new Date().toISOString().slice(0, 7);

const els = {
  veiculo: document.getElementById('veiculo_id'),
  precoCombustivel: document.getElementById('preco_combustivel'),
  tarifaMedia: document.getElementById('tarifa_media'),
  metaLiquida: document.getElementById('meta_liquida'),
  metaPoupanca: document.getElementById('meta_poupanca'),
  valorSeguro: document.getElementById('valor_seguro'),
  diasMes: document.getElementById('dias_mes'),
  parametrosInternos: document.getElementById('parametros-internos'),
  simulacaoResultado: document.getElementById('simulacao-resultado'),
  simulacaoAlerta: document.getElementById('simulacao-alerta'),
  formSimulacao: document.getElementById('form-simulacao'),
  btnLimparConfig: document.getElementById('btn-limpar-config'),

  registroData: document.getElementById('registro_data'),
  registroBruto: document.getElementById('registro_bruto'),
  registroCorridas: document.getElementById('registro_corridas'),
  registroKmDia: document.getElementById('registro_km_dia'),
  registroCombustivel: document.getElementById('registro_combustivel'),
  registroOutros: document.getElementById('registro_outros'),
  registroPoupado: document.getElementById('registro_poupado'),
  registroObs: document.getElementById('registro_obs'),
  formRegistro: document.getElementById('form-registro'),
  btnPreencherEstimativa: document.getElementById('btn-preencher-estimativa'),

  filtroMes: document.getElementById('filtro_mes'),
  btnAtualizarPainel: document.getElementById('btn-atualizar-painel'),
  btnExportarCsv: document.getElementById('btn-exportar-csv'),
  btnLimparRegistros: document.getElementById('btn-limpar-registros'),
  painelMensal: document.getElementById('painel-mensal'),
  statusMes: document.getElementById('status-mes'),
  tabelaRegistros: document.getElementById('tabela-registros')
};

function carregarConfig() {
  return JSON.parse(localStorage.getItem(STORAGE_CONFIG)) || {
    veiculo_id: 1,
    preco_combustivel: 6.2,
    tarifa_media: 7.5,
    meta_liquida: 1800,
    valor_seguro: 120,
    dias_mes: 22
  };
}

function salvarConfig(config) {
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
}

function carregarRegistros() {
  return JSON.parse(localStorage.getItem(STORAGE_REGISTROS)) || [];
}

function salvarRegistros(registros) {
  localStorage.setItem(STORAGE_REGISTROS, JSON.stringify(registros));
}

function popularVeiculos() {
  els.veiculo.innerHTML = veiculosDB
    .map((v) => `<option value="${v.id}">${v.modelo}</option>`)
    .join('');
}

function lerConfigDaTela() {
  return {
    veiculo_id: parseInt(els.veiculo.value) || 1,
    preco_combustivel: parseFloat(els.precoCombustivel.value) || 0,
    tarifa_media: parseFloat(els.tarifaMedia.value) || 0,
    meta_liquida: parseFloat(els.metaLiquida.value) || 0,
    valor_seguro: parseFloat(els.valorSeguro.value) || 0,
    dias_mes: parseInt(els.diasMes.value) || 22
  };
}

function preencherConfigNaTela(config) {
  els.veiculo.value = config.veiculo_id;
  els.precoCombustivel.value = config.preco_combustivel;
  els.tarifaMedia.value = config.tarifa_media;
  els.metaLiquida.value = config.meta_liquida;
  els.valorSeguro.value = config.valor_seguro;
  els.diasMes.value = config.dias_mes;

  atualizarCamposDerivados();
}

function calcularMetaPoupancaMensal(metaLiquida) {
  return metaLiquida * PERCENTUAL_RESERVA_EMERGENCIA;
}

function calcularSeguroDiario(config) {
  return config.dias_mes > 0 ? config.valor_seguro / config.dias_mes : 0;
}

function calcularResultadoAposCustos(bruto, combustivel, outros, seguroRateado) {
  return bruto - combustivel - outros - seguroRateado;
}

/*
Regra adotada:
- O valor poupado é 15% do valor que fica no bolso.
- Então:
  resultadoAposCustos = liquidoBolso + poupado
  poupado = liquidoBolso * 0.15

Logo:
  liquidoBolso = resultadoAposCustos / 1.15
  poupado = resultadoAposCustos - liquidoBolso
*/
function calcularDistribuicaoResultado(resultadoAposCustos) {
  if (resultadoAposCustos <= 0) {
    return {
      poupado: 0,
      liquidoBolso: resultadoAposCustos
    };
  }

  const liquidoBolso = resultadoAposCustos / (1 + PERCENTUAL_RESERVA_EMERGENCIA);
  const poupado = resultadoAposCustos - liquidoBolso;

  return { poupado, liquidoBolso };
}

function calcularKmMedioHistorico() {
  const registros = carregarRegistros();

  const totais = registros.reduce(
    (acc, item) => {
      const kmRodados = Number(item.kmRodados || 0);
      const corridas = Number(item.corridas || 0);

      if (kmRodados > 0 && corridas > 0) {
        acc.km += kmRodados;
        acc.corridas += corridas;
      }

      return acc;
    },
    { km: 0, corridas: 0 }
  );

  if (totais.corridas > 0) {
    return {
      kmMedio: totais.km / totais.corridas,
      temHistorico: true,
      totalKm: totais.km,
      totalCorridas: totais.corridas
    };
  }

  return {
    kmMedio: KM_MEDIO_PADRAO,
    temHistorico: false,
    totalKm: 0,
    totalCorridas: 0
  };
}

function calcularEstimativasBase() {
  const config = lerConfigDaTela();
  const veiculo = veiculosDB.find(v => v.id === config.veiculo_id) || veiculosDB[0];
  const historico = calcularKmMedioHistorico();

  const custo_km =
    veiculo.consumo_medio_km_l > 0
      ? (config.preco_combustivel / veiculo.consumo_medio_km_l) + veiculo.custo_estimado_km
      : 0;

  const km_medio_historico = historico.kmMedio;
  const custo_operacional_corrida = custo_km * km_medio_historico;
  const lucro_por_corrida = config.tarifa_media - custo_operacional_corrida;

  const meta_liquida_diaria = config.dias_mes > 0 ? config.meta_liquida / config.dias_mes : 0;
  const seguro_diario = calcularSeguroDiario(config);
  const valor_reserva_dia = meta_liquida_diaria * PERCENTUAL_RESERVA_EMERGENCIA;

  // Objetivo diário: bater a meta líquida + seguro + reserva
  const objetivo_final_dia = meta_liquida_diaria + seguro_diario + valor_reserva_dia;

  let qtd_corridas = 0;
  if (lucro_por_corrida > 0) {
    qtd_corridas = Math.ceil(objetivo_final_dia / lucro_por_corrida);
  }

  const faturamento_bruto_diario = qtd_corridas * config.tarifa_media;
  const meta_poupanca_mensal = calcularMetaPoupancaMensal(config.meta_liquida);
  const km_limite = custo_km > 0 ? config.tarifa_media / custo_km : 0;
  const km_dia_estimado = qtd_corridas * km_medio_historico;
  const consumo_litros_dia =
    veiculo.consumo_medio_km_l > 0 ? km_dia_estimado / veiculo.consumo_medio_km_l : 0;

  return {
    ...config,
    veiculo,
    custo_km,
    custo_operacional_corrida,
    km_medio_historico,
    lucro_por_corrida,
    meta_liquida_diaria,
    seguro_diario,
    valor_reserva_dia,
    objetivo_final_dia,
    qtd_corridas,
    faturamento_bruto_diario,
    meta_poupanca_mensal,
    km_dia_estimado,
    consumo_litros_dia,
    km_limite,
    tem_historico: historico.temHistorico
  };
}

function atualizarCamposDerivados() {
  const estimativas = calcularEstimativasBase();

  els.metaPoupanca.value = formatarNumero(estimativas.meta_poupanca_mensal, 2);

  els.parametrosInternos.innerHTML = `
    <strong>Regras de cálculo vigentes:</strong><br>
    • Reserva (Poupança) = 15% sobre a meta líquida mensal.<br>
    • Poupança diária automática = 15% do valor líquido que fica no bolso no dia.<br>
    • Faturamento bruto estimado = calculado pela quantidade mínima inteira de corridas necessárias.<br>
    • KM Médio por Corrida: ${
      estimativas.tem_historico
        ? `atualizado com base nos seus registros reais (${formatarNumero(estimativas.km_medio_historico, 2)} km/corrida).`
        : `sem histórico ainda; usando valor provisório de ${formatarNumero(KM_MEDIO_PADRAO, 1)} km/corrida.`
    }
  `;
}

function renderSimulacao() {
  const resultado = calcularEstimativasBase();

  const cards = [
    {
      label: 'Custo por KM',
      value: formatarMoeda(resultado.custo_km),
      extra: 'Combustível + manutenção.'
    },
    {
      label: 'KM médio por corrida',
      value: `${formatarNumero(resultado.km_medio_historico, 2)} km`,
      extra: resultado.tem_historico
        ? 'Calculado com base no histórico real.'
        : 'Valor provisório até existir histórico.'
    },
    {
      label: 'Lucro por corrida',
      value: formatarMoeda(resultado.lucro_por_corrida),
      extra: 'Tarifa - custo operacional estimado por corrida.'
    },
    {
      label: 'Corridas (meta diária)',
      value: `${resultado.qtd_corridas} corridas`,
      extra: 'Quantidade mínima inteira necessária.'
    },
    {
      label: 'Bruto estimado por dia',
      value: formatarMoeda(resultado.faturamento_bruto_diario),
      extra: 'Para atingir o objetivo financeiro do dia.'
    },
    {
      label: 'Líquido alvo por dia',
      value: formatarMoeda(resultado.meta_liquida_diaria),
      extra: 'Valor limpo desejado no bolso.'
    },
    {
      label: 'Poupança alvo por dia',
      value: formatarMoeda(resultado.valor_reserva_dia),
      extra: '15% da meta líquida diária.'
    },
    {
      label: 'KM estimado do dia',
      value: `${formatarNumero(resultado.km_dia_estimado, 1)} km`,
      extra: `Consumo estimado: ${formatarNumero(resultado.consumo_litros_dia, 2)} L`
    }
  ];

  els.simulacaoResultado.innerHTML = cards
    .map((card) => `
      <div class="card">
        <span class="label">${card.label}</span>
        <div class="value">${card.value}</div>
        <small>${card.extra}</small>
      </div>
    `)
    .join('');

  if (resultado.lucro_por_corrida <= 0) {
    els.simulacaoAlerta.innerHTML = `
      <div class="status critico">
        Alerta: com os dados atuais, o custo por corrida consome toda a tarifa.
      </div>
    `;
  } else if (!resultado.tem_historico) {
    els.simulacaoAlerta.innerHTML = `
      <div class="status atencao">
        Simulação provisória: ainda não há histórico real de KM por corrida. O sistema está usando um valor padrão.
      </div>
    `;
  } else {
    els.simulacaoAlerta.innerHTML = `
      <div class="status meta">
        Simulação baseada no seu histórico real e em quantidade inteira de corridas.
      </div>
    `;
  }
}

function calcularPoupancaDiaria() {
  const bruto = parseFloat(els.registroBruto.value) || 0;
  const combustivel = parseFloat(els.registroCombustivel.value) || 0;
  const outros = parseFloat(els.registroOutros.value) || 0;

  const config = lerConfigDaTela();
  const seguroDiario = calcularSeguroDiario(config);
  const resultadoAposCustos = calcularResultadoAposCustos(bruto, combustivel, outros, seguroDiario);
  const { poupado } = calcularDistribuicaoResultado(resultadoAposCustos);

  els.registroPoupado.value = formatarNumero(poupado, 2);
}

function registrarDia(event) {
  event.preventDefault();

  const config = lerConfigDaTela();
  salvarConfig(config);

  const data = els.registroData.value;
  const bruto = parseFloat(els.registroBruto.value) || 0;
  const corridas = parseInt(els.registroCorridas.value) || 0;
  const kmRodados = parseFloat(els.registroKmDia.value) || 0;
  const combustivel = parseFloat(els.registroCombustivel.value) || 0;
  const outros = parseFloat(els.registroOutros.value) || 0;
  const observacoes = els.registroObs.value.trim();

  const seguroRateado = calcularSeguroDiario(config);
  const resultadoAposCustos = calcularResultadoAposCustos(bruto, combustivel, outros, seguroRateado);
  const { poupado, liquidoBolso } = calcularDistribuicaoResultado(resultadoAposCustos);

  const kmMedioDia = corridas > 0 ? kmRodados / corridas : 0;

  const registros = carregarRegistros().filter((item) => item.data !== data);
  registros.push({
    data,
    bruto,
    corridas,
    kmRodados,
    kmMedioDia,
    combustivel,
    outros,
    poupado,
    seguroRateado,
    resultadoAposCustos,
    liquido: liquidoBolso,
    observacoes
  });

  registros.sort((a, b) => a.data.localeCompare(b.data));
  salvarRegistros(registros);

  atualizarCamposDerivados();
  renderSimulacao();
  atualizarPainel();

  els.formRegistro.reset();
  els.registroData.value = hojeISO();
  els.registroCorridas.value = 0;
  els.registroKmDia.value = 0;
  els.registroCombustivel.value = 0;
  els.registroOutros.value = 0;
  els.registroPoupado.value = formatarNumero(0, 2);
}

function obterNivelStatus(percentual) {
  if (percentual >= 100) return 3; // meta
  if (percentual >= 85) return 2;  // estavel
  if (percentual >= 60) return 1;  // atencao
  return 0;                        // critico
}

function nivelParaStatus(nivel) {
  if (nivel >= 3) return { classe: 'meta', texto: 'Meta atingida' };
  if (nivel === 2) return { classe: 'estavel', texto: 'Estável' };
  if (nivel === 1) return { classe: 'atencao', texto: 'Em atenção' };
  return { classe: 'critico', texto: 'Crítico' };
}

function rebaixarNivel(nivel, quantidade = 1) {
  return Math.max(0, nivel - quantidade);
}

function atualizarPainel() {
  const config = lerConfigDaTela();
  salvarConfig(config);

  const estimativas = calcularEstimativasBase();
  const mesSelecionado = els.filtroMes.value || mesAtualISO();
  els.filtroMes.value = mesSelecionado;

  const registros = carregarRegistros().filter((item) => item.data.startsWith(mesSelecionado));

  const totais = registros.reduce((acc, item) => {
    acc.bruto += Number(item.bruto || 0);
    acc.liquido += Number(item.liquido || 0);
    acc.poupado += Number(item.poupado || 0);
    acc.combustivel += Number(item.combustivel || 0);
    acc.outros += Number(item.outros || 0);
    acc.seguros += Number(item.seguroRateado || 0);
    acc.corridas += Number(item.corridas || 0);
    acc.kmRodados += Number(item.kmRodados || 0);
    return acc;
  }, {
    bruto: 0,
    liquido: 0,
    poupado: 0,
    combustivel: 0,
    outros: 0,
    seguros: 0,
    corridas: 0,
    kmRodados: 0
  });

  const diasRegistrados = registros.length;
  const diasNegativos = registros.filter(item => Number(item.liquido || 0) < 0).length;
  const ultimoRegistro = registros.length ? registros[registros.length - 1] : null;

  const liquidoPct = config.meta_liquida > 0 ? (totais.liquido / config.meta_liquida) * 100 : 0;
  const poupancaPct =
    estimativas.meta_poupanca_mensal > 0
      ? (totais.poupado / estimativas.meta_poupanca_mensal) * 100
      : 0;

  const mediaBrutaDia = diasRegistrados > 0 ? totais.bruto / diasRegistrados : 0;
  const mediaLiquidaDia = diasRegistrados > 0 ? totais.liquido / diasRegistrados : 0;
  const kmMedioMes = totais.corridas > 0 ? totais.kmRodados / totais.corridas : 0;

  const nivelLiquido = obterNivelStatus(liquidoPct);
  const nivelPoupanca = obterNivelStatus(poupancaPct);

  // O status geral nunca pode ser melhor que o pior indicador principal
  let nivelGeral = Math.min(nivelLiquido, nivelPoupanca);

  // Se o último dia do mês foi negativo, rebaixa um nível
  if (ultimoRegistro && Number(ultimoRegistro.liquido || 0) < 0) {
    nivelGeral = rebaixarNivel(nivelGeral, 1);
  }

  // Se o acumulado líquido do mês ficou negativo, o mês é crítico
  if (totais.liquido < 0) {
    nivelGeral = 0;
  }

  const statusLiquido = nivelParaStatus(nivelLiquido);
  const statusPoupanca = nivelParaStatus(nivelPoupanca);
  const statusGeral = nivelParaStatus(nivelGeral);

  const cards = [
    {
      label: 'Bruto acumulado',
      value: formatarMoeda(totais.bruto),
      extra: 'Total faturado no mês.'
    },
    {
      label: 'Líquido acumulado',
      value: formatarMoeda(totais.liquido),
      extra: `${formatarNumero(liquidoPct, 1)}% da meta líquida`
    },
    {
      label: 'Poupança acumulada',
      value: formatarMoeda(totais.poupado),
      extra: `${formatarNumero(poupancaPct, 1)}% da meta de poupança`
    },
    {
      label: 'Dias registrados',
      value: `${diasRegistrados} dia(s)`,
      extra: `Corridas totais: ${totais.corridas}`
    },
    {
      label: 'Dias negativos',
      value: `${diasNegativos} dia(s)`,
      extra: 'Dias em que o valor final do bolso ficou abaixo de zero.'
    },
    {
      label: 'Média bruta por dia',
      value: formatarMoeda(mediaBrutaDia),
      extra: 'Apenas dias registrados.'
    },
    {
      label: 'Média líquida por dia',
      value: formatarMoeda(mediaLiquidaDia),
      extra: 'Valor final que ficou no bolso.'
    },
    {
      label: 'KM médio histórico',
      value: `${formatarNumero(kmMedioMes, 2)} km/corrida`,
      extra: `Total rodado no mês: ${formatarNumero(totais.kmRodados, 1)} km`
    },
    {
      label: 'Custos operacionais',
      value: formatarMoeda(totais.combustivel + totais.outros + totais.seguros),
      extra: 'Combustível + outros custos + seguro rateado.'
    }
  ];

  els.painelMensal.innerHTML = cards
    .map((card) => `
      <div class="card">
        <span class="label">${card.label}</span>
        <div class="value">${card.value}</div>
        <small>${card.extra}</small>
      </div>
    `)
    .join('');

  els.statusMes.innerHTML = `
    <div class="actions" style="margin-top: 14px;">
      <span class="status ${statusGeral.classe}">Status geral do mês: ${statusGeral.texto}</span>
      <span class="status ${statusLiquido.classe}">Bolso líquido: ${statusLiquido.texto}</span>
      <span class="status ${statusPoupanca.classe}">Poupança: ${statusPoupanca.texto}</span>
    </div>
    <div class="note-box" style="margin-top: 12px;">
      Dias negativos no mês: <strong>${diasNegativos}</strong><br>
      ${ultimoRegistro && Number(ultimoRegistro.liquido || 0) < 0
        ? 'O último registro do mês foi negativo, então o status geral foi rebaixado automaticamente.'
        : 'O status geral foi definido com base no pior desempenho entre bolso líquido e poupança.'}
    </div>
  `;

  renderTabelaRegistros(registros);
}

function renderTabelaRegistros(registros) {
  if (!registros.length) {
    els.tabelaRegistros.innerHTML = '<p class="muted">Nenhum registro encontrado para o mês selecionado.</p>';
    return;
  }

  els.tabelaRegistros.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Bruto</th>
          <th>Líquido</th>
          <th>Poupado</th>
          <th>Corridas</th>
          <th>KM</th>
          <th>KM/corrida</th>
          <th>Combustível</th>
          <th>Outros</th>
          <th>Obs.</th>
        </tr>
      </thead>
      <tbody>
        ${registros.map((item) => `
          <tr>
            <td>${item.data.split('-').reverse().join('/')}</td>
            <td>${formatarMoeda(item.bruto)}</td>
            <td>${formatarMoeda(item.liquido)}</td>
            <td>${formatarMoeda(item.poupado)}</td>
            <td>${item.corridas}</td>
            <td>${formatarNumero(item.kmRodados, 1)} km</td>
            <td>${formatarNumero(item.kmMedioDia, 2)} km</td>
            <td>${formatarMoeda(item.combustivel)}</td>
            <td>${formatarMoeda(item.outros)}</td>
            <td>${item.observacoes || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function exportarCSV() {
  const mesSelecionado = els.filtroMes.value || mesAtualISO();
  const registros = carregarRegistros().filter((item) => item.data.startsWith(mesSelecionado));

  if (!registros.length) {
    alert('Não há registros para exportar no mês selecionado.');
    return;
  }

  const linhas = [
    ['Data', 'Bruto', 'ResultadoAposCustos', 'LiquidoBolso', 'Poupado', 'Corridas', 'KmRodados', 'KmMedioDia', 'Combustivel', 'Outros', 'SeguroRateado', 'Observacoes'],
    ...registros.map((item) => [
      item.data,
      item.bruto,
      item.resultadoAposCustos,
      item.liquido,
      item.poupado,
      item.corridas,
      item.kmRodados,
      item.kmMedioDia,
      item.combustivel,
      item.outros,
      item.seguroRateado,
      `"${(item.observacoes || '').replaceAll('"', '""')}"`
    ])
  ];

  const csv = linhas.map((linha) => linha.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_${mesSelecionado}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function usarValoresEstimados() {
  const estimativas = calcularEstimativasBase();

  const custo_operacional_total_dia =
    estimativas.qtd_corridas * estimativas.custo_operacional_corrida;

  const gasto_combustivel = estimativas.consumo_litros_dia * estimativas.preco_combustivel;
  const gasto_outros = Math.max(custo_operacional_total_dia - gasto_combustivel, 0);

  els.registroData.value = hojeISO();
  els.registroBruto.value = formatarNumero(estimativas.faturamento_bruto_diario, 2);
  els.registroCorridas.value = estimativas.qtd_corridas;
  els.registroKmDia.value = formatarNumero(estimativas.km_dia_estimado, 1);
  els.registroCombustivel.value = formatarNumero(gasto_combustivel, 2);
  els.registroOutros.value = formatarNumero(gasto_outros, 2);

  calcularPoupancaDiaria();

  els.registroObs.value = estimativas.tem_historico
    ? 'Preenchimento automático via simulador.'
    : `Preenchimento automático via simulador com KM médio padrão de ${formatarNumero(KM_MEDIO_PADRAO, 1)} km/corrida.`;
}

function limparConfig() {
  localStorage.removeItem(STORAGE_CONFIG);
  const config = carregarConfig();
  preencherConfigNaTela(config);
  renderSimulacao();
  atualizarPainel();
  calcularPoupancaDiaria();
}

function limparRegistros() {
  const confirmar = confirm('Deseja apagar todos os registros salvos? Essa ação não pode ser desfeita.');
  if (!confirmar) return;

  localStorage.removeItem(STORAGE_REGISTROS);
  atualizarCamposDerivados();
  renderSimulacao();
  atualizarPainel();
  els.registroPoupado.value = formatarNumero(0, 2);
}

function inicializar() {
  popularVeiculos();

  const config = carregarConfig();
  preencherConfigNaTela(config);

  els.registroData.value = hojeISO();
  els.registroPoupado.value = formatarNumero(0, 2);
  els.filtroMes.value = mesAtualISO();

  renderSimulacao();
  atualizarPainel();

  els.formSimulacao.addEventListener('input', () => {
    atualizarCamposDerivados();
    renderSimulacao();
    calcularPoupancaDiaria();
    atualizarPainel();
  });

  els.formSimulacao.addEventListener('submit', (event) => {
    event.preventDefault();
    const configAtual = lerConfigDaTela();
    salvarConfig(configAtual);
    atualizarCamposDerivados();
    renderSimulacao();
    calcularPoupancaDiaria();
    atualizarPainel();
  });

  els.registroBruto.addEventListener('input', calcularPoupancaDiaria);
  els.registroCombustivel.addEventListener('input', calcularPoupancaDiaria);
  els.registroOutros.addEventListener('input', calcularPoupancaDiaria);

  els.formRegistro.addEventListener('submit', registrarDia);
  els.btnPreencherEstimativa.addEventListener('click', usarValoresEstimados);
  els.btnAtualizarPainel.addEventListener('click', atualizarPainel);
  els.btnExportarCsv.addEventListener('click', exportarCSV);
  els.btnLimparConfig.addEventListener('click', limparConfig);
  els.btnLimparRegistros.addEventListener('click', limparRegistros);
}

inicializar();