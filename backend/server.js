const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API Tigrinho 3x3 rodando com PIX!'));

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
  if (naoWilds.length === 0) return SIMBOLOS.find(s => s.id === 'WILD').multiplicador;
  const primeiro = naoWilds[0];
  if (naoWilds.every(id => id === primeiro)) {
    return SIMBOLOS.find(s => s.id === primeiro).multiplicador;
  }
  return 0;
}

// Rota do Giro
app.post('/api/spin', (req, res) => {
  const { userId, aposta } = req.body;
  if (!usuarios[userId] || usuarios[userId].saldo < aposta) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  usuarios[userId].saldo -= aposta;

  const matriz = [
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()],
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()],
    [sortearSimbolo(), sortearSimbolo(), sortearSimbolo()]
  ];

  const linhas = [
    [matriz[0][0], matriz[0][1], matriz[0][2]],
    [matriz[1][0], matriz[1][1], matriz[1][2]],
    [matriz[2][0], matriz[2][1], matriz[2][2]],
    [matriz[0][0], matriz[1][1], matriz[2][2]],
    [matriz[2][0], matriz[1][1], matriz[0][2]]
  ];

  let premioTotal = 0;
  let linhasVencedoras = [];

  linhas.forEach((linha, idx) => {
    const mult = validarLinha(linha[0], linha[1], linha[2]);
    if (mult > 0) {
      premioTotal += (aposta / 5) * mult;
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

// Endpoint: Gerar Depósito PIX
app.post('/api/deposit/pix', (req, res) => {
  const { userId, valor } = req.body;
  if (!valor || valor < 5) {
    return res.status(400).json({ error: 'Valor mínimo de depósito é R$ 5,00' });
  }

  const pixCode = `00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540${parseFloat(valor).toFixed(2)}5802BR5913TIGRINO GAME6009PARAGUAY62070503***6304E2CA`;

  return res.json({
    message: 'PIX gerado com sucesso',
    valor: parseFloat(valor),
    pixCopiaECola: pixCode,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`
  });
});

// Endpoint: Confirmar Depósito (Simulação de Webhook do Gateway)
app.post('/api/deposit/confirm', (req, res) => {
  const { userId, valor } = req.body;
  if (usuarios[userId]) {
    usuarios[userId].saldo += parseFloat(valor);
    return res.json({ success: true, novoSaldo: usuarios[userId].saldo });
  }
  res.status(404).json({ error: 'Usuário não encontrado' });
});

// Endpoint: Solicitar Saque
app.post('/api/withdraw', (req, res) => {
  const { userId, valor, chavePix } = req.body;
  if (!usuarios[userId] || usuarios[userId].saldo < valor) {
    return res.status(400).json({ error: 'Saldo insuficiente para saque' });
  }
  if (!chavePix) {
    return res.status(400).json({ error: 'Informe uma chave PIX válida' });
  }

  usuarios[userId].saldo -= parseFloat(valor);
  return res.json({ success: true, novoSaldo: usuarios[userId].saldo, message: 'Saque solicitado com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
