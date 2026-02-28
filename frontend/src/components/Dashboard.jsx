import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
// Adicionamos 'Calendar' na lista de ícones abaixo
import {
    ArrowUpCircle, ArrowDownCircle, DollarSign, LogOut,
    TrendingUp, Trash2, Plus, RefreshCw, Edit,
    ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// ESTA É A LINHA PRINCIPAL QUE ESTAVA FALTANDO:
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

import { toast } from 'react-toastify';
import axios from 'axios';
import Swal from 'sweetalert2';

// Daqui para baixo continua o seu código normal...
export function Dashboard({ user, saldo, onLogout, atualizarSaldo }) {
    if (!user) return <div className="p-8 text-center">Carregando usuário...</div>;

    const [carteiraAberta, setCarteiraAberta] = useState(true);
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [historico, setHistorico] = useState([]);
    const [investimentosTotal, setInvestimentosTotal] = useState(0);
    const [listaInvestimentos, setListaInvestimentos] = useState([]);
    const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
    const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth().toString());
    const [dolar, setDolar] = useState(5.20);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

    const fetchDolar = useCallback(async () => {
        try {
            // Usando AwesomeAPI que é gratuita e não exige Token
            const response = await axios.get(`https://economia.awesomeapi.com.br/last/USD-BRL`);

            if (response.data && response.data.USDBRL) {
                const cotacao = parseFloat(response.data.USDBRL.bid);
                setDolar(cotacao);
                console.log("Cotação atualizada via AwesomeAPI:", cotacao);
            }
        } catch (err) {
            console.warn("Erro ao buscar dólar (AwesomeAPI), mantendo valor padrão.");
            // Não fazemos nada, o state já inicia com 5.50
        }
    }, []);
    const fetchCripto = async (ticker = "BTC") => {
        try {
            const symbol = `${ticker}BRL`;
            const targetUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;

            // O AllOrigins contorna o erro 403/CORS
            const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);

            // AllOrigins retorna os dados dentro de 'contents' como string
            const data = JSON.parse(response.data.contents);

            if (data.price) {
                setPrecoCripto(data.price);
            }
        } catch (error) {
            console.error("Erro Binance (Cripto):", error.message);
        }
    };

    const transacoesFiltradas = React.useMemo(() => {
        return (historico || []).filter(item => {
            // Pega a data do banco (createdAt ou data)
            const dataRaw = item.data || item.createdAt;
            if (!dataRaw) return false;

            // Extraímos apenas a parte "AAAA-MM-DD" ignorando o resto (T00:00:00...)
            const apenasData = dataRaw.split('T')[0];
            const partes = apenasData.split('-'); // [0]=Ano, [1]=Mês, [2]=Dia

            const anoTransacao = parseInt(partes[0]);
            // No banco o mês vem 01, 02... No Select Janeiro é 0, então subtraímos 1
            const mesTransacao = parseInt(partes[1]) - 1;

            const mesAlvo = parseInt(mesSelecionado);
            const anoAlvo = parseInt(anoSelecionado);

            // Comparação puramente numérica de texto extraído
            return mesTransacao === mesAlvo && anoTransacao === anoAlvo;
        });
    }, [historico, mesSelecionado, anoSelecionado]);

    const resumoFinanceiro = React.useMemo(() => {
        let entradas = 0;
        let saidas = 0;

        transacoesFiltradas.forEach((item) => {
            const valor = Number(item.valor || 0);

            if (valor > 0) entradas += valor;
            if (valor < 0) saidas += Math.abs(valor);
        });

        return {
            entradas,
            saidas,
            saldo: entradas - saidas
        };
    }, [transacoesFiltradas]);
    // 2. Calcula os totais baseados no que foi filtrado acima
    const totalEntradasMes = React.useMemo(() =>
        transacoesFiltradas
            .filter(t => t.tipo === 'entrada')
            .reduce((acc, t) => acc + Number(t.valor || 0), 0)
        , [transacoesFiltradas]);

    const totalSaidasMes = React.useMemo(() =>
        transacoesFiltradas
            .filter(t => t.tipo === 'saida' || t.tipo === 'despesa')
            .reduce((acc, t) => acc + Number(t.valor || 0), 0)
        , [transacoesFiltradas]);

    // 3. Monta os dados do Gráfico de Pizza (Pie)
    const dadosTransacoes = React.useMemo(() => [
        { name: 'Receitas', value: totalEntradasMes, tipo: 'entrada' },
        { name: 'Despesas', value: totalSaidasMes, tipo: 'saida' }
    ], [totalEntradasMes, totalSaidasMes]);

    const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const carregarHistorico = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`https://gerenciador-financeiro-1-6cpc.onrender.com/transacoes/${Number(user.id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistorico(response.data);
        } catch (error) { console.error("Erro ao buscar histórico:", error); }
    }, [user.id]);

    const CORES = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];
    const CORES_TIPOS_INV = {
        'B3': '#06b6d4',     // Ciano
        'BTC': '#f59e0b',    // Laranja
        'CDB': '#10b981',    // Verde
        'STOCKS': '#8b5cf6', // Roxo (ou a cor que preferir)
    };

    // Gráfico 1: Investimentos
    // Gráfico 1: Investimentos (Com o campo 'tipo' para a cor)
    const dadosInvestimentos = React.useMemo(() => {
        const lista = Array.isArray(listaInvestimentos) ? listaInvestimentos : [];

        const agrupado = lista.reduce((acc, inv) => {
            const tipo = (inv.tipo || 'OUTROS').toUpperCase();

            // IMPORTANTE: Aqui pegamos o valor que já está na tabela.
            // Como 'carregarInvestimentos' já faz Valor * Qtd, aqui apenas lemos o resultado.
            const valorTotalJaCalculado = typeof inv.valor === 'string'
                ? parseFloat(inv.valor.replace(',', '.'))
                : Number(inv.valor);

            if (!acc[tipo]) acc[tipo] = 0;
            acc[tipo] += (valorTotalJaCalculado || 0);
            return acc;
        }, {});

        return Object.keys(agrupado).map(tipo => ({
            name: tipo,
            value: agrupado[tipo],
            tipo: tipo
        }));
    }, [listaInvestimentos]);
    // Gráfico 2: Transações (Fixando Verde e Vermelho)

    const carregarInvestimentos = useCallback(async () => {
        const token = localStorage.getItem('token');
        const DOLAR_FIXO = 5.20; // O valor que você definiu

        try {
            // Quando você hospedar seu backend, troque essa URL
            const response = await axios.get(`https://gerenciador-financeiro-1-6cpc.onrender.com/investimentos/${Number(user.id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const investimentosDoBanco = response.data;
            let totalAcumulado = 0;

            const listaAtualizada = await Promise.all(investimentosDoBanco.map(async (inv) => {
                let valorAtualizado = Number(inv.valor);

                // Limpa o nome do ativo para não dar erro na API (remove emojis e espaços)
                let ticker = inv.nome.split(' - ')[0]
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .trim()
                    .toUpperCase();

                try {
                    // Busca preço atual na Brapi (Ações/Stocks)
                    if (inv.tipo === 'B3' || inv.tipo === 'STOCKS' || inv.nome.includes('[USD]')) {
                        const resBrapi = await axios.get(`https://brapi.dev/api/quote/${ticker}?token=jrNEWthxAUBTdjY1tsq5W9`);

                        if (resBrapi.data?.results?.[0]) {
                            const precoUnitario = Number(resBrapi.data.results[0].regularMarketPrice) || 0;
                            const qtd = Number(inv.quantidade) || 1;

                            if (inv.tipo === 'STOCKS' || inv.nome.includes('[USD]')) {
                                // USA O SEU DÓLAR DE 5.20
                                valorAtualizado = precoUnitario * DOLAR_FIXO * qtd;
                            } else {
                                valorAtualizado = precoUnitario * qtd;
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Erro ao atualizar preço de " + ticker + ", mantendo valor original.");
                }

                totalAcumulado += valorAtualizado;
                return { ...inv, valor: valorAtualizado };
            }));

            setListaInvestimentos(listaAtualizada);
            setInvestimentosTotal(totalAcumulado);
            setDolar(5.20); // Atualiza o mostrador da tela

        } catch (error) {
            console.error("Erro ao carregar dados do banco:", error);
        }
    }, [user.id]);

    useEffect(() => {
        const inicializar = async () => {
            await fetchDolar(); // Primeiro pega o dólar
            carregarHistorico();
            carregarInvestimentos(); // Agora os investimentos usam o dólar atualizado
        };
        inicializar();
    }, [fetchDolar, carregarHistorico, carregarInvestimentos]);

    const dividendosEstimados = React.useMemo(() => {
        const lista = Array.isArray(listaInvestimentos) ? listaInvestimentos : [];

        // Simulação de Dividend Yield médio mensal (Pode ser ajustado ou vir de uma API futura)
        // FIIs (B3): ~0.8% ao mês | STOCKS: ~0.3% ao mês
        return lista.reduce((acc, inv) => {
            const valorAtivo = Number(inv.valor) || 0;
            let estimativaAtivo = 0;

            if (inv.tipo === 'B3') {
                estimativaAtivo = valorAtivo * 0.008; // Estimativa de 0.8%
            } else if (inv.tipo === 'STOCKS') {
                estimativaAtivo = valorAtivo * 0.003; // Estimativa de 0.3%
            }

            return acc + estimativaAtivo;
        }, 0);
    }, [listaInvestimentos]);

    const handleEditarInvestimento = async (inv) => {
        const isCDB = inv.tipo === 'CDB';

        // Preparar o valor inicial que aparecerá no campo de texto
        const valorInicial = isCDB
            ? Number(inv.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
            : inv.quantidade;

        const { value: novoValorOuQtd } = await Swal.fire({
            title: `Editar ${inv.nome}`,
            input: 'text',
            inputLabel: isCDB ? 'Novo Valor Total (R$)' : 'Nova Quantidade',
            inputValue: valorInicial, // <--- Aqui ele mostrará os 6.500,00 em vez de 1
            showCancelButton: true,
            confirmButtonText: 'Salvar Alteração',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) return 'Você precisa digitar um valor!';
            }
        });

        if (novoValorOuQtd) {
            try {
                const token = localStorage.getItem('token');
                // Limpa pontos de milhar e troca vírgula por ponto para o banco
                const valorTratado = parseFloat(novoValorOuQtd.replace(/\./g, '').replace(',', '.'));

                const dadosAtualizados = { ...inv };

                if (isCDB) {
                    // No CDB, atualizamos o valor e mantemos a quantidade como 1
                    dadosAtualizados.valor = valorTratado;
                    dadosAtualizados.quantidade = 1;
                } else {
                    // Em Ações/Cripto, atualizamos a quantidade e deixamos o sistema recalcular o valor
                    dadosAtualizados.quantidade = valorTratado;
                }

                await axios.put(`https://gerenciador-financeiro-1-6cpc.onrender.com/investimentos/${inv.id}`,
                    dadosAtualizados,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                toast.success("Investimento atualizado!");
                carregarInvestimentos(); // Atualiza a tela

            } catch (error) {
                console.error("Erro ao editar:", error);
                toast.error("Erro ao salvar alterações.");
            }
        }
    };

    const handleVerificarExtrato = async () => {
        const agora = new Date();
        const meses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];

        // 1. Modal para selecionar Mês e Ano
        const { value: busca } = await Swal.fire({
            title: 'Selecionar Período',
            html: `
            <div style="display: flex; gap: 10px; padding: 10px;">
                <select id="swal-mes" class="swal2-select" style="flex: 1; margin: 0;">
                    ${meses.map((m, i) => `<option value="${i}" ${i === agora.getMonth() ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <select id="swal-ano" class="swal2-select" style="flex: 1; margin: 0;">
                    <option value="${agora.getFullYear()}">${agora.getFullYear()}</option>
                    <option value="${agora.getFullYear() - 1}">${agora.getFullYear() - 1}</option>
                </select>
            </div>
        `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Visualizar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    mes: parseInt(document.getElementById('swal-mes').value),
                    ano: parseInt(document.getElementById('swal-ano').value)
                }
            }
        });

        if (!busca) return; // Usuário cancelou

        const totalEntradas = transacoesFiltradas
            .filter(t => t.tipo === 'entrada')
            .reduce((acc, t) => acc + Number(t.valor), 0);

        const totalSaidas = transacoesFiltradas
            .filter(t => t.tipo === 'saida')
            .reduce((acc, t) => acc + Number(t.valor), 0);

        // 3. Exibe o extrato do período selecionado
        const htmlTabela = `
        <div style="text-align: left; font-family: sans-serif;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                <span style="color: #059669;"><b>Entradas:</b> R$ ${totalEntradas.toLocaleString('pt-BR')}</span>
                <span style="color: #e11d48;"><b>Saídas:</b> R$ ${totalSaidas.toLocaleString('pt-BR')}</span>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #eee;">
                            <th style="padding: 8px; text-align: left;">Descrição</th>
                            <th style="padding: 8px; text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transacoesFiltradas.map(t => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px;">${t.descricao}</td>
                                <td style="padding: 8px; text-align: right; color: ${t.tipo === 'entrada' ? '#059669' : '#e11d48'}; font-weight: bold;">
                                    ${t.tipo === 'entrada' ? '+' : '-'} R$ ${Number(t.valor).toLocaleString('pt-BR')}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${transacoesFiltradas.length === 0 ? '<p style="text-align:center; color: #94a3b8; margin-top: 20px;">Nenhuma movimentação neste período.</p>' : ''}
        </div>
    `;

        Swal.fire({
            title: `Extrato: ${meses[busca.mes]} / ${busca.ano}`,
            html: htmlTabela,
            width: '550px',
            confirmButtonColor: '#0f172a'
        });
    };

    const handleNovoInvestimento = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Novo Investimento',
            html: `
    <div style="display: flex; flex-direction: column; gap: 15px; text-align: left; padding: 10px;">
        <div>
            <label style="display: block; font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 5px; text-transform: uppercase;">1. Tipo de Ativo</label>
            <select id="swal-tipo" class="swal2-select" style="width: 100%; margin: 0; height: 40px; border-radius: 8px;">
                <option value="B3">Ação / FII (Brasil - B3)</option>
                <option value="STOCKS">Stocks / REITs (Exterior - US$)</option>
                <option value="BTC">Criptomoedas</option>
                <option value="CDB">CDB / Renda Fixa</option>
            </select>
        </div>
        <div>
            <label style="display: block; font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 5px; text-transform: uppercase;">2. Ticker (Ex: ETH, SOL, AAPL, PETR4)</label>
            <input id="swal-input1" class="swal2-input" style="width: 100%; margin: 0; height: 40px; border-radius: 8px;" placeholder="Ticker ou Nome">
        </div>
        <div>
            <label style="display: block; font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 5px; text-transform: uppercase;">3. Quantidade</label>
            <input id="swal-input2" class="swal2-input" style="width: 100%; margin: 0; height: 40px; border-radius: 8px;" placeholder="Ex: 0.5 ou 10">
        </div>
    </div>`,
            showCancelButton: true,
            confirmButtonText: 'Sincronizar',
            preConfirm: () => {
                const tipo = document.getElementById('swal-tipo').value;
                const ticker = document.getElementById('swal-input1').value.toUpperCase().trim();
                const qtd = document.getElementById('swal-input2').value;
                if (!ticker || !qtd) return Swal.showValidationMessage('Preencha todos os campos!');
                return { tipo, ticker, qtd };
            }
        });

        if (formValues) {
            try {
                let precoUnitario = 0;
                let nomeFinal = "";
                let valorTotalAtivo = 0;
                const tokenBrapi = "jrNEWthxAUBTdjY1tsq5W9";
                const quantidadeInformada = parseFloat(formValues.qtd.replace(/\./g, '').replace(',', '.'));

                // 1. BUSCA COTAÇÃO DO DÓLAR PARA CONVERSÕES
                let cotacaoDolarAtual = 5.50;
                try {
                    const resDolar = await axios.get(`https://brapi.dev/api/v2/currency?currency=USD&token=${tokenBrapi}`);
                    cotacaoDolarAtual = resDolar.data.currency[0].bidPrice || resDolar.data.currency[0].bid;
                } catch (e) { console.error("Erro dólar, usando padrão"); }

                // --- LÓGICA DE CRIPTO (CORRIGIDA) ---
                if (formValues.tipo === 'BTC') {
                    const tickerLimpo = formValues.ticker.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                    toast.info(`Buscando ${tickerLimpo} na Binance...`);

                    try {
                        // Tenta BRL primeiro
                        try {
                            const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${tickerLimpo}BRL`);
                            precoUnitario = Number(res.data.price);
                        } catch {
                            // Se falhar BRL, tenta USDT
                            const resUsdt = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${tickerLimpo}USDT`);
                            precoUnitario = Number(resUsdt.data.price) * cotacaoDolarAtual;
                        }
                        // IMPORTANTE: Definir o nome com o ticker real digitado
                        nomeFinal = `Cripto - ${tickerLimpo}`;
                        valorTotalAtivo = Number((precoUnitario * quantidadeInformada).toFixed(2));
                    } catch (err) {
                        throw new Error("Ticker de Cripto não encontrado.");
                    }
                }

                // --- LÓGICA DE STOCKS ---
                else if (formValues.tipo === 'STOCKS') {
                    const res = await axios.get(`https://brapi.dev/api/quote/${formValues.ticker}?token=${tokenBrapi}`);
                    // Use o 'dolar' do seu state em vez de buscar da Brapi de novo
                    precoUnitario = res.data.results[0].regularMarketPrice * (dolar || 5.50);
                    nomeFinal = `🇺🇸 ${formValues.ticker} - ${res.data.results[0].longName}`;
                    valorTotalAtivo = Number((precoUnitario * quantidadeInformada).toFixed(2));
                }

                // --- LÓGICA DE B3 ---
                else if (formValues.tipo === 'B3') {
                    const tickerBase = formValues.ticker.replace('.SA', '');
                    const res = await axios.get(`https://brapi.dev/api/quote/${tickerBase}?token=${tokenBrapi}`);
                    precoUnitario = res.data.results[0].regularMarketPrice;
                    nomeFinal = `${tickerBase} - ${res.data.results[0].longName}`;
                    valorTotalAtivo = Number((precoUnitario * quantidadeInformada).toFixed(2));
                }

                // --- LÓGICA DE CDB ---
                else if (formValues.tipo === 'CDB') {
                    nomeFinal = `CDB - ${formValues.ticker}`;
                    valorTotalAtivo = quantidadeInformada;
                    precoUnitario = valorTotalAtivo;
                }

                // --- SALVAMENTO ---
                const token = localStorage.getItem('token');
                const ativoExistente = listaInvestimentos.find(inv =>
                    inv.tipo === formValues.tipo &&
                    inv.nome.toUpperCase().includes(formValues.ticker)
                );

                if (ativoExistente) {
                    const novaQtd = ativoExistente.tipo === 'CDB' ? 1 : Number(ativoExistente.quantidade) + quantidadeInformada;
                    const novoValor = ativoExistente.tipo === 'CDB' ? Number(ativoExistente.valor) + valorTotalAtivo : Number((precoUnitario * novaQtd).toFixed(2));

                    await axios.put(`https://gerenciador-financeiro-1-6cpc.onrender.com/investimentos/${ativoExistente.id}`, {
                        ...ativoExistente, quantidade: novaQtd, valor: novoValor
                    }, { headers: { Authorization: `Bearer ${token}` } });
                } else {
                    await axios.post(`https://gerenciador-financeiro-1-6cpc.onrender.com/investimentos`, {
                        nome: nomeFinal, valor: valorTotalAtivo,
                        quantidade: formValues.tipo === 'CDB' ? 1 : quantidadeInformada,
                        tipo: formValues.tipo,
                        userId: Number(user.id)
                    }, { headers: { Authorization: `Bearer ${token}` } });
                }

                Swal.fire('Sucesso!', `${nomeFinal} atualizado.`, 'success');
                setTimeout(() => carregarInvestimentos(), 500);

            } catch (error) {
                Swal.fire('Erro', 'Verifique o Ticker ou sua conexão.', 'error');
            }
        }
    };
    const handleDeleteTransacao = async (id) => {
        try {
            await axios.delete(`https://gerenciador-financeiro-1-6cpc.onrender.com/transacoes/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            carregarHistorico(); atualizarSaldo();
        } catch (error) { toast.error("Erro ao excluir"); }
    };

    const handleDeleteInvestimento = async (id) => {
        const confirm = await Swal.fire({ title: 'Excluir?', showCancelButton: true, confirmButtonColor: '#d33' });
        if (confirm.isConfirmed) {
            try {
                await axios.delete(`https://gerenciador-financeiro-1-6cpc.onrender.com/investimentos/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                carregarInvestimentos();
            } catch (error) { toast.error("Erro ao remover"); }
        }
    };

    const handleNovaTransacao = async (tipo) => {
        if (!valor || !descricao || !dataTransacao) {
            return toast.warn("Preencha todos os campos!");
        }

        try {
            const token = localStorage.getItem('token');
            const valorNumerico = parseFloat(valor.replace(',', '.'));

            // ENVIAMOS A STRING PURA (Ex: "2026-01-15")
            // Não use "new Date(dataTransacao)" aqui, pois o fuso horário vai estragar a data.
            await axios.post(`https://gerenciador-financeiro-1-6cpc.onrender.com/transacoes`, {
                descricao: descricao,
                valor: valorNumerico,
                tipo: tipo,
                userId: Number(user.id),
                data: dataTransacao // String direta do input type="date"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`${tipo === 'entrada' ? 'Receita' : 'Despesa'} registada!`);
            setValor('');
            setDescricao('');

            carregarHistorico();
            if (atualizarSaldo) atualizarSaldo();

        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao comunicar com o servidor.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Olá, {user?.nome} 👋</h1>
                    <p className="text-slate-500 text-sm">Gerenciador Financeiro</p>
                </div>
                <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-100 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                </Button>
            </div>

            <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3 mb-8">
                {/* CARD DE SALDO BANCÁRIO */}
                <Card style={{ backgroundColor: saldo >= 0 ? '#059669' : '#e11d48' }} className="text-white border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs uppercase opacity-80">Saldo Bancário</CardTitle>
                        <DollarSign size={18} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">R$ {(saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>

                {/* CARD DE MOVIMENTAÇÃO */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500">Nova Movimentação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Input
                            placeholder="O que foi?"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Input
                            placeholder="Valor R$"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Input
                            type="date"
                            value={dataTransacao}
                            onChange={(e) => setDataTransacao(e.target.value)}
                            className="h-8 text-sm text-slate-500"
                        />
                        <div className="flex gap-2">
                            <Button onClick={() => handleNovaTransacao('entrada')} className="flex-1 bg-emerald-600 h-8">
                                <ArrowUpCircle size={16} />
                            </Button>
                            <Button onClick={() => handleNovaTransacao('saida')} className="flex-1 bg-rose-600 h-8">
                                <ArrowDownCircle size={16} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD DE INVESTIMENTOS COM DIVIDENDOS INTEGRADOS */}
                <Card style={{ backgroundColor: '#0f172a', color: 'white' }} className="border-none shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-cyan-400">
                        <TrendingUp size={60} />
                    </div>

                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Patrimônio em Ativos</CardTitle>
                    </CardHeader>

                    <CardContent className="relative z-10 space-y-4">
                        {/* Valor Total Investido */}
                        <div>
                            <div className="text-3xl font-black text-white">
                                R$ {investimentosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Linha Divisória Sutil */}
                        <div className="border-t border-slate-700/50 pt-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Projeção Mensal de Dividendos</p>
                                    <div className="text-lg font-bold text-emerald-400">
                                        R$ {dividendosEstimados.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </div>
                                </div>
                                <TrendingUp size={20} className="text-emerald-500/50" />
                            </div>
                        </div>

                        <Button onClick={handleNovoInvestimento} className="w-full h-9 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold border-none transition-all">
                            <Plus size={14} className="mr-2" /> SINCRONIZAR NOVO ATIVO
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-8">

                {/* CARD DE TRANSAÇÕES (RECEITAS VS DESPESAS) */}
                <Card className="shadow-md border-slate-200 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50">
                        <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Resumo de {mesesNomes[parseInt(mesSelecionado)]} / {anoSelecionado}
                        </CardTitle>

                        {/* Filtros de Mês e Ano */}
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                            <Calendar size={12} className="text-slate-400" />

                            {/* Seletor de Mês */}
                            <select
                                value={mesSelecionado}
                                onChange={(e) => setMesSelecionado(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                {mesesNomes.map((month, index) => (
                                    <option key={index} value={index.toString()}>{month}</option>
                                ))}
                            </select>

                            <span className="text-slate-300">|</span>

                            {/* Seletor de Ano */}
                            <select
                                value={anoSelecionado}
                                onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                                className="bg-transparent text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
                            >
                                {[2024, 2025, 2026].map((ano) => (
                                    <option key={ano} value={ano}>{ano}</option>
                                ))}
                            </select>
                        </div>
                    </CardHeader>

                    <CardContent className="h-[350px] w-full pt-6">
                        {transacoesFiltradas.length > 0 ? (
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dadosTransacoes}
                                            innerRadius={70}
                                            outerRadius={90}
                                            dataKey="value"
                                            nameKey="name"
                                            paddingAngle={5}
                                        >
                                            {dadosTransacoes.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.tipo === 'entrada' ? '#10b981' : '#f43f5e'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full items-center justify-center text-slate-400 gap-2">
                                <Calendar size={24} className="opacity-20" />
                                <p className="text-xs italic">Nenhum dado encontrado para este período.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* CARD DE INVESTIMENTOS (POR ATIVO) */}
                <Card className="shadow-md border-slate-200 bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase">Distribuição por Ativo</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {dadosInvestimentos && dadosInvestimentos.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dadosInvestimentos}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                    >
                                        {dadosInvestimentos.map((entry, index) => (
                                            <Cell
                                                key={`cell-inv-${index}`}
                                                // Usa a cor do tipo, se não existir na lista, usa uma cor padrão
                                                fill={CORES_TIPOS_INV[entry.tipo] || '#94a3b8'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}`}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-400 italic">Nenhum investimento cadastrado</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
                <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
                    <CardHeader className="border-b bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-md font-bold text-slate-700">Extrato </CardTitle>
                                <p className="text-[10px] text-slate-500 uppercase">Movimentações recentes</p>
                            </div>
                            <Button
                                onClick={() => setModalExtratoAberto(true)}
                                variant="outline"
                                className="h-8 text-[11px] font-bold border-slate-300 hover:bg-slate-100"
                            >
                                VER EXTRATO DETALHADO
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {historico
                                    .sort((a, b) => new Date(b.data || b.createdAt) - new Date(a.data || a.createdAt)) // Ordena: Mais recente no topo
                                    .map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="text-slate-600 font-medium">{t.descricao}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {(() => {
                                                        const d = new Date(t.data || t.createdAt);
                                                        // Adiciona a diferença de fuso para que a data não retroceda
                                                        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                                                        return d.toLocaleDateString('pt-BR');
                                                    })()}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.tipo === 'entrada' ? '+' : '-'} R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleDeleteTransacao(t.id)}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>

                        {historico.length === 0 && (
                            <div className="p-10 text-center text-slate-400 text-xs italic">
                                Nenhuma movimentação encontrada.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-md border-slate-200 overflow-hidden bg-white">
                    <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between cursor-pointer"
                        onClick={() => setCarteiraAberta(!carteiraAberta)}>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-md">Carteira de Ativos</CardTitle>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                {listaInvestimentos.length} ativos
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <RefreshCw size={14} className="text-slate-400 cursor-pointer hover:rotate-180 transition-all" onClick={(e) => { e.stopPropagation(); carregarInvestimentos(); }} />
                            {carteiraAberta ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                    </CardHeader>

                    {/* ANIMAÇÃO DE ABRIR/FECHAR E SCROLL */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${carteiraAberta ? 'max-h-[500px] overflow-y-auto' : 'max-h-0'}`}>
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3">Ticker / Empresa</th>
                                        <th className="px-6 py-3 text-right">Valor Total</th>
                                        <th className="px-6 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {listaInvestimentos.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                {/* Título: Ex: PETR4 ou CDB */}
                                                <div className="font-bold text-slate-800">
                                                    {inv.nome.split(' - ')[0]}
                                                </div>

                                                {/* Subtítulo Dinâmico: Quantidade ou Tipo de Renda */}
                                                <div className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">
                                                    {inv.tipo === 'CDB'
                                                        ? 'Renda Fixa'
                                                        : `${inv.quantidade?.toLocaleString('pt-BR')} unidades`
                                                    }
                                                </div>

                                                {/* Nome da Empresa/Banco: Ex: Petroleo Brasileiro ou Mercado Pago */}
                                                {inv.nome.includes(' - ') && (
                                                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                        {inv.nome.split(' - ')[1]}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-cyan-700">
                                                R$ {Number(inv.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => handleEditarInvestimento(inv)} className="text-slate-400 hover:text-cyan-600"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteInvestimento(inv.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </div>
                </Card>
            </div>
            <Dialog open={modalExtratoAberto} onOpenChange={setModalExtratoAberto}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden bg-white p-0 border border-slate-200 shadow-2xl">
                    {/* Cabeçalho Claro e Minimalista */}
                    <DialogHeader className="p-6 bg-white border-b border-slate-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-800 tracking-tight">
                                    Extrato Detalhado
                                </DialogTitle>
                                <p className="text-slate-500 text-sm">
                                    Movimentações de {mesesNomes[parseInt(mesSelecionado)]}
                                </p>
                            </div>

                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <select
                                    value={mesSelecionado}
                                    onChange={(e) => setMesSelecionado(e.target.value)}
                                    className="pl-10 pr-4 h-10 w-[180px] rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer hover:border-slate-300"
                                >
                                    {mesesNomes.map((month, index) => (
                                        <option key={index} value={index.toString()}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] bg-white">
                        {/* Cards de Resumo com Cores Suaves */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 bg-emerald-100 rounded-full">
                                        <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                    <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest">Entradas</span>
                                </div>
                                <p className="text-2xl font-black text-emerald-700">
                                    R$ {totalEntradasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 bg-rose-100 rounded-full">
                                        <ArrowDownCircle className="h-3.5 w-3.5 text-rose-600" />
                                    </div>
                                    <span className="text-[10px] text-rose-600 uppercase font-bold tracking-widest">Saídas</span>
                                </div>
                                <p className="text-2xl font-black text-rose-700">
                                    R$ {totalSaidasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Tabela Clean */}
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição e Data</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transacoesFiltradas.length > 0 ? (
                                        transacoesFiltradas.map((t) => (
                                            <tr key={t.id} className="group hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                                                        {t.descricao}
                                                    </div>
                                                    <div className="text-[10px] flex items-center gap-1 text-slate-400 mt-1">
                                                        {(() => {
                                                            const d = new Date(t.createdAt || t.data);
                                                            // Ajuste para evitar que a data mude devido ao fuso horário
                                                            if (!(t.createdAt || t.data).includes('T')) {
                                                                d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                                                            }
                                                            return isNaN(d.getTime()) ? "Data não disponível" : d.toLocaleDateString('pt-BR');
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold text-base ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.tipo === 'entrada' ? '+' : '-'} R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                        <Calendar size={32} />
                                                    </div>
                                                    <p className="text-slate-400 text-sm font-medium">Nenhum registro encontrado.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}