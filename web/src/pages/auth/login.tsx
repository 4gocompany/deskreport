import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signIn } from '../../lib/auth-client';
import { Button } from '../../components/ui/button';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await signIn.email({
        email,
        password,
      });

      if (error) throw new Error(error.message || 'Erro ao entrar');
      if (data) {
        // Volta para onde o AuthGuard barrou, ex.: /cli/auth vindo do terminal
        const from = location.state?.from;
        navigate(from?.pathname === '/cli/auth' ? from.pathname + from.search : '/select-organization');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='h-screen w-screen flex items-center justify-center p-10 bg-zinc-950 text-zinc-900 dark:text-zinc-100'>
      <div className='flex flex-col items-center w-full max-w-sm'>
        <div className="py-6">
          <img src="/deskreport-logo.svg" alt="Logo" />
        </div>

        <div className='w-full border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl bg-white dark:bg-[#0f0f12]'>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
            <h1 className="text-xl font-bold tracking-tight text-center mb-2">
              Acesse sua conta
            </h1>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                {error}
              </div>
            )}

            <label className="block">
              <span className="block mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</span>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 bg-zinc-100 dark:bg-zinc-900 w-full py-2 rounded-xl outline-none ring-1 ring-transparent focus:ring-blue-500 border border-zinc-200 dark:border-zinc-800 transition-all text-sm"
                type="email"
                placeholder="exemplo@empresa.com"
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Senha</span>
                <a href="#" className="text-xs text-blue-600 dark:text-blue-500 hover:underline">Esqueci a senha</a>
              </span>
              <input
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 bg-zinc-100 dark:bg-zinc-900 w-full py-2 rounded-xl outline-none ring-1 ring-transparent focus:ring-blue-500 border border-zinc-200 dark:border-zinc-800 transition-all text-sm"
                type="password"
                placeholder="Sua senha"
              />
            </label>

            <Button type="submit" disabled={loading} className="w-full py-2.5 mt-2">
              {loading ? 'Aguarde...' : 'Entrar na plataforma'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          Ainda não tem conta?
          <button
            type="button"
            onClick={() => {
              navigate('/register');
            }}
            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Criar nova conta
          </button>
        </div>
      </div>
    </div>
  );
}