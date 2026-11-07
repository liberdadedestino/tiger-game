const API_URL = 'https://tiger-game.onrender.com/api';
let usuarioAtual = JSON.parse(localStorage.getItem('user_tigrinho')) || null;
let apostaAtual = 1.00;
let transactionPollInterval = null;
let audioEnabled = true;

// SVGs ILUSTRADOS DE ALTA FIDELIDADE DOS 7 SÍMBOLOS OFICIAIS
const SVG_SIMBOLOS = {
  WILD: `<svg class="symbol-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="url(#wildGrad)" stroke="#ffd700" stroke-width="4"/>
          <ellipse cx="50" cy="68" rx="28" ry="18" fill="#fff5cc"/>
          <path d="M 24 38 Q 45 32 76 38 Q 76 56 50 56 Q 24 56 24 38 Z" fill="#151515" stroke="#ffd700" stroke-width="2.5"/>
          <path d="M 28 72 Q 50 88 72 72" stroke="#800000" stroke-width="4" fill="none" stroke-linecap="round"/>
          <rect x="32" y="10" width="36" height="16" rx="4" fill="#d60000" stroke="#ffd700" stroke-width="1.5"/>
          <text x="50" y="22" font-size="10" fill="#ffd700" text-anchor="middle" font-weight="900" font-family="Montserrat">WILD</text>
          <defs>
            <radialGradient id="wildGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#ffaa00"/><stop offset="100%" stop-color="#e65500"/>
            </radialGradient>
          </defs>
         </svg>`,
  SYCEE: `<svg class="symbol-svg" viewBox="0 0 100 100">
           <!-- Lingote de Ouro 3D (Sycee / Yuanbao) -->
           <path d="M 12 45 Q 50 20 88 45 Q 98 78 50 82 Q 2 78 12 45 Z" fill="url(#syceeGrad)" stroke="#b8860b" stroke-width="3"/>
           <ellipse cx="50" cy="45" rx="28" ry="14" fill="#fffae6"/>
           <ellipse cx="50" cy="45" rx="18" ry="8" fill="#ffd700"/>
           <defs>
             <linearGradient id="syceeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
               <stop offset="0%" stop-color="#fff066"/><stop offset="50%" stop-color="#ffd700"/><stop offset="100%" stop-color="#cc8800"/>
             </linearGradient>
           </defs>
          </svg>`,
  BAG: `<svg class="symbol-svg" viewBox="0 0 100 100">
         <!-- Saco de Moedas da Fortuna Vermelho -->
         <path d="M 28 35 Q 50 22 72 35 L 86 76 Q 86 92 50 92 Q 14 92 14 76 Z" fill="url(#bagGrad)" stroke="#ffd700" stroke-width="3"/>
         <path d="M 32 35 Q 50 44 68 35" stroke="#ffd700" stroke-width="4.5" fill="none"/>
         <circle cx="50" cy="64" r="15" fill="#ffd700" stroke="#cc8800" stroke-width="2"/>
         <text x="50" y="70" font-size="14" fill="#cc0000" text-anchor="middle" font-weight="900">福</text>
         <defs>
           <linearGradient id="bagGrad" x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" stop-color="#ff3333"/><stop offset="100%" stop-color="#990000"/>
           </linearGradient>
         </defs>
        </svg>`,
  JADE: `<svg class="symbol-svg" viewBox="0 0 100 100">
          <!-- Amuleto de Jade Verde Imperial -->
          <path d="M 30 20 L 70 20 L 82 50 L 50 86 L 18 50 Z" fill="url(#jadeGrad)" stroke="#ffd700" stroke-width="3.5"/>
          <circle cx="50" cy="45" r="16" fill="none" stroke="#ffd700" stroke-width="3.5"/>
          <circle cx="50" cy="45" r="8" fill="#ffd700"/>
          <defs>
            <linearGradient id="jadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00e673"/><stop offset="100%" stop-color="#006629"/>
            </linearGradient>
          </defs>
         </svg>`,
  ENVELOPE: `<svg class="symbol-svg" viewBox="0 0 100 100">
              <!-- Envelope Vermelho Hongbao -->
              <rect x="22" y="18" width="56" height="68" rx="8" fill="url(#envGrad)" stroke="#ffd700" stroke-width="3"/>
              <path d="M 22 18 L 50 48 L 78 18" fill="#b30000" stroke="#ffd700" stroke-width="2"/>
              <circle cx="50" cy="56" r="11" fill="#ffd700" stroke="#cc8800" stroke-width="1.5"/>
              <defs>
                <linearGradient id="envGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ff1a1a"/><stop offset="100%" stop-color="#b30000"/>
                </linearGradient>
              </defs>
             </svg>`,
  FIRECRACKER: `<svg class="symbol-svg" viewBox="0 0 100 100">
                 <!-- Fogos de Artifício Azuis e Vermelhos -->
                 <rect x="22" y="36" width="17" height="42" rx="4" fill="#1a53ff" stroke="#ffd700" stroke-width="2"/>
                 <rect x="42" y="24" width="17" height="42" rx="4" fill="#ff1a1a" stroke="#ffd700" stroke-width="2"/>
                 <rect x="62" y="36" width="17" height="42" rx="4" fill="#1a53ff" stroke="#ffd700" stroke-width="2"/>
                 <path d="M 30 36 Q 48 16 50 10" stroke="#ffd700" stroke-width="2.5" fill="none"/>
                </svg>`,
  MANDARIN: `<svg class="symbol-svg" viewBox="0 0 100 100">
              <!-- Tangerina / Laranja Dourada -->
              <circle cx="50" cy="56" r="33" fill="url(#mandGrad)" stroke="#d65c00" stroke-width="3"/>
              <path d="M 50 23 Q 62 14 68 22 Q 56 26 50 23 Z" fill="#00b33c" stroke="#004d1a" stroke-width="1"/>
              <defs>
                <radialGradient id="mandGrad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stop-color="#ffaa00"/><stop offset="100%" stop-color="#ff5500"/>
                </radialGradient>
              </defs>
             </svg>`
};

