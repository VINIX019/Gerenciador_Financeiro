import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export function LoginScreen({ onLogin, onShowRegister }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email || !senha) {
            toast.warn("Preencha todos os campos!");
            return;
        }
        onLogin(email, senha);
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-linear-to-br from-slate-100 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Acessar Conta</CardTitle>
                    <CardDescription>Entre com seu e-mail e senha</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                type="email"
                                placeholder="email@exemplo.com"
                                className="placeholder:text-gray-500 text-gray-900 bg-white" // Adicione aqui
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Digite sua senha" // Verifique se o texto está aqui!
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    /* Adicionamos text-slate-900 para a digitação e placeholder:text-slate-500 para o fundo */
                                    className="pr-10 bg-white text-slate-900 placeholder:text-slate-500 placeholder:opacity-100 border-slate-300"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Entrar</Button>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Novo por aqui?</span></div>
                        </div>
                        <Button type="button" variant="outline" className="w-full" onClick={onShowRegister}>Criar nova conta</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}