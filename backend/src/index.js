import express from 'express';
import { prisma } from './utils/prisma.js';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

// --- CONFIGURAÇÕES ---
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const SECRET_KEY = process.env.JWT_SECRET || "minha_chave_secreta_ultra_segura_123";

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(403).json({ error: "Acesso negado." });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuarioLogado = decoded; // Contém o ID do usuário vindo do token
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
}

// --- ROTAS DE USUÁRIO ---

// Cadastro
app.post('/usuarios', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = await prisma.usuarios.create({
            data: { nome, email, senha: senhaHash },
        });
        res.status(201).json(novoUsuario);
    } catch (error) {
        res.status(400).json({ error: "E-mail já cadastrado ou dados inválidos." });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const usuario = await prisma.usuarios.findUnique({ where: { email } });
        if (!usuario) return res.status(401).json({ error: "Credenciais inválidas." });

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ error: "Credenciais inválidas." });

        const token = jwt.sign({ id: usuario.id }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ token, user: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
});

// Buscar dados do usuário logado
app.get('/usuarios/:id', verificarToken, async (req, res) => {
    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
        const { senha, ...dados } = usuario;
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar dados." });
    }
});

// --- ROTAS DE TRANSAÇÕES ---

// Listar transações do usuário
app.get('/transacoes/:userId', verificarToken, async (req, res) => {
    try {
        const transacoes = await prisma.transacoes.findMany({
            where: { userId: Number(req.params.userId) },
            orderBy: { data: 'desc' }
        });
        res.json(transacoes);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar transações." });
    }
});

// Criar transação
app.post('/transacoes', verificarToken, async (req, res) => {
    try {
        const { descricao, valor, tipo, userId } = req.body;
        const nova = await prisma.transacoes.create({
            data: {
                descricao,
                valor: parseFloat(valor),
                tipo,
                userId: Number(userId)
            }
        });
        res.status(201).json(nova);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar transação." });
    }
});

// Calcular Saldo
app.get('/usuarios/:id/saldo', verificarToken, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const transacoes = await prisma.transacoes.findMany({ where: { userId } });
        const total = transacoes.reduce((acc, t) => t.tipo === 'entrada' ? acc + t.valor : acc - t.valor, 0);
        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: "Erro ao calcular saldo." });
    }
});

// Apagar Transação
app.delete('/transacoes/:id', verificarToken, async (req, res) => {
    try {
        await prisma.transacoes.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Removida com sucesso." });
    } catch (error) {
        res.status(500).json({ error: "Erro ao apagar." });
    }
});

// --- ROTAS DE INVESTIMENTOS ---

app.get('/investimentos/:userId', verificarToken, async (req, res) => {
    try {
        const lista = await prisma.investimento.findMany({
            where: { userId: Number(req.params.userId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar investimentos." });
    }
});

app.post('/investimentos', verificarToken, async (req, res) => {
    try {
        const { nome, valor, quantidade, tipo, userId } = req.body;
        const novo = await prisma.investimento.create({
            data: {
                nome,
                valor: parseFloat(valor),
                quantidade: parseFloat(quantidade),
                tipo,
                userId: Number(userId)
            }
        });
        res.status(201).json(novo);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar investimento." });
    }
});

app.put('/investimentos/:id', verificarToken, async (req, res) => {
    try {
        const { quantidade, valor } = req.body;
        const atualizado = await prisma.investimento.update({
            where: { id: Number(req.params.id) },
            data: {
                quantidade: parseFloat(quantidade),
                valor: parseFloat(valor)
            }
        });
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar." });
    }
});

app.delete('/investimentos/:id', verificarToken, async (req, res) => {
    try {
        await prisma.investimento.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Removido com sucesso." });
    } catch (error) {
        res.status(500).json({ error: "Erro ao apagar." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));