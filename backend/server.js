const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API Fortune Tiger Vegas com Autenticação Social!'));

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'https://api.pushinpay.com.br/api';
const CREDENCIAIS_FILE = path.join(__dirname, 'credenciais.json');

// Carregar credenciais dos usuários do arquivo
function carregarCredenciais() {
  if (!fs.existsSync(CREDENCIAIS_FILE)) {
    const dadosIniciais = { usuarios: {} };
    fs.writeFileSync(CREDENCIAIS_FILE, JSON.stringify(dadosIniciais, null, 2));
    return dadosIniciais;
  }
  return JSON.parse(fs.readFileSync(CREDENCIAIS_FILE, 'utf8'));
}

// Salvar novos perfis de usuários no arquivo CREDENCIAIS
function salvarCredenciais(dados) {
  fs.writeFileSync(CREDENCIAIS_FILE, JSON.stringify(dados, null, 2));
}

const db = carregarCredenciais();
const cobrancasPendentes = {};

const SIMBOLOS = [
  { id: 'WILD', peso: 5, multiplicador: 50, emoji: '🐯' },
  { id: 'SEVEN', peso: 10, multiplicador: 30, emoji: '🎰' },
  { id: 'DIAMOND', peso: 15, multiplicador: 20, emoji: '💎' },
  { id: 'CHERRY', peso: 25, multiplicador: 10, emoji: '🍒' },
  { id: 'GOLD', peso: 35, multiplicador: 5, emoji: '🪙' },
  { id: 'ENVELOPE', peso: 50, multiplicador: 2, emoji: '🧧' }
];

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

// ROTA: Autenticação Social (Google, Instagram, Facebook)
app.post('/api/auth/login', (req, res) => {
  const { userId, nome, provedor, email } = req.body;
  if (!userId || !provedor) {
    return res.status(400).json({ error: 'Dados insuficientes para autenticação social.' });
  }

  const idFormatado = `${provedor.toLowerCase()}_${userId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  if (!db.usuarios[idFormatado]) {
    db.usuarios[idFormatado] = {
      userId: idFormatado,
      nome: nome || `Jogador ${provedor}`,
      email: email || `${idFormatado}@social.com`,
      provedor: provedor,
      saldo: 0.00,
      criadoEm: new Date().toISOString()
    };
    salvarCredenciais(db);
  }

  return res.json({
    userId: idFormatado,
    nome: db.usuarios[idFormatado].nome,
    provedor: db.usuarios[idFormatado].provedor,
    saldo: db.usuarios[idFormatado].saldo
  });
});

// ROTA: Consultar Saldo
app.get('/api/user/balance/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db.usuarios[userId];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json({ saldo: user.saldo });
});

// ROTA: Giro dos Slots
app.post('/api/spin', (req, res) => {
  const { userId, aposta } = req.body;
  const user = db.usuarios[userId];

  if (!user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  if (aposta < 1.00) {
    return res.status(400).json({ error: 'Aposta mínima é de R$ 1,00' });
  }
  if (user.saldo < aposta) {
    return res.status(400).json({ error: 'Saldo insuficiente para aposta' });
  }

  user.saldo -= aposta;

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
    user.saldo += premioTotal;
  }

  salvarCredenciais(db);

  return res.json({
    matriz: matriz.map(row => row.map(s => ({ emoji: s.emoji, id: s.id }))),
    premio: premioTotal,
    linhasGanhas: linhasVencedoras,
    novoSaldo: user.saldo
  });
});

// ROTA: Depósito PIX
app.post('/api/deposit/pix', async (req, res) => {
  const { userId, valor } = req.body;
  if (!valor || valor < 5.00) {
    return res.status(400).json({ error: 'O valor mínimo de depósito é R$ 5,00' });
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
      transactionId: idTransacao,
      valor: parseFloat(valor),
      pixCopiaECola: pixCopiaECola,
      qrCodeUrl: data.qr_code_base64 || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCopiaECola)}`
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar cobrança PIX.' });
  }
});

// ROTA: Status do PIX (Polling)
app.get('/api/deposit/status/:id', (req, res) => {
  const { id } = req.params;
  const cobranca = cobrancasPendentes[id];

  if (!cobranca) return res.json({ status: 'NOT_FOUND' });

  const userId = cobranca.userId;
  const user = db.usuarios[userId];

  return res.json({
    status: cobranca.status,
    saldoAtual: user ? user.saldo : 0
  });
});

// ROTA: Webhook PIX
app.post('/api/webhook/pix', (req, res) => {
  const { id, status, value } = req.body;

  if (status === 'paid' || status === 'PAID' || status === 'CONFIRMED') {
    const cobranca = cobrancasPendentes[id];
    if (cobranca && cobranca.status === 'PENDING') {
      const userId = cobranca.userId;
      const valorDepositado = value ? value / 100 : cobranca.valor;

      if (db.usuarios[userId]) {
        db.usuarios[userId].saldo += valorDepositado;
        salvarCredenciais(db);
      }
      cobranca.status = 'PAID';
    }
  }

  res.sendStatus(200);
});

// ROTA: Saque
app.post('/api/withdraw', (req, res) => {
  const { userId, valor, chavePix } = req.body;
  const user = db.usuarios[userId];

  if (!user || user.saldo < valor) {
    return res.status(400).json({ error: 'Saldo insuficiente para saque' });
  }
  if (!chavePix) {
    return res.status(400).json({ error: 'Informe uma chave PIX válida' });
  }

  user.saldo -= parseFloat(valor);
  salvarCredenciais(db);
  return res.json({ success: true, novoSaldo: user.saldo, message: 'Saque solicitado com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
