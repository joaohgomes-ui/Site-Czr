/* JavaScript - Calculadora de Frete Rodoviário SENAI */

document.addEventListener('DOMContentLoaded', () => {
  const FATOR_CUBAGEM_RODOVIARIO = 300; // 300 kg por m³ (padrão rodoviário)

  // 1. Injeta 'step="any"' em todos os inputs do tipo number para aceitar decimais longos (ex: 0.3012)
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.setAttribute('step', 'any');
  });

  // Função auxiliar para buscar elementos por múltiplos IDs
  function findElement(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  // Função para ler números tratando vírgula brasileira
  function parseNum(ids) {
    const el = findElement(ids);
    if (!el || el.value === null || el.value === undefined || el.value.trim() === '') return 0;
    const valLimpo = el.value.toString().replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(valLimpo);
    return isNaN(num) ? 0 : num;
  }

  // Função para ler texto dos campos
  function getTexto(ids) {
    const el = findElement(ids);
    return el ? el.value.trim() : '';
  }

  // Mapeamento dos elementos principais
  const btnCalcular = findElement(['btn-calcular', 'btnCalcular']);
  const btnLimpar = findElement(['btn-limpar', 'btnLimpar']);
  const btnTheme = findElement(['btn-theme', 'btnTheme']);
  const btnBuscarDistancia = findElement(['btn-buscar-distancia', 'btnBuscarDistancia']);
  const boxErros = findElement(['box-erros', 'boxErros']);
  const statusDistancia = findElement(['status-distancia', 'statusDistancia']);

  // Modo escuro
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      btnTheme.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Escuro';
    });
  }

  // Evento dos Botões Principais
  if (btnCalcular) btnCalcular.addEventListener('click', () => executarCalculo(true));
  if (btnLimpar) btnLimpar.addEventListener('click', limparFormulario);
  if (btnBuscarDistancia) btnBuscarDistancia.addEventListener('click', buscarDistanciaGPS);

  // 2. ESCUTA EM TEMPO REAL: Atualiza a tabela dinamicamente enquanto o usuário digita
  document.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      executarCalculo(false);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      executarCalculo(false);
    }
  });

  // Leitura centralizada de todos os campos
  function lerEntradasFormulario() {
    return {
      nomeCliente: getTexto(['nome-cliente', 'nome_cliente']),
      cidadeOrigem: getTexto(['cidade-origem', 'cidade_origem']),
      cidadeDestino: getTexto(['cidade-destino', 'cidade_destino']),
      distancia: parseNum(['distancia', 'distancia-km']),
      descricaoCarga: getTexto(['descricao-carga', 'descricao_carga']),
      valorNF: parseNum(['valor-nf', 'valor_nf']),
      quantidade: parseNum(['quantidade-volumes', 'quantidade_volumes']) || 1,
      pesoReal: parseNum(['peso-real', 'peso_real']),
      comprimento: parseNum(['comprimento']),
      largura: parseNum(['largura']),
      altura: parseNum(['altura']),
      tarifaKg: parseNum(['tarifa-kg', 'tarifa_kg']),
      freteMinimo: parseNum(['frete-minimo', 'frete_minimo']),
      percAdValorem: parseNum(['perc-advalorem', 'perc_advalorem']),
      percGris: parseNum(['perc-gris', 'perc_gris']),
      pedagio: parseNum(['pedagio']),
      outrasTaxas: parseNum(['outras-taxas', 'outras_taxas'])
    };
  }

  // Execução do cálculo
  function executarCalculo(mostrarAlertas = true) {
    if (mostrarAlertas && boxErros) {
      boxErros.style.display = 'none';
      boxErros.innerHTML = '';
    }

    const entradas = lerEntradasFormulario();

    if (mostrarAlertas) {
      const erros = validarEntradas(entradas);
      if (erros.length > 0) {
        exibirErrosValidacao(erros);
        return;
      }
    }

    // Cálculos Principais
    const cubagem = calcularCubagem(entradas.comprimento, entradas.largura, entradas.altura, entradas.quantidade);
    const analisePeso = determinarPesoCobranca(entradas.pesoReal, cubagem.pesoCubado);
    const freteCalculado = calcularFretePeso(analisePeso.pesoCobranca, entradas.tarifaKg, entradas.distancia, entradas.freteMinimo);
    const taxas = calcularTaxasAdicionais(entradas.valorNF, entradas.percAdValorem, entradas.percGris, entradas.pedagio, entradas.outrasTaxas);

    const valorTotalFrete = freteCalculado.freteAplicado + taxas.totalTaxas;

    // Atualiza a tabela na tela
    exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete);
  }

  // Validação estrita para quando o usuário clica no botão "Calcular Cotação"
  function validarEntradas(dados) {
    const erros = [];
    if (!dados.nomeCliente) erros.push('Informe o Nome / Razão Social do cliente.');
    if (!dados.cidadeOrigem) erros.push('Informe a cidade de Origem.');
    if (!dados.cidadeDestino) erros.push('Informe a cidade de Destino.');
    if (dados.distancia <= 0) erros.push('Informe uma distância válida maior que zero (km).');
    if (!dados.descricaoCarga) erros.push('Informe a descrição da mercadoria.');
    if (dados.valorNF <= 0) erros.push('O valor da Nota Fiscal deve ser maior que zero.');
    if (dados.quantidade <= 0) erros.push('A quantidade de volumes deve ser no mínimo 1.');
    if (dados.pesoReal <= 0) erros.push('O peso real total deve ser maior que zero.');
    if (dados.comprimento <= 0 || dados.largura <= 0 || dados.altura <= 0) {
      erros.push('Informe dimensões válidas maiores que zero (comprimento, largura e altura).');
    }
    if (dados.tarifaKg <= 0) erros.push('A tarifa base por kg deve ser maior que zero.');
    return erros;
  }

  function exibirErrosValidacao(erros) {
    if (!boxErros) return;
    let html = '<strong>Por favor, corrija os seguintes itens para prosseguir:</strong><ul>';
    erros.forEach(erro => html += `<li>${erro}</li>`);
    html += '</ul>';
    boxErros.innerHTML = html;
    boxErros.style.display = 'block';
  }

  // Fórmulas SENAI
  function calcularCubagem(comprimento, largura, altura, quantidade) {
    const volumeUnitario = comprimento * largura * altura;
    const volumeTotal = volumeUnitario * quantidade;
    const pesoCubado = volumeTotal * FATOR_CUBAGEM_RODOVIARIO;
    return { volumeTotal, pesoCubado };
  }

  function determinarPesoCobranca(pesoReal, pesoCubado) {
    if (pesoCubado > pesoReal) {
      return { pesoCobranca: pesoCubado, criterio: 'PESO CUBADO (ocupação de espaço)' };
    } else {
      return { pesoCobranca: pesoReal, criterio: 'PESO REAL (peso físico)' };
    }
  }

  function calcularFretePeso(pesoCobranca, tarifaKg, distancia, freteMinimo) {
    const fatorDistancia = distancia > 0 ? (distancia / 100) : 1;
    const fretePesoBruto = pesoCobranca * tarifaKg * fatorDistancia;
    let usouFreteMinimo = false;
    let freteAplicado = fretePesoBruto;

    if (fretePesoBruto < freteMinimo) {
      freteAplicado = freteMinimo;
      usouFreteMinimo = true;
    }

    return { fretePesoBruto, freteAplicado, usouFreteMinimo };
  }

  function calcularTaxasAdicionais(valorNF, percAdValorem, percGris, pedagio, outrasTaxas) {
    const valorAdValorem = valorNF * (percAdValorem / 100);
    const valorGris = valorNF * (percGris / 100);
    const totalTaxas = valorAdValorem + valorGris + pedagio + outrasTaxas;

    return { valorAdValorem, valorGris, pedagio, outrasTaxas, totalTaxas };
  }

  function formatarMoeda(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function setTxt(ids, texto) {
    const el = findElement(ids);
    if (el) el.textContent = texto;
  }

  function exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete) {
    setTxt(['res-cliente'], entradas.nomeCliente || '---');
    setTxt(['res-rota'], `${entradas.cidadeOrigem || '---'} ➔ ${entradas.cidadeDestino || '---'}`);
    setTxt(['res-distancia'], `${entradas.distancia} km`);
    setTxt(['res-mercadoria'], `${entradas.descricaoCarga || '---'} (${entradas.quantidade} vol.)`);
    setTxt(['res-valor-nf'], formatarMoeda(entradas.valorNF));

    setTxt(['res-volume'], `${cubagem.volumeTotal.toFixed(3)} m³`);
    setTxt(['res-peso-real'], `${entradas.pesoReal.toFixed(2)} kg`);
    setTxt(['res-peso-cubado'], `${cubagem.pesoCubado.toFixed(2)} kg`);
    setTxt(['res-peso-cobranca'], `${analisePeso.pesoCobranca.toFixed(2)} kg`);

    setTxt(['res-criterio-peso'], analisePeso.criterio);

    setTxt(['res-frete-peso'], formatarMoeda(freteCalculado.fretePesoBruto));
    setTxt(['res-frete-minimo-aplicado'], freteCalculado.usouFreteMinimo ? `Sim (${formatarMoeda(freteCalculado.freteAplicado)})` : 'Não');
    
    setTxt(['res-advalorem'], formatarMoeda(taxas.valorAdValorem));
    setTxt(['res-gris'], formatarMoeda(taxas.valorGris));
    setTxt(['res-pedagio'], formatarMoeda(taxas.pedagio));
    setTxt(['res-outras-taxas'], formatarMoeda(taxas.outrasTaxas));

    setTxt(['res-total-frete'], formatarMoeda(valorTotalFrete));
  }

  // GPS Opcional (Não trava caso não seja usado)
  async function buscarDistanciaGPS() {
    const orig = getTexto(['cidade-origem']);
    const dest = getTexto(['cidade-destino']);
    const inputDist = findElement(['distancia']);

    if (!orig || !dest) {
      if (statusDistancia) {
        statusDistancia.textContent = "⚠️ Informe origem e destino primeiro.";
        statusDistancia.style.color = "#c62828";
      }
      return;
    }

    if (statusDistancia) {
      statusDistancia.textContent = "⌛ Consultando GPS...";
      statusDistancia.style.color = "#0b2545";
    }

    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(orig)}&count=1&language=pt&format=json`);
      const dataOrig = await res.json();
      const resDest = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dest)}&count=1&language=pt&format=json`);
      const dataDest = await resDest.json();

      if (dataOrig.results && dataDest.results) {
        const lat1 = dataOrig.results[0].latitude;
        const lon1 = dataOrig.results[0].longitude;
        const lat2 = dataDest.results[0].latitude;
        const lon2 = dataDest.results[0].longitude;

        const resOSRM = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
        const dataOSRM = await resOSRM.json();

        if (dataOSRM.routes && dataOSRM.routes.length > 0) {
          const km = (dataOSRM.routes[0].distance / 1000).toFixed(1);
          if (inputDist) inputDist.value = km;
          if (statusDistancia) {
            statusDistancia.textContent = "✔ Distância obtida via GPS";
            statusDistancia.style.color = "#2e7d32";
          }
          executarCalculo(false);
          return;
        }
      }
      throw new Error("Rota não encontrada");
    } catch (e) {
      if (statusDistancia) {
        statusDistancia.textContent = "❌ Não foi possível buscar o GPS. Digite os km manualmente.";
        statusDistancia.style.color = "#c62828";
      }
    }
  }

  function limparFormulario() {
    const form = findElement(['frete-form']);
    if (form) form.reset();
    if (statusDistancia) statusDistancia.textContent = '';
    if (boxErros) boxErros.style.display = 'none';

    setTxt(['res-cliente'], '---');
    setTxt(['res-rota'], '---');
    setTxt(['res-distancia'], '0 km');
    setTxt(['res-mercadoria'], '---');
    setTxt(['res-valor-nf'], 'R$ 0,00');

    setTxt(['res-volume'], '0,000 m³');
    setTxt(['res-peso-real'], '0,00 kg');
    setTxt(['res-peso-cubado'], '0,00 kg');
    setTxt(['res-peso-cobranca'], '0,00 kg');

    setTxt(['res-criterio-peso'], 'Aguardando dados...');

    setTxt(['res-frete-peso'], 'R$ 0,00');
    setTxt(['res-frete-minimo-aplicado'], 'Não');
    setTxt(['res-advalorem'], 'R$ 0,00');
    setTxt(['res-gris'], 'R$ 0,00');
    setTxt(['res-pedagio'], 'R$ 0,00');
    setTxt(['res-outras-taxas'], 'R$ 0,00');
    setTxt(['res-total-frete'], 'R$ 0,00');
  }
});
