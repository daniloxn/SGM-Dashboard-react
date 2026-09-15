import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import SondaDrillingAnimation from '../components/ui/SondaDrillingAnimation';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/wrong-password': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'E-mail ou senha incorretos.',
        'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
      };
      setError(msgs[err.code] || 'Erro ao fazer login. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-6xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Lado Esquerdo: Formulário de Autenticação */}
        <div className="lg:col-span-6 p-6 sm:p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/40">
          <div>
            {/* Logo e Cabeçalho */}
            <div className="flex items-center gap-3 mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">SGM Dashboard</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Sistema de Gestão de Manutenção</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Bem-vindo de volta</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Digite suas credenciais para acessar o painel operacional.
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3 text-sm font-semibold rounded-xl mt-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar no Sistema'}
              </button>
            </form>
          </div>

          <p className="text-slate-500 text-[11px] sm:text-xs mt-8 pt-4 border-t border-white/5">
            SGM Dashboard © {new Date().getFullYear()} • Gestão Inteligente de Frota & Oficina
          </p>
        </div>

        {/* Lado Direito: Animação Minimalista SVG da Sonda Diamec 232 */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 flex flex-col items-center justify-center relative p-3 sm:p-6 overflow-hidden">
          <div className="w-full flex flex-col items-center justify-center">
            <SondaDrillingAnimation />
            <div className="text-center mt-2 z-10">
              <span className="text-[11px] font-semibold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Epiroc Diamec 232 • Perfuração Subterrânea
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

