const API_URL = 'https://tiger-game.onrender.com/api';
let apostaAtual = 1.00;
const EMOJIS = ['🐯', '🏺', '🟢', '🧧', '🪙'];

function alterarAposta(v) {
  apostaAtual = Math.max(0.50, apostaAtual + v);
  document.getElementById('aposta-display').innerText = `R$ ${apostaAtual.toFixed(2)}`;
}

async function girar() {
  const btn = document.getElementById('btn-spin');
  btn.disabled = true;
  document.getElementById('win-display').innerText = 'R$ 0.00';

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
    cells.forEach(c => c.innerText = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  }, 70);

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
            document.getElementById(`c${r}${c}`).innerText = data.matriz[r][c].emoji;
          }
        }

        document.getElementById('saldo').innerText = `R$ ${data.novoSaldo.toFixed(2)}`;
        document.getElementById('win-display').innerText = `R$ ${data.premio.toFixed(2)}`;

        if (data.premio > 0) {
          // Destacar células vencedoras
          cells.forEach(c => c.classList.add('winner'));
        }
      } else {
        alert(data.error || 'Erro no giro');
      }
      btn.disabled = false;
    }, 1000);

  } catch (err) {
    clearInterval(anim);
    cells.forEach(c => c.classList.remove('spinning'));
    alert('Erro de conexão');
    btn.disabled = false;
  }
}
