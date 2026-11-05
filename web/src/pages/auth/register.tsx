import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signUp } from '../../lib/auth-client';
import { Button } from '../../components/ui/button';
import { Check, CreditCard, Shield, Rocket, Zap, Crown, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const plans = {
    launch: {
        name: 'Launch',
        price: 'R$ 0',
        icon: Rocket,
        color: 'from-blue-500 to-cyan-500',
        features: ['Até 5 usuários', 'Projetos ilimitados', '1GB armazenamento']
    },
    core: {
        name: 'Core',
        price: 'R$ 39',
        icon: Zap,
        color: 'from-purple-500 to-pink-500',
        features: ['Tudo do Launch', 'Permissões custom', 'Suporte prioritário']
    },
    scale: {
        name: 'Scale',
        price: 'R$ 29',
        icon: Crown,
        color: 'from-amber-400 to-orange-600',
        features: ['Tudo do Core', 'API completa', 'WhatsApp CRM']
    }
};

type PlanKey = keyof typeof plans;

export function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planKey = (searchParams.get('plan') as PlanKey) || 'launch';
    const plan = plans[planKey] || plans.launch;

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        cardName: '',
        cardNumber: '',
        expiry: '',
        cvc: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (step === 1 && (!formData.name || !formData.email || !formData.password)) {
            setError('Preencha os dados básicos para continuar');
            return;
        }
        setError('');
        setStep(prev => prev + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await signUp.email({
                email: formData.email,
                password: formData.password,
                name: formData.name,
            });

            if (error) throw new Error(error.message || 'Erro ao criar conta');
            if (data) {
                navigate('/select-organization');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-white overflow-hidden">
            {/* Left Side: Branding and Plan Info */}
            <div className="hidden md:flex flex-col justify-between w-[40%] p-12 lg:p-20 bg-zinc-900 border-r border-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 pointer-events-none" />
                <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-zinc-400 opacity-[0.02] blur-3xl rounded-full" />

                <div className="relative z-10 w-full max-w-sm ml-auto">
                    <img src="/deskreport-logo.svg" alt="DeskReport" className="h-8 mb-12" />

                    <div className="space-y-8">
                        <div>
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg shadow-black/20 mb-6`}>
                                <plan.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.1em]">/ {planKey === 'launch' ? 'sempre' : 'mês'}</span>
                            </div>
                            <h2 className="text-xl font-semibold text-zinc-200">Plano {plan.name}</h2>
                            <p className="text-zinc-500 mt-2 text-sm leading-relaxed">Sua jornada com o DeskReport começa aqui.</p>
                        </div>

                        <ul className="space-y-4 pt-6 border-t border-zinc-800">
                            {plan.features.map(f => (
                                <li key={f} className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                                    <Check className="w-4 h-4 text-zinc-600" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="relative z-10 mt-auto w-full max-w-sm ml-auto">
                    <div className="flex items-center gap-3 text-zinc-500 text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Pagamento 100% seguro com criptografia de ponta</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
                <div className="absolute top-0 right-0 p-8 md:hidden">
                    <img src="/deskreport-logo.svg" alt="Logo" className="h-6" />
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
                            <span className={`h-1 w-8 rounded-full ${step >= 1 ? 'bg-white' : 'bg-zinc-800'}`} />
                            <span className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-white' : 'bg-zinc-800'}`} />
                            <span className="ml-2">Step {step} of 2</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {step === 1 ? 'Crie sua conta' : 'Meio de pagamento'}
                        </h1>
                        <p className="text-zinc-400">
                            {step === 1 ? 'Insira seus dados para começar' : 'Configure sua cobrança para o plano ' + plan.name}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Nome completo</label>
                                        <input
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="Ex: John Wick"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-700 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">E-mail corporativo</label>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="john@empresa.com"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-700 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Senha</label>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-700 transition-all text-sm"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        className="w-full bg-white text-black hover:bg-zinc-200 py-6 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 group"
                                    >
                                        Próximo passo
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-6 border border-zinc-700 mb-8 overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-20">
                                            <CreditCard className="w-12 h-12" />
                                        </div>
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex gap-1.5">
                                                <div className="w-10 h-6 bg-zinc-700 rounded" />
                                                <div className="w-10 h-6 bg-emerald-500/20 rounded border border-emerald-500/30" />
                                            </div>
                                            <div className="font-mono text-xl tracking-[0.2em] text-zinc-300">
                                                {formData.cardNumber.padEnd(16, '•').replace(/(.{4})/g, '$1 ')}
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Titular</span>
                                                    <div className="text-sm font-medium">{formData.cardName || 'NOME DO TITULAR'}</div>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Validade</span>
                                                    <div className="text-sm font-medium">{formData.expiry || 'MM/AA'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Nome no cartão</label>
                                        <input
                                            name="cardName"
                                            value={formData.cardName}
                                            onChange={handleInputChange}
                                            placeholder="Como está no cartão"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-400">Número do cartão</label>
                                        <div className="relative">
                                            <input
                                                name="cardNumber"
                                                maxLength={16}
                                                value={formData.cardNumber}
                                                onChange={handleInputChange}
                                                placeholder="0000 0000 0000 0000"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pl-12 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                                            />
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-400">Validade</label>
                                            <input
                                                name="expiry"
                                                placeholder="MM/AA"
                                                value={formData.expiry}
                                                onChange={handleInputChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-zinc-400">CVV</label>
                                            <input
                                                name="cvc"
                                                placeholder="000"
                                                maxLength={3}
                                                value={formData.cvc}
                                                onChange={handleInputChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setStep(1)}
                                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-6 rounded-xl font-bold flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] bg-white text-black hover:bg-zinc-200 py-6 rounded-xl font-bold flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Processando...' : 'Finalizar cadastro'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            Já tem conta? Fazer login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
