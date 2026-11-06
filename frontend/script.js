const API_URL = 'https://tiger-game.onrender.com/api';
let apostaAtual = 1.00;
let depositoTemp = 0;
const EMOJIS = ['🐯', '🏺', '🟢', '🧧', '🪙'];

function alterarAposta(v) {
  apostaAtual = Math.max(0.50, apostaAtual + v);
  document.getElementById('aposta-display').innerText = `R$ ${apostaAtual.toFixed(2).replace('.', ',')}`;
}

function abrirModal(id) { document.getElementById(id).classList.add('active'); }
function fecharModal(id) { document.getElementById(id).classList.remove('active'); }

async function girar() {
  const btn = document.getElementById('btn-spin');
  const banner = document.getElementById('banner-text');
  btn.disabled = true;
  banner.innerText = "Girando os Rolos da Sorte...";
  document.getElementById('win-display').innerText = 'R$ 0,00';

  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`c${r}${c}`);
      cell.classList.remove('winner');
      cell.classList.add('spinning');
      cells.push(cell);
    }
  }

  const anim = setInterval(() => {
    cells.forEach(c => {
      const wrapper = c.querySelector('.symbol-wrapper');
      if (wrapper) wrapper.innerText = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    });
  }, 60);

  try {
    const res = await fetch(`${API_URL}/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', aposta: apostaAtual })
    });

    const data = await res.json();

    setTimeout(() => {
      clearInterval(anim);
      cells.forEach(c => c.classList.remove('spinning'));

      if (res.ok) {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            document.getElementById(`c${r}${c}`).querySelector('.symbol-wrapper').innerText = data.matriz[r][c].emoji;
          }
        }

        document.getElementById('saldo').innerText = `R$ ${data.novoSaldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('win-display').innerText = `R$ ${data.premio.toFixed(2).replace('.', ',')}`;

        if (data.premio > 0) {
          banner.innerText = `🎉 GRAND WIN! Ganho de R$ ${data.premio.toFixed(2).replace('.', ',')}!`;
          cells.forEach(c => c.classList.add('winner'));
        } else {
          banner.innerText = "Tente novamente na próxima rodada!";
        }
      } else {
        banner.innerText = data.error || 'Erro no giro';
      }
      btn.disabled = false;
    }, 1100);

  } catch (err) {
    clearInterval(anim);
    cells.forEach(c => c.classList.remove('spinning'));
    banner.innerText = 'Erro de conexão com o servidor';
    btn.disabled = false;
  }
}

async function gerarPix() {
  const val = parseFloat(document.getElementById('dep-val').value);
  try {
    const res = await fetch(`${API_URL}/deposit/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', valor: val })
    });
    const data = await res.json();

    if (res.ok) {
      depositoTemp = data.valor;
      document.getElementById('qr-img').src = data.qrCodeUrl;
      document.getElementById('pix-code').value = data.pixCopiaECola;
      document.getElementById('pix-result').classList.remove('hidden');
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao gerar PIX');
  }
}

function copiarPix() {
  const input = document.getElementById('pix-code');
  input.select();
  document.execCommand('copy');
  alert('Chave PIX copiada para a área de transferência!');
}

async function simularPagamento() {
  try {
    const res = await fetch(`${API_URL}/deposit/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', valor: depositoTemp })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('saldo').innerText = `R$ ${data.novoSaldo.toFixed(2).replace('.', ',')}`;
      alert(`🎉 Depósito de R$ ${depositoTemp.toFixed(2)} creditado com sucesso!`);
      fecharModal('modal-deposit');
    }
  } catch (err) {
    alert('Erro ao confirmar pagamento');
  }
}

async function solicitarSaque() {
  const val = parseFloat(document.getElementById('saque-val').value);
  const chave = document.getElementById('saque-chave').value;

  try {
    const res = await fetch(`${API_URL}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', valor: val, chavePix: chave })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('saldo').innerText = `R$ ${data.novoSaldo.toFixed(2).replace('.', ',')}`;
      alert(data.message);
      fecharModal('modal-withdraw');
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao solicitar saque');
  }
}
