const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Tigrinho rodando perfeitamente!');
});

const SIMBOLOS = [
  { id: 'TIGRE', peso: 5, multiplicador: 50, emoji: '🐯' },
  { id: 'MOEDA', peso: 15, multiplicador: 10, emoji: '🪙' },
  { id: 'ENVELOPE', peso: 25, multiplicador: 5, emoji: '🧧' },
  { id: 'LARANJA', peso: 55, multiplicador: 2, emoji: '🍊' }
];

const usuarios = {
  "user123": { saldo: 100.00 }
};

function sortearSimbolo() {
  const pesoTotal = SIMBOLOS.reduce((acc, s) => acc + s.peso, 0);
  let aleatorio = Math.random() * pesoTotal;
  
  for (const simbolo of SIMBOLOS) {
    if (aleatorio < simbolo.peso) return simbolo;
    aleatorio -= simbolo.peso;
  }
  return SIMBOLOS[SIMBOLOS.length - 1];
}

app.post('/api/spin', (req, res) => {
  const { userId, aposta } = req.body;
  
  if (!usuarios[userId] || usuarios[userId].saldo < aposta) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  usuarios[userId].saldo -= aposta;

  const resultado = [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()];

  let premio = 0;
  if (resultado[0].id === resultado[1].id && resultado[1].id === resultado[2].id) {
    premio = aposta * resultado[0].multiplicador;
    usuarios[userId].saldo += premio;
  }

  return res.json({
    resultado: resultado.map(s => s.emoji),
    premio: premio,
    novoSaldo: usuarios[userId].saldo
  });
});

app.post('/api/webhook/pix', (req, res) => {
  const { userId, valor, status } = req.body;
  if (status === 'PAID' && usuarios[userId]) {
    usuarios[userId].saldo += parseFloat(valor);
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
