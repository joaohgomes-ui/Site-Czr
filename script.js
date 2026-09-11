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

  // Alternar Modo Escuro / Claro
  btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    btnTheme.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Escuro';
  });

  // Eventos de Busca de Distância via GPS
  btnBuscarDistancia.addEventListener('click', buscarDistanciaGPS);
  inputOrigem.addEventListener('blur', testarBuscaAutomatica);
  inputDestino.addEventListener('blur', testarBuscaAutomatica);

  // Executa o cálculo somente ao clicar no botão "Calcular Cotação"
  btnCalcular.addEventListener('click', executarCalculoCotacao);
  btnLimpar.addEventListener('click', limparFormulario);

  function parseNumeroUsuario(valor) {
    if (valor === null || valor === undefined) return 0;
    let str = valor.toString().trim();
    if (str === '') return 0;
    str = str.replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  function testarBuscaAutomatica() {
    if (inputOrigem.value.trim().length > 2 && inputDestino.value.trim().length > 2) {
      buscarDistanciaGPS();
    }
  }

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
      const respOrig = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(orig + ', Bahia, Brasil')}`);
      const dataOrig = await respOrig.json();

      const respDest = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest + ', Bahia, Brasil')}`);
      const dataDest = await respDest.json();

      if (!dataOrig || dataOrig.length === 0 || !dataDest || dataDest.length === 0) {
        throw new Error("Cidade não encontrada.");
      }

      const lon1 = dataOrig[0].lon;
      const lat1 = dataOrig[0].lat;
      const lon2 = dataDest[0].lon;
      const lat2 = dataDest[0].lat;

      const respRota = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
      const dataRota = await respRota.json();

      if (dataRota.routes && dataRota.routes.length > 0) {
        const metros = dataRota.routes[0].distance;
        const km = (metros / 1000).toFixed(1);
        
        inputDistancia.value = km;
        statusDistancia.textContent = "✔ Distância obtida via GPS";
        statusDistancia.style.color = "#2e7d32";
      } else {
        throw new Error("Não foi possível calcular a rota.");
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
      distancia: parseNumeroUsuario(inputDistancia.value),
      descricaoCarga: document.getElementById('descricao-carga').value.trim(),
      valorNF: parseNumeroUsuario(document.getElementById('valor-nf').value),
      quantidade: parseNumeroUsuario(document.getElementById('quantidade-volumes').value),
      pesoReal: parseNumeroUsuario(document.getElementById('peso-real').value),
      comprimento: parseNumeroUsuario(document.getElementById('comprimento').value),
      largura: parseNumeroUsuario(document.getElementById('largura').value),
      altura: parseNumeroUsuario(document.getElementById('altura').value),
      tarifaKg: parseNumeroUsuario(document.getElementById('tarifa-kg').value),
      freteMinimo: parseNumeroUsuario(document.getElementById('frete-minimo').value),
      percAdValorem: parseNumeroUsuario(document.getElementById('perc-advalorem').value),
      percGris: parseNumeroUsuario(document.getElementById('perc-gris').value),
      pedagio: parseNumeroUsuario(document.getElementById('pedagio').value),
      outrasTaxas: parseNumeroUsuario(document.getElementById('outras-taxas').value)
    };
  }

  function validarEntradas(dados) {
    const erros = [];

    if (!dados.nomeCliente) erros.push('Preencha o Nome / Razão Social do cliente.');
    if (!dados.cidadeOrigem) erros.push('Informe a cidade de Origem.');
    if (!dados.cidadeDestino) erros.push('Informe a cidade de Destino.');
    if (!dados.descricaoCarga) erros.push('Informe a descrição da mercadoria.');
    if (dados.distancia <= 0) erros.push('Informe uma distância em km válida.');
    if (dados.valorNF <= 0) erros.push('O valor da Nota Fiscal deve ser maior que zero.');
    if (dados.quantidade < 1) erros.push('A quantidade de volumes deve ser no mínimo 1.');
    if (dados.pesoReal <= 0) erros.push('O peso real da carga deve ser maior que zero.');
    if (dados.comprimento <= 0) erros.push('Comprimento deve ser maior que zero.');
    if (dados.largura <= 0) erros.push('Largura deve ser maior que zero.');
    if (dados.altura <= 0) erros.push('Altura deve ser maior que zero.');
    if (dados.tarifaKg <= 0) erros.push('A tarifa base por kg deve ser maior que zero.');

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

    if (freteMinimo > 0 && fretePesoBruto < freteMinimo) {
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

    // Exibe o valor correto aplicado no frete-peso
    if (freteCalculado.usouFreteMinimo) {
      document.getElementById('res-frete-peso').textContent = formatarMoeda(freteCalculado.freteAplicado);
      document.getElementById('res-frete-minimo-aplicado').textContent = `Sim (Calculado: ${formatarMoeda(freteCalculado.fretePesoBruto)})`;
    } else {
      document.getElementById('res-frete-peso').textContent = formatarMoeda(freteCalculado.fretePesoBruto);
      document.getElementById('res-frete-minimo-aplicado').textContent = 'Não';
    }

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
