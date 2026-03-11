import express from 'express';
import { prisma } from './utils/prisma.js';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const SECRET_KEY = process.env.JWT_SECRET || "sua_chave_secreta_aqui_123";
const PORT = process.env.PORT || 10000;


function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).json({ error: "Acesso negado." });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuarioLogado = decoded;
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
            data: { nome, email, senha: senhaHash }
        });
        res.status(201).json(novoUsuario);
    } catch (error) {
        console.error("ERRO NO CADASTRO:", error);
        res.status(500).json({ error: "Erro ao criar conta. Email já existe?" });
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await prisma.usuarios.findUnique({ where: { email } });

        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        const token = jwt.sign({ id: usuario.id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, user: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
    } catch (error) {
        console.error("ERRO NO LOGIN:", error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
});

// Buscar Saldo (Corrigido para converter ID para Number)
app.get('/usuarios/:id/saldo', verificarToken, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const transacoes = await prisma.transacoes.findMany({ where: { userId } });

        const total = transacoes.reduce((acc, t) => {
            return t.tipo === 'entrada' ? acc + t.valor : acc - t.valor;
        }, 0);

        res.json({ total });
    } catch (error) {
        console.error("ERRO AO BUSCAR SALDO:", error);
        res.status(500).json({ error: "Erro ao calcular saldo." });
    }
});

// --- ROTAS DE TRANSAÇÕES ---

app.get('/transacoes/:userId', verificarToken, async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const lista = await prisma.transacoes.findMany({
            where: { userId },
            orderBy: { data: 'desc' }
        });
        res.json(lista);
    } catch (error) {
        console.error("ERRO AO BUSCAR TRANSAÇÕES:", error);
        res.status(500).json({ error: "Erro ao carregar histórico." });
    }
});

app.post('/transacoes', verificarToken, async (req, res) => {
    try {
        const { descricao, valor, tipo, userId, data } = req.body;
        const nova = await prisma.transacoes.create({
            data: {
                descricao,
                valor: parseFloat(valor),
                tipo,
                data: data ? new Date(data) : new Date(),
                userId: Number(userId)
            }
        });
        res.status(201).json(nova);
    } catch (error) {
        console.error("ERRO AO CRIAR TRANSAÇÃO:", error);
        res.status(500).json({ error: "Erro ao criar transação." });
    }
});

app.delete('/transacoes/:id', verificarToken, async (req, res) => {
    try {
        await prisma.transacoes.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Transação removida." });
    } catch (error) {
        console.error("ERRO AO APAGAR TRANSAÇÃO:", error);
        res.status(500).json({ error: "Erro ao apagar." });
    }
});

// --- ROTAS DE INVESTIMENTOS ---

app.get('/investimentos/:userId', verificarToken, async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const lista = await prisma.investimento.findMany({ where: { userId } });
        res.json(lista);
    } catch (error) {
        console.error("ERRO AO BUSCAR INVESTIMENTOS:", error);
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
        console.error("ERRO AO CRIAR INVESTIMENTO:", error);
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
        console.error("ERRO AO ATUALIZAR INVESTIMENTO:", error);
        res.status(500).json({ error: "Erro ao atualizar." });
    }
});

app.delete('/investimentos/:id', verificarToken, async (req, res) => {
    try {
        await prisma.investimento.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Removido com sucesso." });
    } catch (error) {
        console.error("ERRO AO APAGAR INVESTIMENTO:", error);
        res.status(500).json({ error: "Erro ao apagar." });
    }
});
// --- ROTA: VERIFICAR E-MAIL PARA RECUPERAÇÃO ---
app.post('/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    const usuario = await prisma.usuarios.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "E-mail não encontrado." });
    res.json({ message: "OK" });
});

// --- ROTA: REDEFINIR A SENHA ---
app.post('/redefinir-senha', async (req, res) => {
    const { email, novaSenha } = req.body;
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuarios.update({ where: { email }, data: { senha: senhaHash } });
    res.json({ message: "Senha alterada!" });
});

// Inicialização do Servidor
async function startServer() {
    try {
        await prisma.$connect();
        console.log('✅ Conectado ao banco de dados com sucesso!');
        app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
    } catch (error) {
        console.error('❌ Erro fatal ao conectar ao banco:', error);
        process.exit(1);
    }
}

startServer();