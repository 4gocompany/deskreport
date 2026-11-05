import { Save, Camera } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useSession } from '../../../lib/auth-client';

export function ProfileHub() {
    const { data: session } = useSession();

    return (
        <div className="space-y-12 animate-slide-up pb-10">
            {/* HEADER INFORMATIVO */}
            <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                    Meu Perfil
                </h2>
                <p className="text-sm text-neutral-500 max-w-2xl">
                    Atualize seu perfil pessoal, gerencie suas credenciais e sua foto de avatar para facilitar a comunicação.
                </p>
            </div>

            {/* DADOS DO PERFIL */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Informações Pessoais</h3>
                        <p className="text-xs text-neutral-500">Credenciais pessoais e foto de avatar</p>
                    </div>
                    <Button size="md" className="gap-2">
                        <Save size={16} />
                        Salvar Alterações
                    </Button>
                </div>
                <div className="bg-transparent mt-4">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center overflow-hidden border-2 border-dashed border-sky-300 dark:border-sky-700">
                                <img src={session?.user?.image || "https://robohash.org/rodrigo.png?set=set5"} alt="Avatar" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera size={20} className="text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400">Nome Completo</label>
                                <input type="text" defaultValue={session?.user?.name || ''} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400">E-mail de Trabalho</label>
                                <input type="email" defaultValue={session?.user?.email || ''} readOnly className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 text-sm outline-none transition-all font-medium text-neutral-500 cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400">WhatsApp</label>
                                <input type="tel" defaultValue="+55 (11) 98765-4321" className="w-full bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400">Cargo / Função</label>
                                <input type="text" defaultValue="Administrador" className="w-full bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
