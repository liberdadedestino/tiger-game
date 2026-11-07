const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API Fortune Tiger PG Official!'));

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL || 'https://api.pushinpay.com.br/api';
const CREDENCIAIS_FILE = path.join(__dirname, 'credenciais.json');

function carregarCredenciais() {
  if (!fs.existsSync(CREDENCIAIS_FILE)) {
    const dadosIniciais = { usuarios: {} };
    fs.writeFileSync(CREDENCIAIS_FILE, JSON.stringify(dadosIniciais, null, 2));
    return dadosIniciais;
  }
  return JSON.parse(fs.readFileSync(CREDENCIAIS_FILE, 'utf8'));
}

function salvarCredenciais(dados) {
  fs.writeFileSync(CREDENCIAIS_FILE, JSON.stringify(dados, null, 2));
}

const db = carregarCredenciais();
const cobrancasPendentes = {};

// Tabela Oficial de Símbolos PG Soft Fortune Tiger
const SIMBOLOS = [
  { id: 'WILD', peso: 4, multiplicador: 50 },
  { id: 'SYCEE', peso: 8, multiplicador: 20 },      // Lingote de Ouro
  { id: 'BAG', peso: 14, multiplicador: 10 },       // Saco de Moedas
  { id: 'JADE', peso: 20, multiplicador: 8 },       // Amuleto de Jade
  { id: 'ENVELOPE', peso: 26, multiplicador: 5 },   // Envelope Vermelho
  { id: 'FIRECRACKER', peso: 34, multiplicador: 3 },// Fogos de Artifício
  { id: 'MANDARIN', peso: 44, multiplicador: 2 }   // Tangerina
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

app.post('/api/auth/login', (req, res) => {
  const { userId, nome, provedor, email } = req.body;
  if (!userId || !provedor) {
    return res.status(400).json({ error: 'Dados insuficientes para autenticação.' });
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

app.get('/api/user/balance/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db.usuarios[userId];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json({ saldo: user.saldo });
});

app.post('/api/spin', (req, res) => {
  const { userId, aposta } = req.body;
  const user = db.usuarios[userId];

  if (!user) return res.status(401).json({ error: 'Usuário não autenticado' });
  if (aposta < 1.00) return res.status(400).json({ error: 'Aposta mínima é de R$ 1,00' });
  if (user.saldo < aposta) return res.status(400).json({ error: 'Saldo insuficiente' });

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
    matriz: matriz.map(row => row.map(s => ({ id: s.id }))),
    premio: premioTotal,
    linhasGanhas: linhasVencedoras,
    novoSaldo: user.saldo
  });
});

app.post('/api/deposit/pix', async (req, res) => {
  const { userId, valor } = req.body;
  if (!valor || valor < 5.00) return res.status(400).json({ error: 'Valor mínimo R$ 5,00' });
  const token = GATEWAY_API_KEY;
  if (!token) return res.status(500).json({ error: 'GATEWAY_API_KEY ausente.' });

  try {
    const valorEmCentavos = Math.round(parseFloat(valor) * 100);
    const response = await axios.post(`${GATEWAY_BASE_URL}/pix/cashIn`, {
      value: valorEmCentavos,
      webhook_url: 'https://tiger-game.onrender.com/api/webhook/pix'
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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
    return res.status(500).json({ error: 'Erro ao gerar PIX.' });
  }
});

app.get('/api/deposit/status/:id', (req, res) => {
  const { id } = req.params;
  const cobranca = cobrancasPendentes[id];
  if (!cobranca) return res.json({ status: 'NOT_FOUND' });
  const user = db.usuarios[cobranca.userId];
  return res.json({ status: cobranca.status, saldoAtual: user ? user.saldo : 0 });
});

app.post('/api/webhook/pix', (req, res) => {
  const { id, status, value } = req.body;
  if (status === 'paid' || status === 'PAID' || status === 'CONFIRMED') {
    const cobranca = cobrancasPendentes[id];
    if (cobranca && cobranca.status === 'PENDING') {
      if (db.usuarios[cobranca.userId]) {
        db.usuarios[cobranca.userId].saldo += (value ? value / 100 : cobranca.valor);
        salvarCredenciais(db);
      }
      cobranca.status = 'PAID';
    }
  }
  res.sendStatus(200);
});

app.post('/api/withdraw', (req, res) => {
  const { userId, valor, chavePix } = req.body;
  const user = db.usuarios[userId];
  if (!user || user.saldo < valor) return res.status(400).json({ error: 'Saldo insuficiente' });
  if (!chavePix) return res.status(400).json({ error: 'Informe a chave PIX' });

  user.saldo -= parseFloat(valor);
  salvarCredenciais(db);
  return res.json({ success: true, novoSaldo: user.saldo, message: 'Saque solicitado com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
