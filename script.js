document.addEventListener('DOMContentLoaded', () => {
  const FATOR_CUBAGEM_RODOVIARIO = 300;

  // 1. Libera todos os campos numéricos da página para aceitarem qualquer precisão decimal (ex: 0.3012)
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.setAttribute('step', 'any');
  });

  // Função auxiliar flexível para encontrar elementos por múltiplos IDs possíveis
  function findElement(possibleIds) {
    const list = Array.isArray(possibleIds) ? possibleIds : [possibleIds];
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  // Converte texto em número tratando vírgulas e aceitando decimais longos
  function parseNum(possibleIds) {
    const el = findElement(possibleIds);
    if (!el || el.value === null || el.value === undefined || el.value === '') return 0;
    const valLimpo = el.value.toString().replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(valLimpo);
    return isNaN(num) ? 0 : num;
  }

  function getTexto(possibleIds) {
    const el = findElement(possibleIds);
    return el ? el.value.trim() : '';
  }

  // 2. ESCUTA GLOBAL: Captura qualquer alteração em QUALQUER campo da tela em tempo real
  // Funciona ao digitar, ao colar ou ao clicar nas setas de subir/descer números
  document.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      executarCalculoCotacao(false);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      executarCalculoCotacao(false);
    }
  });

  // Mapeamento dos Botões da Tela
  const btnCalcular = findElement(['btn-calcular', 'btnCalcular']);
  const btnLimpar = findElement(['btn-limpar', 'btnLimpar']);
  const btnTheme = findElement(['btn-theme', 'btnTheme']);
  const btnBuscarDistancia = findElement(['btn-buscar-distancia', 'btnBuscarDistancia']);
  const boxErros = findElement(['box-erros', 'boxErros']);
  const statusDistancia = findElement(['status-distancia', 'statusDistancia']);

  if (btnBuscarDistancia) btnBuscarDistancia.addEventListener('click', buscarDistanciaGPS);

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      btnTheme.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Escuro';
    });
  }

  if (btnCalcular) btnCalcular.addEventListener('click', () => executarCalculoCotacao(true));
  if (btnLimpar) btnLimpar.addEventListener('click', limparFormulario);

  // Leitura blindada de todas as seções (com fallback para variações de IDs no HTML)
  function lerEntradasFormulario() {
    return {
      nomeCliente: getTexto(['nome-cliente', 'nome_cliente', 'cliente']),
      cidadeOrigem: getTexto(['cidade-origem', 'cidade_origem', 'origem']),
      cidadeDestino: getTexto(['cidade-destino', 'cidade_destino', 'destino']),
      distancia: parseNum(['distancia', 'distancia-km', 'distancia_km']),
      descricaoCarga: getTexto(['descricao-carga', 'descricao_carga', 'mercadoria']),
      valorNF: parseNum(['valor-nf', 'valor_nf', 'valornf', 'valor-nota']),
      quantidade: parseNum(['quantidade-volumes', 'quantidade_volumes', 'quantidade', 'volumes']) || 1,
      pesoReal: parseNum(['peso-real', 'peso_real', 'pesoreal', 'peso']),
      comprimento: parseNum(['comprimento', 'comp']),
      largura: parseNum(['largura', 'larg']),
      altura: parseNum(['altura', 'alt']),

      // SEÇÃO 3: PARÂMETROS E TAXAS ADICIONAIS
      tarifaKg: parseNum(['tarifa-kg', 'tarifa_kg', 'tarifakg', 'tarifa']),
      freteMinimo: parseNum(['frete-minimo', 'frete_minimo', 'freteminimo']),
      percAdValorem: parseNum(['perc-advalorem', 'perc_advalorem', 'advalorem', 'ad-valorem']),
      percGris: parseNum(['perc-gris', 'perc_gris', 'gris']),
      pedagio: parseNum(['pedagio', 'valor-pedagio', 'pedagio_valor']),
      outrasTaxas: parseNum(['outras-taxas', 'outras_taxas', 'outrastaxas', 'taxas-adicionais'])
    };
  }

  // Execução do Cálculo e Atualização Instantânea da Tabela
  function executarCalculoCotacao(mostrarErros = true) {
    if (mostrarErros && boxErros) {
      boxErros.style.display = 'none';
      boxErros.innerHTML = '';
    }

    const entradas = lerEntradasFormulario();

    if (mostrarErros) {
      const erros = validarEntradas(entradas);
      if (erros.length > 0) {
        exibirErrosValidacao(erros);
        return;
      }
    }

    const cubagem = calcularCubagem(entradas.comprimento, entradas.largura, entradas.altura, entradas.quantidade);
    const analisePeso = determinarPesoCobranca(entradas.pesoReal, cubagem.pesoCubado);
    
    const freteCalculado = calcularFretePeso(analisePeso.pesoCobranca, entradas.tarifaKg, entradas.distancia, entradas.freteMinimo);
    const taxas = calcularTaxasAdicionais(entradas.valorNF, entradas.percAdValorem, entradas.percGris, entradas.pedagio, entradas.outrasTaxas);

    const valorTotalFrete = freteCalculado.freteAplicado + taxas.totalTaxas;

    exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete);
  }

  function validarEntradas(dados) {
    const erros = [];
    if (!dados.nomeCliente) erros.push('Preencha o Nome / Razão Social do cliente.');
    if (!dados.cidadeOrigem) erros.push('Informe a cidade de Origem.');
    if (!dados.cidadeDestino) erros.push('Informe a cidade de Destino.');
    if (dados.distancia <= 0) erros.push('Informe uma distância em km válida.');
    if (dados.valorNF <= 0) erros.push('O valor da Nota Fiscal deve ser maior que zero.');
    if (dados.pesoReal <= 0) erros.push('O peso real da carga deve ser maior que zero.');
    if (dados.comprimento <= 0 || dados.largura <= 0 || dados.altura <= 0) {
      erros.push('Informe dimensões válidas (comprimento, largura e altura).');
    }
    if (dados.tarifaKg <= 0) erros.push('A tarifa base por kg deve ser maior que zero.');
    return erros;
  }

  function exibirErrosValidacao(erros) {
    if (!boxErros) return;
    let html = '<strong>Por favor, corrija os seguintes problemas:</strong><ul>';
    erros.forEach(erro => html += `<li>${erro}</li>`);
    html += '</ul>';
    boxErros.innerHTML = html;
    boxErros.style.display = 'block';
  }

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

  function setTxt(possibleIds, texto) {
    const el = findElement(possibleIds);
    if (el) el.textContent = texto;
  }

  function exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete) {
    setTxt(['res-cliente', 'res_cliente'], entradas.nomeCliente || '---');
    setTxt(['res-rota', 'res_rota'], `${entradas.cidadeOrigem || '---'} ➔ ${entradas.cidadeDestino || '---'}`);
    setTxt(['res-distancia', 'res_distancia'], `${entradas.distancia} km`);
    setTxt(['res-mercadoria', 'res_mercadoria'], `${entradas.descricaoCarga || '---'} (${entradas.quantidade} vol.)`);
    setTxt(['res-valor-nf', 'res_valor_nf'], formatarMoeda(entradas.valorNF));

    setTxt(['res-volume', 'res_volume'], `${cubagem.volumeTotal.toFixed(3)} m³`);
    setTxt(['res-peso-real', 'res_peso_real'], `${entradas.pesoReal.toFixed(2)} kg`);
    setTxt(['res-peso-cubado', 'res_peso_cubado'], `${cubagem.pesoCubado.toFixed(2)} kg`);
    setTxt(['res-peso-cobranca', 'res-peso-cobrança', 'res_peso_cobranca'], `${analisePeso.pesoCobranca.toFixed(2)} kg`);

    setTxt(['res-criterio-peso', 'res_criterio_peso'], `Critério Aplicado: ${analisePeso.criterio}`);

    setTxt(['res-frete-peso', 'res_frete_peso'], formatarMoeda(freteCalculado.fretePesoBruto));
    setTxt(['res-frete-minimo-aplicado', 'res_frete_minimo_aplicado'], freteCalculado.usouFreteMinimo ? `Sim (${formatarMoeda(freteCalculado.freteAplicado)})` : 'Não');
    
    setTxt(['res-advalorem', 'res_advalorem', 'res-ad-valorem'], formatarMoeda(taxas.valorAdValorem));
    setTxt(['res-gris', 'res_gris'], formatarMoeda(taxas.valorGris));
    setTxt(['res-pedagio', 'res_pedagio'], formatarMoeda(taxas.pedagio));
    setTxt(['res-outras-taxas', 'res_outras_taxas'], formatarMoeda(taxas.outrasTaxas));

    setTxt(['res-total-frete', 'res_total_frete'], formatarMoeda(valorTotalFrete));
  }

  // BUSCA GPS
  async function buscarCoordenadas(cidade) {
    const nome = cidade.trim();
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=5&language=pt&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const br = data.results.find(r => r.country_code === 'BR') || data.results[0];
          return { lat: parseFloat(br.latitude), lon: parseFloat(br.longitude) };
        }
      }
    } catch (e) {}

    try {
      const q = nome.toLowerCase().includes('brasil') ? nome : `${nome}, Brasil`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
      }
    } catch (e) {}

    throw new Error(`Não foi possível localizar a cidade "${cidade}".`);
  }

  async function buscarDistanciaGPS() {
    const orig = getTexto(['cidade-origem', 'cidade_origem']);
    const dest = getTexto(['cidade-destino', 'cidade_destino']);
    const inputDistancia = findElement(['distancia', 'distancia-km']);

    if (!orig || !dest) {
      if (statusDistancia) {
        statusDistancia.textContent = "⚠️ Informe origem e destino";
        statusDistancia.style.color = "#c62828";
      }
      return;
    }

    if (statusDistancia) {
      statusDistancia.textContent = "⌛ Consultando GPS...";
      statusDistancia.style.color = "#0b2545";
    }

    try {
      const cOrig = await buscarCoordenadas(orig);
      const cDest = await buscarCoordenadas(dest);

      let km = null;
      try {
        const resOSRM = await fetch(`https://router.project-osrm.org/route/v1/driving/${cOrig.lon},${cOrig.lat};${cDest.lon},${cDest.lat}?overview=false`);
        if (resOSRM.ok) {
          const dataOSRM = await resOSRM.json();
          if (dataOSRM.routes && dataOSRM.routes.length > 0) {
            km = (dataOSRM.routes[0].distance / 1000).toFixed(1);
            if (statusDistancia) {
              statusDistancia.textContent = "✔ Distância obtida via GPS";
              statusDistancia.style.color = "#2e7d32";
            }
          }
        }
      } catch (e) {}

      if (!km) {
        const R = 6371;
        const dLat = (cDest.lat - cOrig.lat) * Math.PI / 180;
        const dLon = (cDest.lon - cOrig.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(cOrig.lat * Math.PI / 180) * Math.cos(cDest.lat * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        km = (R * c * 1.27).toFixed(1);
        if (statusDistancia) {
          statusDistancia.textContent = "✔ Distância estimada por coordenadas";
          statusDistancia.style.color = "#2e7d32";
        }
      }

      if (inputDistancia) inputDistancia.value = km;
      executarCalculoCotacao(false);

    } catch (erro) {
      if (statusDistancia) {
        statusDistancia.textContent = `❌ ${erro.message || 'Digite a distância manualmente'}`;
        statusDistancia.style.color = "#c62828";
      }
    }
  }

  function limparFormulario() {
    const form = findElement(['frete-form', 'freteForm']);
    if (form) form.reset();
    if (statusDistancia) statusDistancia.textContent = '';
    if (boxErros) boxErros.style.display = 'none';

    setTxt(['res-cliente', 'res_cliente'], '---');
    setTxt(['res-rota', 'res_rota'], '---');
    setTxt(['res-distancia', 'res_distancia'], '0 km');
    setTxt(['res-mercadoria', 'res_mercadoria'], '---');
    setTxt(['res-valor-nf', 'res_valor_nf'], 'R$ 0,00');

    setTxt(['res-volume', 'res_volume'], '0,000 m³');
    setTxt(['res-peso-real', 'res_peso_real'], '0,00 kg');
    setTxt(['res-peso-cubado', 'res_peso_cubado'], '0,00 kg');
    setTxt(['res-peso-cobranca', 'res-peso-cobrança', 'res_peso_cobranca'], '0,00 kg');

    setTxt(['res-criterio-peso', 'res_criterio_peso'], 'Critério: Aguardando dados');

    setTxt(['res-frete-peso', 'res_frete_peso'], 'R$ 0,00');
    setTxt(['res-frete-minimo-aplicado', 'res_frete_minimo_aplicado'], 'Não');
    setTxt(['res-advalorem', 'res_advalorem'], 'R$ 0,00');
    setTxt(['res-gris', 'res_gris'], 'R$ 0,00');
    setTxt(['res-pedagio', 'res_pedagio'], 'R$ 0,00');
    setTxt(['res-outras-taxas', 'res_outras_taxas'], 'R$ 0,00');
    setTxt(['res-total-frete', 'res_total_frete'], 'R$ 0,00');
  }
});