const SIMBOLOS_KEYS = Object.keys(SVG_SIMBOLOS);

// WEB AUDIO API
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
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'stopReel') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
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

// CANVAS DE MOEDAS
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
      if (cell) cell.innerHTML = SVG_SIMBOLOS[padrao[r][c]];
    }
  }
}

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

  colunas.flat().forEach(cell => {
    cell.classList.remove('winner', 'bounce');
    cell.classList.add('spinning');
  });

  const spinSoundInterval = setInterval(() => playSound('spinLoop'), 100);

  const anim = setInterval(() => {
    colunas.flat().forEach(cell => {
      const randomKey = SIMBOLOS_KEYS[Math.floor(Math.random() * SIMBOLOS_KEYS.length)];
      cell.innerHTML = SVG_SIMBOLOS[randomKey];
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
        if (data.matriz) cell.innerHTML = SVG_SIMBOLOS[data.matriz[r][0].id] || SVG_SIMBOLOS['MANDARIN'];
      });
      playSound('stopReel');

      setTimeout(() => {
        colunas[1].forEach((cell, r) => {
          cell.classList.remove('spinning');
          cell.classList.add('bounce');
          if (data.matriz) cell.innerHTML = SVG_SIMBOLOS[data.matriz[r][1].id] || SVG_SIMBOLOS['MANDARIN'];
        });
        playSound('stopReel');

        setTimeout(() => {
          clearInterval(anim);
          clearInterval(spinSoundInterval);
          colunas[2].forEach((cell, r) => {
            cell.classList.remove('spinning');
            cell.classList.add('bounce');
            if (data.matriz) cell.innerHTML = SVG_SIMBOLOS[data.matriz[r][2].id] || SVG_SIMBOLOS['MANDARIN'];
          });
          playSound('stopReel');

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
    }, 3000);

  } catch (err) {
    clearInterval(anim);
    clearInterval(spinSoundInterval);
    colunas.flat().forEach(cell => cell.classList.remove('spinning'));
    banner.innerText = 'Erro de conexão com o servidor';
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
      playSound('win');
      triggerCoinShower();
      alert('🎉 Depósito confirmado via PIX!');
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
    } else { alert(data.error); }
  } catch (err) { alert('Erro ao solicitar saque'); }
}
