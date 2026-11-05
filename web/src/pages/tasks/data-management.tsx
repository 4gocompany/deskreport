import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useParams } from 'react-router-dom';
import { Download, Upload, FileJson, FileSpreadsheet, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from './use-task-store';
import { Button } from '../../components/ui/button';
import { useState, useRef, useEffect } from 'react';

export default function TaskDataManagement() {
    const { company_id, project_id } = useParams();
    const cId = company_id || '4go';
    const pId = project_id || 'deskreport';
    const { tasks, setTasks, fetchTasks } = useTaskStore();

    useEffect(() => {
        if (company_id) fetchTasks();
    }, [company_id, fetchTasks]);

    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const navigation = [
        { name: 'Quadros', to: `/${cId}/${pId}/tasks/boards` },
        { name: 'Em Lista', to: `/${cId}/${pId}/tasks/list` },
        { name: 'Gestão de Dados', to: `/${cId}/${pId}/tasks/management` },
    ];

    const exportToJson = () => {
        const dataStr = JSON.stringify(tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `deskreport-tasks-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        setStatus({ type: 'success', message: 'Tarefas exportadas com sucesso (JSON)!' });
    };

    const exportToCsv = () => {
        if (tasks.length === 0) return;

        const headers = ['id', 'title', 'project', 'status', 'priority', 'createdAt', 'assignees', 'tags'];
        const csvRows = [
            headers.join(','),
            ...tasks.map(task => [
                task.id,
                `"${task.title.replace(/"/g, '""')}"`,
                task.project,
                task.status,
                task.priority,
                task.createdAt,
                task.assignees ? `"${task.assignees.map(a => a.name).join('|')}"` : '',
                task.tags ? `"${task.tags.map(t => t.label).join('|')}"` : ''
            ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
        const exportFileDefaultName = `deskreport-tasks-${new Date().toISOString().split('T')[0]}.csv`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        setStatus({ type: 'success', message: 'Tarefas exportadas com sucesso (CSV)!' });
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target?.result as string);
                if (Array.isArray(importedTasks)) {
                    setTasks(importedTasks);
                    setStatus({ type: 'success', message: `${importedTasks.length} tarefas importadas com sucesso!` });
                } else {
                    throw new Error('Formato inválido: o arquivo deve conter uma lista (array) de tarefas.');
                }
            } catch (error) {
                setStatus({ type: 'error', message: 'Erro ao importar JSON: ' + (error as Error).message });
            }
        };
        reader.readAsText(file);
    };

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const clearAllTasks = () => {
        if (confirm('Tem certeza que deseja apagar TODAS as tarefas? Esta ação não pode ser desfeita.')) {
            setTasks([]);
            setStatus({ type: 'success', message: 'Todas as tarefas foram removidas.' });
        }
    };

    return (
        <Page navigation={navigation}>
            <Topbar title='Gestão de Dados' inputSearch='off' />

            <div className='flex-1 p-8 overflow-auto'>
                <div className='max-w-4xl mx-auto'>
                    <div className='mb-8'>
                        <h2 className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>Infraestrutura de Dados</h2>
                        <p className='text-zinc-500 dark:text-zinc-400 mt-1'>
                            Importe e exporte suas tarefas para backup ou migração. O armazenamento atual utiliza o <strong>LocalStorage</strong> do navegador.
                        </p>
                    </div>

                    {status.type !== 'idle' && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${status.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                            }`}>
                            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span className='text-sm font-semibold'>{status.message}</span>
                            <button onClick={() => setStatus({ type: 'idle', message: '' })} className='ml-auto text-xs font-black  opacity-60 hover:opacity-100'>Fechar</button>
                        </div>
                    )}

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {/* Export Section */}
                        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6'>
                            <div className='flex items-center gap-3 mb-6'>
                                <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400'>
                                    <Download size={20} />
                                </div>
                                <h3 className='font-bold text-zinc-900 dark:text-zinc-100'>Exportar Dados</h3>
                            </div>
                            <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>Baixe suas tarefas atuais em um arquivo estruturado.</p>

                            <div className='flex flex-col gap-3'>
                                <Button variant='outline' className='justify-start gap-4 h-12' onClick={exportToJson}>
                                    <FileJson size={18} className='text-zinc-400' />
                                    <div className='text-left'>
                                        <div className='text-xs font-bold'>Exportar como JSON</div>
                                        <div className='text-[10px] text-zinc-400 font-normal'>Ideal para backups e desenvolvedores</div>
                                    </div>
                                </Button>
                                <Button variant='outline' className='justify-start gap-4 h-12' onClick={exportToCsv}>
                                    <FileSpreadsheet size={18} className='text-zinc-400' />
                                    <div className='text-left'>
                                        <div className='text-xs font-bold'>Exportar como CSV</div>
                                        <div className='text-[10px] text-zinc-400 font-normal'>Abrir no Excel ou Google Sheets</div>
                                    </div>
                                </Button>
                            </div>
                        </div>

                        {/* Import Section */}
                        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6'>
                            <div className='flex items-center gap-3 mb-6'>
                                <div className='w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400'>
                                    <Upload size={20} />
                                </div>
                                <h3 className='font-bold text-zinc-900 dark:text-zinc-100'>Importar Dados</h3>
                            </div>
                            <p className='text-sm text-zinc-500 dark:text-zinc-400 mb-6'>Restaure tarefas de um backup anterior. <strong>Aviso: Isso substituirá suas tarefas atuais.</strong></p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className='hidden'
                                accept=".json"
                                onChange={handleImportJson}
                            />

                            <Button variant='primary' className='w-full gap-2 h-12' onClick={triggerImport}>
                                <Upload size={18} />
                                Selecionar arquivo JSON
                            </Button>
                        </div>

                        {/* Advanced Stats */}
                        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:col-span-2 relative overflow-hidden'>
                            <div className='flex flex-wrap items-center justify-between gap-6 relative z-10'>
                                <div>
                                    <h3 className='font-bold text-zinc-900 dark:text-zinc-100 text-lg'>Estatísticas da Base</h3>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>Resumo dos dados armazenados localmente.</p>
                                </div>
                                <div className='flex items-center gap-10'>
                                    <div className='text-center'>
                                        <div className='text-2xl font-black text-zinc-900 dark:text-zinc-100'>{tasks.length}</div>
                                        <div className='text-[10px] font-black text-zinc-400 '>Tarefas</div>
                                    </div>
                                    <div className='text-center'>
                                        <div className='text-2xl font-black text-zinc-900 dark:text-zinc-100'>
                                            {new Blob([JSON.stringify(tasks)]).size > 1024
                                                ? (new Blob([JSON.stringify(tasks)]).size / 1024).toFixed(1) + ' KB'
                                                : new Blob([JSON.stringify(tasks)]).size + ' B'
                                            }
                                        </div>
                                        <div className='text-[10px] font-black text-zinc-400 '>Espaço used</div>
                                    </div>
                                    <button
                                        onClick={clearAllTasks}
                                        className='p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-500 rounded-xl transition-colors group'
                                        title="Limpar Base"
                                    >
                                        <Trash2 size={24} className='group-hover:scale-110 transition-transform' />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );
}
