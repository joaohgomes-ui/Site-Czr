document.addEventListener('DOMContentLoaded', () => {
  const FATOR_CUBAGEM_RODOVIARIO = 300;

  // Elementos do DOM
  const inputOrigem = document.getElementById('cidade-origem');
  const inputDestino = document.getElementById('cidade-destino');
  const inputDistancia = document.getElementById('distancia');
  const btnBuscarDistancia = document.getElementById('btn-buscar-distancia');
  const statusDistancia = document.getElementById('status-distancia');

  const btnCalcular = document.getElementById('btn-calcular');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnTheme = document.getElementById('btn-theme');
  const boxErros = document.getElementById('box-erros');

  // Eventos de Busca de Distância
  btnBuscarDistancia.addEventListener('click', buscarDistanciaGPS);
  inputOrigem.addEventListener('blur', testarBuscaAutomatica);
  inputDestino.addEventListener('blur', testarBuscaAutomatica);

  // Modo escuro
  btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    btnTheme.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Escuro';
  });

  btnCalcular.addEventListener('click', executarCalculoCotacao);
  btnLimpar.addEventListener('click', limparFormulario);

  function testarBuscaAutomatica() {
    if (inputOrigem.value.trim().length > 2 && inputDestino.value.trim().length > 2) {
      buscarDistanciaGPS();
    }
  }

  // Integração com Nominatim (Geocoding) e OSRM (Roteamento)
  async function buscarDistanciaGPS() {
    const orig = inputOrigem.value.trim();
    const dest = inputDestino.value.trim();

    if (!orig || !dest) {
      statusDistancia.textContent = "(Informe a origem e o destino)";
      statusDistancia.style.color = "#c62828";
      return;
    }

    statusDistancia.textContent = "⌛ Buscando rota via GPS...";
    statusDistancia.style.color = "#0b2545";

    try {
      // 1. Busca coordenadas geográficas da Cidade de Origem
      const respOrig = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(orig + ', Bahia, Brasil')}`);
      const dataOrig = await respOrig.json();

      // 2. Busca coordenadas geográficas da Cidade de Destino
      const respDest = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest + ', Bahia, Brasil')}`);
      const dataDest = await respDest.json();

      if (!dataOrig || dataOrig.length === 0) {
        throw new Error(`Cidade de origem "${orig}" não foi localizada.`);
      }
      if (!dataDest || dataDest.length === 0) {
        throw new Error(`Cidade de destino "${dest}" não foi localizada.`);
      }

      const lon1 = dataOrig[0].lon;
      const lat1 = dataOrig[0].lat;
      const lon2 = dataDest[0].lon;
      const lat2 = dataDest[0].lat;

      // 3. Consulta a API OSRM para calcular a distância rodoviária exata
      const respRota = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
      const dataRota = await respRota.json();

      if (dataRota.routes && dataRota.routes.length > 0) {
        const metros = dataRota.routes[0].distance;
        const km = (metros / 1000).toFixed(1);
        
        inputDistancia.value = km;
        statusDistancia.textContent = "✔ Distância obtida via GPS";
        statusDistancia.style.color = "#2e7d32";
      } else {
        throw new Error("Não foi possível calcular a rota rodoviária entre essas cidades.");
      }

    } catch (erro) {
      console.error(erro);
      statusDistancia.textContent = "❌ Erro ao buscar GPS. Digite a distância manualmente.";
      statusDistancia.style.color = "#c62828";
    }
  }

  function executarCalculoCotacao() {
    boxErros.style.display = 'none';
    boxErros.innerHTML = '';

    const entradas = lerEntradasFormulario();

    const erros = validarEntradas(entradas);
    if (erros.length > 0) {
      exibirErrosValidacao(erros);
      return;
    }

    const cubagem = calcularCubagem(entradas.comprimento, entradas.largura, entradas.altura, entradas.quantidade);
    const analisePeso = determinarPesoCobranca(entradas.pesoReal, cubagem.pesoCubado);
    const freteCalculado = calcularFretePeso(analisePeso.pesoCobranca, entradas.tarifaKg, entradas.freteMinimo);
    const taxas = calcularTaxasAdicionais(entradas.valorNF, entradas.percAdValorem, entradas.percGris, entradas.pedagio, entradas.outrasTaxas);

    const valorTotalFrete = freteCalculado.freteAplicado + taxas.totalTaxas;

    exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete);
  }

  function lerEntradasFormulario() {
    return {
      nomeCliente: document.getElementById('nome-cliente').value.trim(),
      cidadeOrigem: inputOrigem.value.trim(),
      cidadeDestino: inputDestino.value.trim(),
      distancia: parseFloat(inputDistancia.value),
      descricaoCarga: document.getElementById('descricao-carga').value.trim(),
      valorNF: parseFloat(document.getElementById('valor-nf').value),
      quantidade: parseInt(document.getElementById('quantidade-volumes').value),
      pesoReal: parseFloat(document.getElementById('peso-real').value),
      comprimento: parseFloat(document.getElementById('comprimento').value),
      largura: parseFloat(document.getElementById('largura').value),
      altura: parseFloat(document.getElementById('altura').value),
      tarifaKg: parseFloat(document.getElementById('tarifa-kg').value),
      freteMinimo: parseFloat(document.getElementById('frete-minimo').value) || 0,
      percAdValorem: parseFloat(document.getElementById('perc-advalorem').value) || 0,
      percGris: parseFloat(document.getElementById('perc-gris').value) || 0,
      pedagio: parseFloat(document.getElementById('pedagio').value) || 0,
      outrasTaxas: parseFloat(document.getElementById('outras-taxas').value) || 0
    };
  }

  function validarEntradas(dados) {
    const erros = [];

    if (!dados.nomeCliente) erros.push('Preencha o Nome / Razão Social do cliente.');
    if (!dados.cidadeOrigem) erros.push('Informe a cidade de Origem.');
    if (!dados.cidadeDestino) erros.push('Informe a cidade de Destino.');
    if (!dados.descricaoCarga) erros.push('Informe a descrição da mercadoria.');
    if (isNaN(dados.distancia) || dados.distancia <= 0) erros.push('Informe uma distância em km válida.');
    if (isNaN(dados.valorNF) || dados.valorNF <= 0) erros.push('O valor da Nota Fiscal deve ser maior que zero.');
    if (isNaN(dados.quantidade) || dados.quantidade <= 0) erros.push('A quantidade de volumes deve ser no mínimo 1.');
    if (isNaN(dados.pesoReal) || dados.pesoReal <= 0) erros.push('O peso real da carga deve ser maior que zero.');
    if (isNaN(dados.comprimento) || dados.comprimento <= 0) erros.push('Comprimento deve ser maior que zero.');
    if (isNaN(dados.largura) || dados.largura <= 0) erros.push('Largura deve ser maior que zero.');
    if (isNaN(dados.altura) || dados.altura <= 0) erros.push('Altura deve ser maior que zero.');
    if (isNaN(dados.tarifaKg) || dados.tarifaKg <= 0) erros.push('A tarifa base por kg deve ser maior que zero.');

    return erros;
  }

  function exibirErrosValidacao(erros) {
    let html = '<strong>Por favor, corrija os seguintes problemas para calcular:</strong><ul>';
    erros.forEach(erro => {
      html += `<li>${erro}</li>`;
    });
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
      return {
        pesoCobranca: pesoCubado,
        criterio: 'PESO CUBADO (ocupação de espaço)'
      };
    } else {
      return {
        pesoCobranca: pesoReal,
        criterio: 'PESO REAL (peso físico)'
      };
    }
  }

  function calcularFretePeso(pesoCobranca, tarifaKg, freteMinimo) {
    const fretePesoBruto = pesoCobranca * tarifaKg;
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
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function exibirMemoriaDeCalculo(entradas, cubagem, analisePeso, freteCalculado, taxas, valorTotalFrete) {
    document.getElementById('res-cliente').textContent = entradas.nomeCliente;
    document.getElementById('res-rota').textContent = `${entradas.cidadeOrigem} ➔ ${entradas.cidadeDestino}`;
    document.getElementById('res-distancia').textContent = `${entradas.distancia} km`;
    document.getElementById('res-mercadoria').textContent = `${entradas.descricaoCarga} (${entradas.quantidade} vol.)`;
    document.getElementById('res-valor-nf').textContent = formatarMoeda(entradas.valorNF);

    document.getElementById('res-volume').textContent = `${cubagem.volumeTotal.toFixed(3)} m³`;
    document.getElementById('res-peso-real').textContent = `${entradas.pesoReal.toFixed(2)} kg`;
    document.getElementById('res-peso-cubado').textContent = `${cubagem.pesoCubado.toFixed(2)} kg`;
    document.getElementById('res-peso-cobrança').textContent = `${analisePeso.pesoCobranca.toFixed(2)} kg`;
    document.getElementById('res-criterio-peso').textContent = `Critério Aplicado: ${analisePeso.criterio}`;

    document.getElementById('res-frete-peso').textContent = formatarMoeda(freteCalculado.fretePesoBruto);
    document.getElementById('res-frete-minimo-aplicado').textContent = freteCalculado.usouFreteMinimo ? `Sim (${formatarMoeda(freteCalculado.freteAplicado)})` : 'Não';
    
    document.getElementById('res-advalorem').textContent = formatarMoeda(taxas.valorAdValorem);
    document.getElementById('res-gris').textContent = formatarMoeda(taxas.valorGris);
    document.getElementById('res-pedagio').textContent = formatarMoeda(taxas.pedagio);
    document.getElementById('res-outras-taxas').textContent = formatarMoeda(taxas.outrasTaxas);

    document.getElementById('res-total-frete').textContent = formatarMoeda(valorTotalFrete);
  }

  function limparFormulario() {
    document.getElementById('frete-form').reset();
    statusDistancia.textContent = '';
    boxErros.style.display = 'none';

    document.getElementById('res-cliente').textContent = '---';
    document.getElementById('res-rota').textContent = '---';
    document.getElementById('res-distancia').textContent = '0 km';
    document.getElementById('res-mercadoria').textContent = '---';
    document.getElementById('res-valor-nf').textContent = 'R$ 0,00';

    document.getElementById('res-volume').textContent = '0,000 m³';
    document.getElementById('res-peso-real').textContent = '0,00 kg';
    document.getElementById('res-peso-cubado').textContent = '0,00 kg';
    document.getElementById('res-peso-cobrança').textContent = '0,00 kg';
    document.getElementById('res-criterio-peso').textContent = 'Critério: Aguardando dados';

    document.getElementById('res-frete-peso').textContent = 'R$ 0,00';
    document.getElementById('res-frete-minimo-aplicado').textContent = 'Não';
    document.getElementById('res-advalorem').textContent = 'R$ 0,00';
    document.getElementById('res-gris').textContent = 'R$ 0,00';
    document.getElementById('res-pedagio').textContent = 'R$ 0,00';
    document.getElementById('res-outras-taxas').textContent = 'R$ 0,00';
    document.getElementById('res-total-frete').textContent = 'R$ 0,00';
  }
});