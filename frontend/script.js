const API_URL = 'https://tiger-game.onrender.com/api';
let usuarioAtual = JSON.parse(localStorage.getItem('user_tigrinho')) || null;
let apostaAtual = 1.00;
let transactionPollInterval = null;
let audioEnabled = true;

// Mapeamento para imagens PNG reais dos símbolos (substitua pelos links das suas imagens em HD)
const IMAGENS_SIMBOLOS = {
  WILD: 'https://i.imgur.com/vHq0Y7x.png',        // Imagem do Tigre Wild
  SYCEE: 'https://i.imgur.com/K3yZ8vL.png',       // Lingote de Ouro 3D
  BAG: 'https://i.imgur.com/9R7x2aM.png',         // Saco de Moedas 3D
  JADE: 'https://i.imgur.com/4xP9mQ1.png',        // Amuleto de Jade 3D
  ENVELOPE: 'https://i.imgur.com/uQ2tW8z.png',    // Envelope Vermelho 3D
  FIRECRACKER: 'https://i.imgur.com/7Y1xN0P.png', // Fogos de Artifício 3D
  MANDARIN: 'https://i.imgur.com/L5xN1qW.png'     // Tangerina 3D
};

const SIMBOLOS_KEYS = Object.keys(IMAGENS_SIMBOLOS);

// Inicialização e renderização usando tags <img>
document.addEventListener('DOMContentLoaded', () => {
  renderizarGradeInicial();
  if (usuarioAtual) {
    atualizarUIUsuario();
    atualizarSaldo();
  } else {
    abrirModal('modal-auth');
  }
});

function renderizarGradeInicial() {
  const padrao = [
    ['SYCEE', 'WILD', 'JADE'],
    ['BAG', 'WILD', 'ENVELOPE'],
    ['FIRECRACKER', 'MANDARIN', 'SYCEE']
  ];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = document.getElementById(`c${r}${c}`);
      if (cell) {
        const idSimbolo = padrao[r][c];
        cell.innerHTML = `<img src="${IMAGENS_SIMBOLOS[idSimbolo]}" class="symbol-img" alt="${idSimbolo}">`;
      }
    }
  }
}

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
  banner.innerText = "Girando os slots...";
  document.getElementById('win-display').innerText = 'R$ 0,00';

  const colunas = [
    [document.getElementById('c00'), document.getElementById('c10'), document.getElementById('c20')],
    [document.getElementById('c01'), document.getElementById('c11'), document.getElementById('c21')],
    [document.getElementById('c02'), document.getElementById('c12'), document.getElementById('c22')]
  ];

  colunas.flat().forEach(cell => {
    cell.classList.remove('winner', 'bounce');
    cell.classList.add('spinning');
  });

  const anim = setInterval(() => {
    colunas.flat().forEach(cell => {
      const randomKey = SIMBOLOS_KEYS[Math.floor(Math.random() * SIMBOLOS_KEYS.length)];
      cell.innerHTML = `<img src="${IMAGENS_SIMBOLOS[randomKey]}" class="symbol-img">`;
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
      colunas[0].forEach((cell, r) => {
        cell.classList.remove('spinning');
        cell.classList.add('bounce');
        if (data.matriz) {
          const id = data.matriz[r][0].id;
          cell.innerHTML = `<img src="${IMAGENS_SIMBOLOS[id]}" class="symbol-img">`;
        }
      });

      setTimeout(() => {
        colunas[1].forEach((cell, r) => {
          cell.classList.remove('spinning');
          cell.classList.add('bounce');
          if (data.matriz) {
            const id = data.matriz[r][1].id;
            cell.innerHTML = `<img src="${IMAGENS_SIMBOLOS[id]}" class="symbol-img">`;
          }
        });

        setTimeout(() => {
          clearInterval(anim);
          colunas[2].forEach((cell, r) => {
            cell.classList.remove('spinning');
            cell.classList.add('bounce');
            if (data.matriz) {
              const id = data.matriz[r][2].id;
              cell.innerHTML = `<img src="${IMAGENS_SIMBOLOS[id]}" class="symbol-img">`;
            }
          });

          if (res.ok) {
            usuarioAtual.saldo = data.novoSaldo;
            localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
            atualizarUIUsuario();

            document.getElementById('win-display').innerText = `R$ ${data.premio.toFixed(2).replace('.', ',')}`;

            if (data.premio > 0) {
              banner.innerText = `🎉 GANHOU R$ ${data.premio.toFixed(2).replace('.', ',')}!`;
              colunas.flat().forEach(cell => cell.classList.add('winner'));
            } else {
              banner.innerText = "Tente novamente na próxima rodada!";
            }
          } else {
            banner.innerText = data.error || 'Erro ao processar aposta';
          }
          btn.disabled = false;
        }, 500);
      }, 500);
    }, 3000);

  } catch (err) {
    clearInterval(anim);
    colunas.flat().forEach(cell => cell.classList.remove('spinning'));
    banner.innerText = 'Erro de conexão';
    btn.disabled = false;
  }
}

async function gerarPix() {
  if (!usuarioAtual) { abrirModal('modal-auth'); return; }
  const val = parseFloat(document.getElementById('dep-val').value);
  if (val < 5.00) { alert('Valor mínimo R$ 5,00'); return; }

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
    } else { alert(data.error); }
  } catch (err) { alert('Erro ao gerar PIX'); }
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
      alert('🎉 Depósito confirmado!');
      fecharModal('modal-deposit');
    }
  } catch (e) {}
}

function copiarPix() {
  const input = document.getElementById('pix-code');
  input.select();
  document.execCommand('copy');
  alert('Chave PIX copiada!');
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
    } else { alert(data.error); }
  } catch (err) { alert('Erro ao solicitar saque'); }
}
