import express from 'express';
import { prisma } from './utils/prisma.js';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

// --- CONFIGURAÇÕES ---
app.use(express.json());

// CONFIGURAÇÃO ÚNICA DE CORS
app.use(cors({
    origin: '*', // Permite qualquer origem (ideal para resolver o erro agora)
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
        req.usuarioLogado = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token inválido." });
    }
}

// --- ROTAS DE USUÁRIO ---

app.post('/usuarios', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const usuarioExistente = await prisma.usuarios.findUnique({ where: { email } });
        if (usuarioExistente) return res.status(400).json({ error: "Este e-mail já está em uso!" });

        const hashedPassword = await bcrypt.hash(senha, 10);
        const novoUsuario = await prisma.usuarios.create({
            data: { nome, email, senha: hashedPassword }
        });
        res.status(201).json(novoUsuario);
    } catch (e) {
        res.status(500).json({ error: "Erro ao criar usuário" });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const usuario = await prisma.usuarios.findUnique({ where: { email } });
        if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ error: "Senha incorreta" });

        const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
    } catch (e) {
        res.status(500).json({ error: "Erro no servidor" });
    }
});

app.get('/usuarios/:id/saldo', verificarToken, async (req, res) => {
    try {
        const transacoes = await prisma.transacoes.findMany({
            where: { userId: req.params.id }
        });

        const total = transacoes.reduce((acc, t) => {
            return t.tipo === 'entrada' ? acc + t.valor : acc - t.valor;
        }, 0);

        res.json({ total });
    } catch (e) {
        console.error("Erro ao calcular saldo:", e);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

// --- ROTAS DE TRANSAÇÕES ---

app.post('/transacoes', verificarToken, async (req, res) => {
    const { descricao, valor, tipo, userId, data } = req.body; 
    try {
        const nova = await prisma.transacoes.create({
            data: {
                descricao,
                valor: parseFloat(valor),
                tipo,
                userId,
                // Se o frontend enviar 'data', converte para objeto Date. 
                // Se não, usa o momento atual.
                data: data ? new Date(data) : new Date() 
            }
        });
        res.status(201).json(nova);
    } catch (e) {
        console.error("Erro Prisma:", e); // Veja o erro detalhado nos Logs do Render
        res.status(500).json({ error: "Erro ao salvar no banco" });
    }
});

app.get('/transacoes/:userId', verificarToken, async (req, res) => {
    try {
        const historico = await prisma.transacoes.findMany({
            where: { userId: req.params.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(historico);
    } catch (e) {
        res.status(500).json({ error: "Erro ao buscar histórico." });
    }
});

app.delete('/transacoes/:id', verificarToken, async (req, res) => {
    try {
        await prisma.transacoes.delete({ where: { id: req.params.id } });
        res.json({ message: "Transação removida" });
    } catch (e) {
        res.status(500).json({ error: "Erro ao remover transação" });
    }
});

// --- ROTAS DE INVESTIMENTOS ---

app.get('/investimentos/:userId', verificarToken, async (req, res) => {
    try {
        const investimentos = await prisma.investimento.findMany({
            where: { userId: req.params.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(investimentos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar investimentos" });
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
                userId
            }
        });
        res.status(201).json(novo);
    } catch (e) {
        res.status(500).json({ error: "Erro ao salvar investimento" });
    }
});

app.put('/investimentos/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, valor } = req.body;
        const atualizado = await prisma.investimento.update({
            where: { id },
            data: {
                quantidade: parseFloat(quantidade),
                valor: parseFloat(valor)
            }
        });
        res.json(atualizado);
    } catch (e) {
        res.status(500).json({ error: "Erro ao atualizar investimento" });
    }
});

app.delete('/investimentos/:id', verificarToken, async (req, res) => {
    try {
        await prisma.investimento.delete({ where: { id: req.params.id } });
        res.json({ message: "Investimento removido com sucesso" });
    } catch (e) {
        res.status(500).json({ error: "Erro ao remover investimento" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));