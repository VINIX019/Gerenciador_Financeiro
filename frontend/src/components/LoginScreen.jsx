import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export function LoginScreen({ onLogin, onShowRegister, onForgotPassword }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [lembrar, setLembrar] = useState(false);

    // 1. Efeito para carregar o e-mail caso o usuário tenha marcado "Lembrar" antes
    useEffect(() => {
        const emailSalvo = localStorage.getItem('usuario_lembrado');
        if (emailSalvo) {
            setEmail(emailSalvo);
            setLembrar(true);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validação básica
        if (!email || !senha) {
            toast.warn("Preencha todos os campos!");
            return;
        }

        // 2. Lógica de persistência do e-mail
        if (lembrar) {
            localStorage.setItem('usuario_lembrado', email);
        } else {
            localStorage.removeItem('usuario_lembrado');
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
                        {/* Campo E-mail */}
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@exemplo.com"
                                className="placeholder:text-gray-500 text-gray-900 bg-white"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* Campo Senha + Esqueci a Senha */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <button
                                    type="button"
                                    onClick={onForgotPassword} // Aciona a troca de view no App.jsx
                                    className="text-xs text-indigo-600 hover:underline font-medium"
                                >
                                    Esqueci a senha?
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Digite sua senha"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    className="pr-10 bg-white text-slate-900 placeholder:text-slate-500 border-slate-300"
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

                        {/* Checkbox Lembrar de Mim (HTML Nativo + Tailwind) */}
                        <div className="flex items-center space-x-2 py-1">
                            <input
                                type="checkbox"
                                id="lembrar"
                                checked={lembrar}
                                onChange={(e) => setLembrar(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            />
                            <label
                                htmlFor="lembrar"
                                className="text-sm font-medium text-gray-600 cursor-pointer select-none"
                            >
                                Lembrar meu e-mail
                            </label>
                        </div>

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Entrar
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">Novo por aqui?</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={onShowRegister}
                        >
                            Criar nova conta
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}