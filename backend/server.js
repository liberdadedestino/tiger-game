const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API Tigrinho 3x3 rodando!'));

const SIMBOLOS = [
  { id: 'WILD', peso: 5, multiplicador: 50, emoji: '🐯' },
  { id: 'GOLD', peso: 15, multiplicador: 20, emoji: '🏺' },
  { id: 'JADE', peso: 25, multiplicador: 10, emoji: '🟢' },
  { id: 'ENVELOPE', peso: 35, multiplicador: 5, emoji: '🧧' },
  { id: 'MOEDA', peso: 45, multiplicador: 2, emoji: '🪙' }
];

const usuarios = { "user123": { saldo: 100.00 } };

function sortearSimbolo() {
  const pesoTotal = SIMBOLOS.reduce((acc, s) => acc + s.peso, 0);
  let aleatorio = Math.random() * pesoTotal;
  for (const s of SIMBOLOS) {
    if (aleatorio < s.peso) return s;
    aleatorio -= s.peso;
  }
  return SIMBOLOS[SIMBOLOS.length - 1];
}

function validarLinha(s1, s2, s3) {
  const ids = [s1.id, s2.id, s3.id];
  const naoWilds = ids.filter(id => id !== 'WILD');
  
  // Todos WILD ou 3 símbolos iguais (considerando WILD como coringa)
  if (naoWilds.length === 0) return SIMBOLOS.find(s => s.id === 'WILD').multiplicador;
  const primeiro = naoWilds[0];
  if (naoWilds.every(id => id === primeiro)) {
    return SIMBOLOS.find(s => s.id === primeiro).multiplicador;
  }
  return 0;
}

app.post('/api/spin', (req, res) => {
  const { userId, aposta } = req.body;
  if (!usuarios[userId] || usuarios[userId].saldo < aposta) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  usuarios[userId].saldo -= aposta;

  // Gerar Matriz 3x3
  const matriz = [
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()],
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()],
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()]
  ];

  // Definir as 5 linhas de pagamento
  const linhas = [
    [matriz[0][0], matriz[0][1], matriz[0][2]], // Linha 1 (Superior)
    [matriz[1][0], matriz[1][1], matriz[1][2]], // Linha 2 (Meio)
    [matriz[2][0], matriz[2][1], matriz[2][2]], // Linha 3 (Inferior)
    [matriz[0][0], matriz[1][1], matriz[2][2]], // Diagonal 1
    [matriz[2][0], matriz[1][1], matriz[0][2]]  // Diagonal 2
  ];

  let premioTotal = 0;
  let linhasVencedoras = [];

  linhas.forEach((linha, idx) => {
    const mult = validarLinha(linha[0], linha[1], linha[2]);
    if (mult > 0) {
      premioTotal += (aposta / 5) * mult; // Divide aposta total pelas 5 linhas
      linhasVencedoras.push(idx + 1);
    }
  });

  if (premioTotal > 0) {
    usuarios[userId].saldo += premioTotal;
  }

  return res.json({
    matriz: matriz.map(row => row.map(s => ({ emoji: s.emoji, id: s.id }))),
    premio: premioTotal,
    linhasGanhas: linhasVencedoras,
    novoSaldo: usuarios[userId].saldo
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
