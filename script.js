document.addEventListener('DOMContentLoaded', () => {
  const selectModal = document.getElementById('modal');
  const customGroup = document.getElementById('custom-fator-group');
  const btnCalcular = document.getElementById('btn-calcular');
  const alertBox = document.getElementById('alert-proibido');

  const CAPACIDADE_MAX_VEICULO_KG = 12000;

  selectModal.addEventListener('change', () => {
    if (selectModal.value === 'custom') {
      customGroup.style.display = 'block';
    } else {
      customGroup.style.display = 'none';
    }
  });

  function obterTarifaKm(distanciaIda) {
    if (distanciaIda <= 50) return 6.00;
    if (distanciaIda <= 100) return 5.50;
    if (distanciaIda <= 200) return 5.00;
    if (distanciaIda <= 300) return 4.50;
    if (distanciaIda <= 500) return 4.00;
    if (distanciaIda <= 700) return 3.70;
    if (distanciaIda <= 1000) return 3.40;
    return 3.00;
  }

  btnCalcular.addEventListener('click', () => {

    const nomeCliente = document.getElementById('nome-cliente').value.trim() || 'Não informado';
    const descricaoCarga = document.getElementById('descricao-carga').value.trim() || 'Não informada';
    const categoriaCarga = document.getElementById('categoria-carga').value;

    if (categoriaCarga === 'proibida' || categoriaCarga === 'restrita') {
      alertBox.style.display = 'block';
    } else {
      alertBox.style.display = 'none';
    }

    const origem = document.getElementById('origem').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const distanciaIda = parseFloat(document.getElementById('distancia-ida').value) || 0;

    const comprimento = parseFloat(document.getElementById('comprimento').value) || 0;
    const largura = parseFloat(document.getElementById('largura').value) || 0;
    const altura = parseFloat(document.getElementById('altura').value) || 0;
    const quantidade = parseInt(document.getElementById('quantidade').value) || 0;
    const pesoBrutoTotal = parseFloat(document.getElementById('peso-bruto-total').value) || 0;

    let fatorCubagem = 0;
    if (selectModal.value === 'custom') {
      fatorCubagem = parseFloat(document.getElementById('fator-custom').value) || 0;
    } else {
      fatorCubagem = parseFloat(selectModal.value);
    }

    if (!distanciaIda || distanciaIda <= 0) {
      alert('Por favor, preencha a distância de ida (km).');
      return;
    }

    if (comprimento <= 0 || largura <= 0 || altura <= 0 || quantidade <= 0) {
      alert('Por favor, preencha Comprimento, Largura, Altura e Quantidade corretamente.');
      return;
    }

    const volumeUnitario = comprimento * largura * altura;
    const volumeTotal = volumeUnitario * quantidade;

    const pesoCubadoUnitario = volumeUnitario * fatorCubagem;
    const pesoCubadoTotal = pesoCubadoUnitario * quantidade;

    const pesoTaxado = Math.max(pesoBrutoTotal, pesoCubadoTotal);

    const numVeiculos = Math.max(1, Math.ceil(pesoTaxado / CAPACIDADE_MAX_VEICULO_KG));

    const distanciaTotalPorViagem = distanciaIda * 2;
    const tarifaPorKm = obterTarifaKm(distanciaIda);
    const custoDistanciaBase = distanciaTotalPorViagem * tarifaPorKm;

    const custoFreteTotal = custoDistanciaBase * numVeiculos;

    document.getElementById('res-cliente').textContent = nomeCliente;
    document.getElementById('res-material').textContent = descricaoCarga;
    
    const rotaTexto = (origem && destino) ? `${origem} ➔ ${destino}` : 'Rota não informada';
    document.getElementById('res-rota').textContent = rotaTexto;
    document.getElementById('res-distancia').textContent = `${distanciaIda} km / ${distanciaTotalPorViagem} km (por viagem)`;
    document.getElementById('res-tarifa-km').textContent = `R$ ${tarifaPorKm.toFixed(2).replace('.', ',')} / km`;

    document.getElementById('res-volume').textContent = `${volumeUnitario.toFixed(3)} m³ / ${volumeTotal.toFixed(2)} m³`;
    document.getElementById('res-peso-cubado-total').textContent = `${pesoCubadoTotal.toFixed(2)} kg`;
    document.getElementById('res-peso-taxado').textContent = `${pesoTaxado.toFixed(2)} kg`;
    document.getElementById('res-veiculos').textContent = `${numVeiculos} viagem(ns) / veículo(s)`;

    document.getElementById('res-custo-frete').textContent = custoFreteTotal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    const taxationText = document.getElementById('taxation-text');
    let textoRegra = `Carga taxada pelo <strong>PESO CUBADO (${pesoCubadoTotal.toFixed(2)} kg)</strong> devido ao volume de ${volumeTotal.toFixed(2)} m³.<br>`;
    
    if (numVeiculos > 1) {
      textoRegra += `Devido ao volume/peso elevado, o transporte exigirá <strong>${numVeiculos} veículos/viagens</strong>. O valor do frete foi calculado considerando o custo de R$ ${custoDistanciaBase.toFixed(2)} x ${numVeiculos} viagens.`;
    } else {
      textoRegra += `A carga cabe em 1 veículo padrão. Custo calculado em R$ ${tarifaPorKm.toFixed(2)}/km sobre a distância total (Ida+Volta).`;
    }

    taxationText.innerHTML = textoRegra;
  });
});