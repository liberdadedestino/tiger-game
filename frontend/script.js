const API_URL = 'http://localhost:3000/api';

async function girar() {
  const aposta = parseFloat(document.getElementById('aposta').value);
  const btnSpin = document.getElementById('btn-spin');
  btnSpin.disabled = true;

  try {
    const response = await fetch(`${API_URL}/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', aposta })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('reel1').innerText = data.resultado[0];
      document.getElementById('reel2').innerText = data.resultado[1];
      document.getElementById('reel3').innerText = data.resultado[2];
      document.getElementById('saldo').innerText = data.novoSaldo.toFixed(2);

      if (data.premio > 0) {
        alert(`Parabéns! Você ganhou R$ ${data.premio.toFixed(2)}`);
      }
    } else {
      alert(data.error || 'Erro ao processar jogada');
    }
  } catch (error) {
    alert('Erro de conexão com o servidor');
  } finally {
    btnSpin.disabled = false;
  }
}
