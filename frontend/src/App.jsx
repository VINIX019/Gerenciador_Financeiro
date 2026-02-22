import { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';

function App() {
  const [view, setView] = useState(() => {
    return localStorage.getItem('token') ? 'home' : 'login';
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [saldo, setSaldo] = useState(0);

  const buscarSaldo = async (userId) => {
    const token = localStorage.getItem('token');
    if (!token || !userId) return;

    try {
      const response = await axios.get(`https://gerenciador-financeiro-4lyf.onrender.com/usuarios/${userId}/saldo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSaldo(response.data.total);
    } catch (error) {
      console.error("Erro ao buscar saldo", error);
      if (error.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => {
    if (view === 'home' && user?.id) {
      buscarSaldo(user.id);
    }
  }, [view, user]);

  const handleLogin = async (email, senha) => {
    try {
      const response = await axios.post('https://gerenciador-financeiro-4lyf.onrender.com/login', { email, senha });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      setView('home');
      toast.success(`🚀 Bem-vindo, ${response.data.user.nome}!`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao conectar.");
    }
  };

  const handleRegister = async (nome, email, senha) => {
    try {
      await axios.post('https://gerenciador-financeiro-4lyf.onrender.com/usuarios', { nome, email, senha });
      toast.success("Conta criada com sucesso!");
      setView('login');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao realizar cadastro.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSaldo(0);
    setView('login');
    toast.info("Sessão encerrada");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans antialiased text-slate-900">
      {view === 'login' && <LoginScreen onLogin={handleLogin} onShowRegister={() => setView('register')} />}
      {view === 'register' && <RegisterScreen onRegister={handleRegister} onBackToLogin={() => setView('login')} />}
      
      {view === 'home' && user ? (
        <Dashboard 
          user={user} 
          saldo={saldo} 
          atualizarSaldo={() => buscarSaldo(user.id)} 
          onLogout={handleLogout} 
        />
      ) : view === 'home' && <div className="p-10 text-center">Carregando...</div>}

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}

export default App;