const API_URL = 'https://tiger-game.onrender.com/api';
let apostaAtual = 1.00;
const EMOJIS = ['🐯', '🏺', '🟢', '🧧', '🪙'];

function alterarAposta(v) {
  apostaAtual = Math.max(0.50, apostaAtual + v);
  document.getElementById('aposta-display').innerText = `R$ ${apostaAtual.toFixed(2).replace('.', ',')}`;
}

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
