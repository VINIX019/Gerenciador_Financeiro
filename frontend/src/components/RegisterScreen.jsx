import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export function RegisterScreen({ onRegister, onBackToLogin }) {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const validarSenha = (s) => /[A-Z]/.test(s) && /[!@#$%^&*]/.test(s) && s.length >= 6;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validarSenha(senha)) {
            toast.error("Sua senha ainda é fraca demais!");
            return;
        }
        onRegister(nome, email, senha);
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                        <UserPlus className="text-white" />
                    </div>
                    <CardTitle className="text-2xl">Criar Conta</CardTitle>
                    <CardDescription>Cadastre-se para começar</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-1">
                            <Label>Nome</Label>
                            <Input
                                placeholder="Seu nome completo"
                                className="placeholder:text-gray-400 text-gray-900 bg-white"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>E-mail</Label>
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                className="placeholder:text-gray-400 text-gray-900 bg-white"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Senha</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Crie uma senha forte"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    className="pr-10 placeholder:text-gray-500 text-gray-900 bg-white"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] space-y-1 bg-gray-50 p-2 rounded border border-gray-100">
                                <p className={senha.length >= 6 ? 'text-green-600 font-bold' : 'text-gray-600'}>
                                    ● Mínimo 6 caracteres
                                </p>
                                <p className={/[A-Z]/.test(senha) ? 'text-green-600 font-bold' : 'text-gray-600'}>
                                    ● Uma letra maiúscula
                                </p>
                                <p className={/[!@#$%^&*]/.test(senha) ? 'text-green-600 font-bold' : 'text-gray-600'}>
                                    ● Um caractere especial
                                </p>
                            </div>
                        </div>
                        <Button type="submit" disabled={!validarSenha(senha)} className="w-full bg-blue-600 mt-4">Finalizar Cadastro</Button>
                        <button type="button" onClick={onBackToLogin} className="flex items-center justify-center w-full text-xs text-gray-500 hover:text-indigo-600 mt-2">
                            <ArrowLeft className="w-3 h-3 mr-1" /> Voltar ao Login
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}