const API_URL = 'https://tiger-game.onrender.com/api';
let usuarioAtual = JSON.parse(localStorage.getItem('user_tigrinho')) || null;
let apostaAtual = 1.00;
let transactionPollInterval = null;
let audioEnabled = true;
const EMOJIS = ['🐯', '🎰', '💎', '🍒', '🪙', '🧧'];

// SINTETIZADOR DE ÁUDIO WEB AUDIO API (Sem dependência de arquivos externos)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!audioEnabled) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'spinLoop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'stopReel') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'win') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, idx) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f, now + idx * 0.1);
        g.gain.setValueAtTime(0.3, now + idx * 0.1);
        g.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
        o.start(now + idx * 0.1);
        o.stop(now + idx * 0.1 + 0.25);
      });
    }
  } catch (e) {}
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  document.getElementById('btn-sound').innerText = audioEnabled ? '🔊' : '🔇';
}

// MOTOR DE PARTÍCULAS CANVAS (Chuva de Moedas Douradas)
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function triggerCoinShower() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      radius: Math.random() * 8 + 6,
      vy: Math.random() * 5 + 4,
      vx: (Math.random() - 0.5) * 3,
      color: '#ffd700'
    });
  }
  animateParticles();
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, idx) => {
    p.y += p.vy;
    p.x += p.vx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffe600';
    ctx.fill();

    if (p.y > canvas.height) particles.splice(idx, 1);
  });
  if (particles.length > 0) requestAnimationFrame(animateParticles);
}

// INICIALIZAÇÃO DA APLICAÇÃO
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
  playSound('click');
  apostaAtual = Math.max(1.00, apostaAtual + v);
  document.getElementById('aposta-display').innerText = `R$ ${apostaAtual.toFixed(2).replace('.', ',')}`;
}

async function loginSocial(provedor) {
  playSound('click');
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
      document.getElementById('banner-text').innerText = `Bem-vindo (${provedor}), ${usuarioAtual.nome}!`;
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

// GIRO DOS SLOTS COM ANIMAÇÃO CONTINUA (4s) E PARADA SEQUENCIAL COLUNA A COLUNA
async function girar() {
  if (!usuarioAtual) {
    abrirModal('modal-auth');
    return;
  }

  playSound('click');
  const btn = document.getElementById('btn-spin');
  const banner = document.getElementById('banner-text');
  btn.disabled = true;
  banner.innerText = "Girando os slots da sorte...";
  document.getElementById('win-display').innerText = 'R$ 0,00';

  const colunas = [
    [document.getElementById('c00'), document.getElementById('c10'), document.getElementById('c20')],
    [document.getElementById('c01'), document.getElementById('c11'), document.getElementById('c21')],
    [document.getElementById('c02'), document.getElementById('c12'), document.getElementById('c22')]
  ];

  // Ativa o estado de rotação em todas as células
  colunas.flat().forEach(cell => {
    cell.classList.remove('winner', 'bounce');
    cell.classList.add('spinning');
  });

  const spinSoundInterval = setInterval(() => playSound('spinLoop'), 100);

  const anim = setInterval(() => {
    colunas.flat().forEach(cell => {
      const wrapper = cell.querySelector('.symbol-wrapper');
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

    // Cronograma de parada sequencial dos 3 rolos (Total 4 segundos)
    setTimeout(() => {
      // Parada da Coluna 1
      colunas[0].forEach((cell, r) => {
        cell.classList.remove('spinning');
        cell.classList.add('bounce');
        if (data.matriz) cell.querySelector('.symbol-wrapper').innerText = data.matriz[r][0].emoji;
      });
      playSound('stopReel');

      setTimeout(() => {
        // Parada da Coluna 2
        colunas[1].forEach((cell, r) => {
          cell.classList.remove('spinning');
          cell.classList.add('bounce');
          if (data.matriz) cell.querySelector('.symbol-wrapper').innerText = data.matriz[r][1].emoji;
        });
        playSound('stopReel');

        setTimeout(() => {
          // Parada da Coluna 3
          clearInterval(anim);
          clearInterval(spinSoundInterval);
          colunas[2].forEach((cell, r) => {
            cell.classList.remove('spinning');
            cell.classList.add('bounce');
            if (data.matriz) cell.querySelector('.symbol-wrapper').innerText = data.matriz[r][2].emoji;
          });
          playSound('stopReel');

          // Processamento do Saldo e Vitória
          if (res.ok) {
            usuarioAtual.saldo = data.novoSaldo;
            localStorage.setItem('user_tigrinho', JSON.stringify(usuarioAtual));
            atualizarUIUsuario();

            document.getElementById('win-display').innerText = `R$ ${data.premio.toFixed(2).replace('.', ',')}`;

            if (data.premio > 0) {
              playSound('win');
              triggerCoinShower();
              banner.innerText = `🎉 FORTUNE WIN! Prêmio de R$ ${data.premio.toFixed(2).replace('.', ',')}!`;
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
    }, 3000); // 3s inicio da parada + 1s finalizacao (Total 4s)

  } catch (err) {
    clearInterval(anim);
    clearInterval(spinSoundInterval);
    colunas.flat().forEach(cell => cell.classList.remove('spinning'));
    banner.innerText = 'Erro de conexão com o servidor';
    btn.disabled = false;
  }
}

// INTEGRAÇÃO PIX REAL E POLLING
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
      playSound('win');
      triggerCoinShower();
      alert('🎉 Depósito confirmado via PIX! Saldo creditado na sua conta.');
      fecharModal('modal-deposit');
    }
  } catch (e) {}
}

function copiarPix() {
  playSound('click');
  const input = document.getElementById('pix-code');
  input.select();
  document.execCommand('copy');
  alert('Chave PIX copiada para a área de transferência!');
}

async function solicitarSaque() {
  if (!usuarioAtual) return;
  playSound('click');
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
