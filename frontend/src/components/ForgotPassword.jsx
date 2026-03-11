import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

export function ForgotPassword({ onBackToLogin }) {
    const [email, setEmail] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [etapa, setEtapa] = useState(1); // 1: Verificar e-mail, 2: Nova Senha
    const API_URL = 'https://gerenciador-financeiro-1-6cpc.onrender.com';

    const handleVerificarEmail = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/recuperar-senha`, { email });
            setEtapa(2);
            toast.success("Usuário localizado! Agora crie sua nova senha.");
        } catch (error) {
            toast.error(error.response?.data?.error || "E-mail não encontrado.");
        }
    };

    const handleRedefinir = async (e) => {
        e.preventDefault();
        if (novaSenha.length < 6) {
            toast.error("A senha deve ter no mínimo 6 caracteres.");
            return;
        }
        try {
            await axios.post(`${API_URL}/redefinir-senha`, { email, novaSenha });
            toast.success("Senha alterada! Você já pode entrar.");
            onBackToLogin();
        } catch (error) {
            toast.error("Erro ao atualizar senha.");
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mb-2">
                        <KeyRound className="text-white" />
                    </div>
                    <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
                    <CardDescription>
                        {etapa === 1 ? "Informe seu e-mail cadastrado" : "Digite sua nova senha de acesso"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {etapa === 1 ? (
                        <form onSubmit={handleVerificarEmail} className="space-y-4">
                            <div className="space-y-1">
                                <Label>E-mail</Label>
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600">Verificar E-mail</Button>
                        </form>
                    ) : (
                        <form onSubmit={handleRedefinir} className="space-y-4">
                            <div className="space-y-1">
                                <Label>Nova Senha</Label>
                                <Input
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-green-600">Atualizar Senha</Button>
                        </form>
                    )}
                    <button 
                        onClick={onBackToLogin} 
                        className="flex items-center justify-center w-full text-xs text-gray-500 hover:text-indigo-600 mt-4"
                    >
                        <ArrowLeft className="w-3 h-3 mr-1" /> Voltar ao Login
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}