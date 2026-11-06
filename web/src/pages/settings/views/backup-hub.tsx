import { Download, Upload, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';
import { authClient } from '../../../lib/auth-client';
import { useTenant } from '../../../hooks/useTenant';
import { apiBase } from '../../../api/fetcher';

export function BackupHub() {
    const { company_id } = useTenant();
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });

    const handleExport = async () => {
        setStatus({ type: 'loading', message: 'Preparando backup...' });
        try {
            const { data, error } = await authClient.$fetch(`${apiBase}/backup/export`, {
                headers: { 'x-organization-id': company_id || '' }
            });
            if (error || !data) {
                setStatus({ type: 'error', message: 'Erro ao exportar backup.' });
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deskreport-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus({ type: 'success', message: 'Backup exportado com sucesso!' });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Erro ao exportar backup.' });
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus({ type: 'loading', message: 'Processando arquivo...' });
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = JSON.parse(e.target?.result as string);
                const { error } = await authClient.$fetch(`${apiBase}/backup/import`, {
                    method: 'POST',
                    body: JSON.stringify(content),
                    headers: { 'x-organization-id': company_id || '' }
                });
                if (!error) {
                    setStatus({ type: 'success', message: 'Dados importados com sucesso!' });
                } else {
                    setStatus({ type: 'error', message: 'Erro ao importar dados.' });
                }
            } catch (error) {
                console.error(error);
                setStatus({ type: 'error', message: 'Arquivo inválido ou erro na importação.' });
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-12 animate-slide-up pb-10">
            {/* HEADER INFORMATIVO */}
            <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                    Backup e Exportação
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
                    Gerencie a segurança dos seus dados. Exporte todo o conteúdo da sua organização para um backup local ou restaure dados de um arquivo anterior.
                </p>
            </div>

            {/* AÇÕES DE BACKUP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EXPORTAR */}
                <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 space-y-4">
                    <div className="bg-sky-50 dark:bg-sky-900/20 w-12 h-12 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Download size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Exportar Tudo</h3>
                        <p className="text-xs text-neutral-500 mt-1">Gere um arquivo JSON contendo tarefas, projetos, times e configurações da sua organização.</p>
                    </div>
                    <Button 
                        onClick={handleExport}
                        disabled={status.type === 'loading'}
                        className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {status.type === 'loading' && status.message?.includes('export') ? 'Processando...' : 'Fazer Download'}
                    </Button>
                </div>

                {/* IMPORTAR */}
                <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 w-12 h-12 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Upload size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Importar Backup</h3>
                        <p className="text-xs text-neutral-500 mt-1">Restaure os dados da organização a partir de um arquivo .json exportado anteriormente.</p>
                    </div>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImport}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            disabled={status.type === 'loading'}
                        />
                        <Button 
                            variant="secondary"
                            disabled={status.type === 'loading'}
                            className="w-full gap-2"
                        >
                            Selecionar Arquivo
                        </Button>
                    </div>
                </div>
            </div>

            {/* STATUS MESSAGE */}
            {status.type !== 'idle' && (
                <div className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                    status.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' :
                    status.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' :
                    'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                }`}>
                    {status.type === 'success' && <CheckCircle2 size={18} />}
                    {status.type === 'error' && <ShieldAlert size={18} />}
                    {status.type === 'loading' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            {/* AVISO DE SEGURANÇA */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex gap-4">
                    <div className="text-amber-500 shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Aviso de Segurança</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Backups contêm informações sensíveis. Mantenha os arquivos exportados em locais seguros. Ao importar um backup, as informações atuais podem ser mescladas ou dependendo da versão, causar instabilidades se houver conflito de IDs. 
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
