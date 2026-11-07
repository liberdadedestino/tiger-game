const API_URL = 'https://tiger-game.onrender.com/api';
let usuarioAtual = JSON.parse(localStorage.getItem('user_tigrinho')) || null;
let apostaAtual = 1.00;
let transactionPollInterval = null;
const EMOJIS = ['🐯', '🎰', '💎', '🍒', '🪙', '🧧'];

document.addEventListener('DOMContentLoaded', () => {
  if (usuarioAtual) {
    atualizarUIUsuario();
    atualizarSaldo();
  } else {
    abrirModal('modal-auth');
  }
});

function abrirModal(id) { document.getElementById(id).classList.add('active'); }
function fecharModal(id) { 
  document.getElementById(id).classList.remove('active');
  if (transactionPollInterval) clearInterval(transactionPollInterval);
}

function alterarAposta(v) {
  apostaAtual = Math.max(1.00, apostaAtual + v);
  document.getElementById('aposta-display').innerText = `R$ ${apostaAtual.toFixed(2).replace('.', ',')}`;
}

async function loginSocial(provedor) {
  const socialId = `${provedor.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`;
  const nomeUsuario = `Jogador ${provedor}`;
  
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: socialId, nome: nomeUsuario, provedor: provedor })
    });
    const data = await res.json();

    if (res.ok) {
      usuarioAtual = data;
      localStorage.setItem('user_tigrinho', JSON.stringify(data));
      atualizarUIUsuario();
      fecharModal('modal-auth');
      document.getElementById('banner-text').innerText = `Bem-vindo (${provedor}), ${usuarioAtual.nome}! Faça sua aposta.`;
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('Erro de conexão ao autenticar');
  }
}

function atualizarUIUsuario() {
  if (usuarioAtual) {
    document.getElementById('user-display-name').innerText = usuarioAtual.nome;
    document.getElementById('saldo').innerText = `R$ ${parseFloat(usuarioAtual.saldo).toFixed(2).replace('.', ',')}`;
  }
}

async function atualizarSaldo() {
  if (!usuarioAtual) return;
  try {
    const res = await fetch(`${API_URL}/user/balance/${usuarioAtual.userId}`);
    const data = await res.json();
    if (res.ok) {
      usuarioAtual.saldo = data.saldo;
      localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
      atualizarUIUsuario();
    }
  } catch (e) {}
}

async function girar() {
  if (!usuarioAtual) {
    abrirModal('modal-auth');
    return;
  }

  const btn = document.getElementById('btn-spin');
  const banner = document.getElementById('banner-text');
  btn.disabled = true;
  banner.innerText = "Girando os slots... Sorte vindo!";
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
      body: JSON.stringify({ userId: usuarioAtual.userId, aposta: apostaAtual })
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

        usuarioAtual.saldo = data.novoSaldo;
        localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
        atualizarUIUsuario();

        document.getElementById('win-display').innerText = `R$ ${data.premio.toFixed(2).replace('.', ',')}`;

        if (data.premio > 0) {
          banner.innerText = `🎉 VEGAS WIN! Prêmio de R$ ${data.premio.toFixed(2).replace('.', ',')}!`;
          cells.forEach(c => c.classList.add('winner'));
        } else {
          banner.innerText = "Tente novamente na próxima rodada!";
        }
      } else {
        banner.innerText = data.error || 'Erro ao processar aposta';
      }
      btn.disabled = false;
    }, 4000);

  } catch (err) {
    clearInterval(anim);
    cells.forEach(c => c.classList.remove('spinning'));
    banner.innerText = 'Erro de conexão com o servidor';
    btn.disabled = false;
  }
}

async function gerarPix() {
  if (!usuarioAtual) {
    abrirModal('modal-auth');
    return;
  }

  const val = parseFloat(document.getElementById('dep-val').value);
  if (val < 5.00) {
    alert('O valor mínimo de depósito é R$ 5,00');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/deposit/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: usuarioAtual.userId, valor: val })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('qr-img').src = data.qrCodeUrl;
      document.getElementById('pix-code').value = data.pixCopiaECola;
      document.getElementById('pix-result').classList.remove('hidden');

      if (transactionPollInterval) clearInterval(transactionPollInterval);
      transactionPollInterval = setInterval(() => checarStatusPix(data.transactionId), 3000);
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao gerar PIX');
  }
}

async function checarStatusPix(transactionId) {
  if (!transactionId) return;
  try {
    const res = await fetch(`${API_URL}/deposit/status/${transactionId}`);
    const data = await res.json();

    if (data.status === 'PAID') {
      clearInterval(transactionPollInterval);
      usuarioAtual.saldo = data.saldoAtual;
      localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
      atualizarUIUsuario();
      alert('🎉 Depósito confirmado via PIX! Saldo creditado na sua conta.');
      fecharModal('modal-deposit');
    }
  } catch (e) {}
}

function copiarPix() {
  const input = document.getElementById('pix-code');
  input.select();
  document.execCommand('copy');
  alert('Chave PIX copiada para a área de transferência!');
}

async function solicitarSaque() {
  if (!usuarioAtual) return;
  const val = parseFloat(document.getElementById('saque-val').value);
  const chave = document.getElementById('saque-chave').value;

  try {
    const res = await fetch(`${API_URL}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: usuarioAtual.userId, valor: val, chavePix: chave })
    });
    const data = await res.json();

    if (res.ok) {
      usuarioAtual.saldo = data.novoSaldo;
      localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
      atualizarUIUsuario();
      alert(data.message);
      fecharModal('modal-withdraw');
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erro ao solicitar saque');
  }
}
