import React, { useState, useEffect } from 'react';
import { AlertCircle, Sun, Moon, Monitor, BellRing, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useThemeStore, useUIStore } from '../../../store';

export function PreferencesHub() {
    const { theme, setTheme } = useThemeStore();
    const { chatSidebarPreference, setChatSidebarPreference } = useUIStore();
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    return (
        <div className="space-y-8 animate-slide-up pb-10">

            {/* HEADER INFORMATIVO */}
            <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                    Configurações e Preferências
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
                    Personalize sua experiência na plataforma DeskReport. Ajuste o tema visual, configure notificações e gerencie suas integrações.
                </p>
            </div>

            <div className="space-y-12 animate-slide-up pb-10">
                {/* TEMA / APARÊNCIA */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Aparência e Tema</h3>
                            <p className="text-xs text-neutral-500 mt-1">Escolha a cor predominante do sistema.</p>
                        </div>
                    </div>
                    <div className="py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ThemeOption
                                id="light"
                                name="Claro"
                                active={theme === 'light'}
                                onClick={() => setTheme('light')}
                                icon={<Sun size={16} />}
                            />
                            <ThemeOption
                                id="dark"
                                name="Escuro"
                                active={theme === 'dark'}
                                onClick={() => setTheme('dark')}
                                icon={<Moon size={16} />}
                            />
                            <ThemeOption
                                id="system"
                                name="Automático"
                                active={theme === 'system'}
                                onClick={() => setTheme('system')}
                                icon={<Monitor size={16} />}
                                description="Sincroniza com seu sistema"
                            />
                        </div>
                    </div>
                </div>

                {/* CHAT INTERNO */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Chat Interno</h3>
                            <p className="text-xs text-neutral-500 mt-1">Configure o comportamento da barra lateral de chat.</p>
                        </div>
                    </div>
                    <div className="py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SidebarPreferenceOption
                                label="Sempre Visível (Compacto)"
                                description="Mantém uma barra fina com avatares visível o tempo todo."
                                active={chatSidebarPreference === 'compact'}
                                onClick={() => setChatSidebarPreference('compact')}
                            />
                            <SidebarPreferenceOption
                                label="Esconder por Padrão"
                                description="Remove a sidebar da visão. Você a abre clicando no botão do topo."
                                active={chatSidebarPreference === 'hidden'}
                                onClick={() => setChatSidebarPreference('hidden')}
                            />
                        </div>
                    </div>
                </div>

                {/* NOTIFICAÇÕES */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Notificações do Navegador</h3>
                            <p className="text-xs text-neutral-500 mt-1">Gerencie os alertas e popups de aviso do sistema.</p>
                        </div>
                        {notificationPermission === 'default' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={requestNotificationPermission}
                                className="gap-2"
                            >
                                <BellRing size={16} />
                                Habilitar Notificações
                            </Button>
                        )}
                    </div>
                    <div className="py-4">
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-6">
                            <div className={`p-2 rounded-full ${notificationPermission === 'granted' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 block">
                                    Status: {notificationPermission === 'granted' ? 'Habilitadas' : notificationPermission === 'denied' ? 'Bloqueadas' : 'Não Configuradas'}
                                </span>
                                <span className="text-xs text-neutral-500">
                                    {notificationPermission === 'granted' ? 'Você receberá alertas de novos pedidos e atualizações importantes.' : 'Ative nas configurações do navegador para receber alertas.'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NotificationToggle label="Novos Pedidos" description="Receber alerta quando uma nova venda for iniciada." defaultChecked />
                            <NotificationToggle label="Mensagens de Clientes" description="Alertar sobre novas conversas no WhatsApp." defaultChecked />
                            <NotificationToggle label="Alertas do Sistema" description="Avisos sobre manutenções ou atualizações." />
                            <NotificationToggle label="Estoque Baixo" description="Notificar quando produtos atingirem o limite mínimo." />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SidebarPreferenceOption({ label, description, active, onClick }: { label: string, description: string, active: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${active ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800' : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
            <div className="flex-1">
                <span className={`text-sm font-bold block ${active ? 'text-sky-700 dark:text-sky-300' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</span>
                <span className="text-[10px] text-neutral-500 leading-tight">{description}</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-sky-500 bg-sky-500' : 'border-neutral-300 dark:border-neutral-700'}`}>
                {active && <Zap size={10} className="text-white fill-white" />}
            </div>
        </div>
    );
}

function ThemeOption({ id, name, icon, description, active, onClick }: { id: string, name: string, icon: React.ReactNode, description?: string, active: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all group ${active ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-500/10' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700'}`}
        >
            <div className={`aspect-[4/3] rounded-xl mb-4 overflow-hidden border border-neutral-200 dark:border-neutral-800 relative ${id === 'light' ? 'bg-white' : id === 'dark' ? 'bg-neutral-900' : 'bg-gradient-to-br from-white to-neutral-900'}`}>
                {/* Mock UI for Light Theme */}
                {id === 'light' && (
                    <div className="p-2 space-y-2">
                        <div className="w-full h-2 bg-neutral-100 rounded" />
                        <div className="flex gap-2">
                            <div className="w-4 h-4 bg-sky-500 rounded" />
                            <div className="flex-1 h-4 bg-neutral-50 rounded" />
                        </div>
                    </div>
                )}
                {/* Mock UI for Dark Theme */}
                {id === 'dark' && (
                    <div className="p-2 space-y-2">
                        <div className="w-full h-2 bg-neutral-800 rounded" />
                        <div className="flex gap-2">
                            <div className="w-4 h-4 bg-sky-400 rounded" />
                            <div className="flex-1 h-4 bg-neutral-800 rounded" />
                        </div>
                    </div>
                )}
                {/* Mock UI for System Theme */}
                {id === 'system' && (
                    <div className="absolute inset-0 flex">
                        <div className="flex-1 bg-white p-2">
                            <div className="w-full h-2 bg-neutral-100 rounded" />
                            <div className="w-4 h-4 bg-sky-500 rounded mt-2" />
                        </div>
                        <div className="flex-1 bg-neutral-900 p-2 border-l border-neutral-700">
                            <div className="w-full h-2 bg-neutral-800 rounded" />
                            <div className="w-4 h-4 bg-sky-400 rounded mt-2" />
                        </div>
                    </div>
                )}
                {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-sky-500/10">
                        <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white">
                            <Zap size={14} className="fill-white" />
                        </div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${active ? 'bg-sky-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                    {icon}
                </div>
                <div>
                    <span className={`text-sm font-bold block ${active ? 'text-sky-700 dark:text-sky-300' : 'text-neutral-800 dark:text-neutral-200'}`}>{name}</span>
                    {description && <span className="text-[10px] text-neutral-500">{description}</span>}
                </div>
            </div>
        </div>
    );
}

function NotificationToggle({ label, description, defaultChecked = false }: { label: string, description: string, defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div
            onClick={() => setChecked(!checked)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${checked ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800' : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
            <div className="flex-1">
                <span className={`text-sm font-bold block ${checked ? 'text-sky-700 dark:text-sky-300' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</span>
                <span className="text-[10px] text-neutral-500 leading-tight">{description}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-sky-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
            </div>
        </div>
    );
}


