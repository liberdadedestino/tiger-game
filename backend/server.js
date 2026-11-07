const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API Tigrinho 3x3 rodando com Pushin Pay Real!'));

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'https://api.pushinpay.com.br/api';

const SIMBOLOS = [
  { id: 'WILD', peso: 5, multiplicador: 50, emoji: '🐯' },
  { id: 'GOLD', peso: 15, multiplicador: 20, emoji: '🏺' },
  { id: 'JADE', peso: 25, multiplicador: 10, emoji: '🟢' },
  { id: 'ENVELOPE', peso: 35, multiplicador: 5, emoji: '🧧' },
  { id: 'MOEDA', peso: 45, multiplicador: 2, emoji: '🪙' }
];

const usuarios = { "user123": { saldo: 100.00 } };
const cobrancasPendentes = {};

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

// Endpoint Depósito PIX Real via Pushin Pay
app.post('/api/deposit/pix', async (req, res) => {
  const { userId, valor } = req.body;
  if (!valor || valor < 5) {
    return res.status(400).json({ error: 'Valor mínimo de depósito é R$ 5,00' });
  }

  const token = GATEWAY_API_KEY;
  if (!token) {
    return res.status(500).json({ error: 'GATEWAY_API_KEY não configurada no Render.' });
  }

  try {
    const valorEmCentavos = Math.round(parseFloat(valor) * 100);
    const response = await axios.post(`${GATEWAY_BASE_URL}/pix/cashIn`, {
      value: valorEmCentavos,
      webhook_url: 'https://tiger-game.onrender.com/api/webhook/pix'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = response.data;
    const pixCopiaECola = data.qr_code || data.qrcode || data.pix_copia_cola || '';
    const idTransacao = data.id || data.transaction_id || '';

    cobrancasPendentes[idTransacao] = { userId, valor: parseFloat(valor), status: 'PENDING' };

    return res.json({
      message: 'PIX real gerado com sucesso via Pushin Pay',
      transactionId: idTransacao,
      valor: parseFloat(valor),
      pixCopiaECola: pixCopiaECola,
      qrCodeUrl: data.qr_code_base64 || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCopiaECola)}`
    });

  } catch (error) {
    console.error('Erro na API Pushin Pay:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Erro ao gerar PIX na Pushin Pay.', 
      details: error.response?.data || error.message 
    });
  }
});

// Webhook Real Pushin Pay
app.post('/api/webhook/pix', (req, res) => {
  const { id, status, value } = req.body;

  if (status === 'paid' || status === 'PAID' || status === 'CONFIRMED') {
    const cobranca = cobrancasPendentes[id];
    if (cobranca && cobranca.status === 'PENDING') {
      const userId = cobranca.userId;
      const valorDepositado = value ? value / 100 : cobranca.valor;

      if (usuarios[userId]) {
        usuarios[userId].saldo += valorDepositado;
      }
      cobranca.status = 'PAID';
      console.log(`Depósito de R$ ${valorDepositado} creditado para o usuário ${userId}`);
    }
  }

  res.sendStatus(200);
});

// Saque
app.post('/api/withdraw', (req, res) => {
  const { userId, valor, chavePix } = req.body;
  if (!usuarios[userId] || usuarios[userId].saldo < valor) {
    return res.status(400).json({ error: 'Saldo insuficiente para saque' });
  }
  if (!chavePix) {
    return res.status(400).json({ error: 'Informe uma chave PIX válida' });
  }

  usuarios[userId].saldo -= parseFloat(valor);
  return res.json({ success: true, novoSaldo: usuarios[userId].saldo, message: 'Solicitação de saque enviada com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
