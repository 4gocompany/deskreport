import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { ShieldCheck, Share2, Settings2, User, Bot } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { SecurityHub } from './views/security-hub';
import { ChannelsHub } from './views/channels-hub';
import { PreferencesHub } from './views/preferences-hub';
import { OrganizationsHub } from './views/organizations-hub';
import { ProfileHub } from './views/profile-hub';
import { BackupHub } from './views/backup-hub';
import { AgentsHub } from './views/agents-hub';
import { Database } from 'lucide-react';

export default function Settings() {
  const { tab } = useParams();
  const { companyUrl } = useTenant();
  const currentTab = tab || 'profile';

  const navigation = useMemo(() => [
    { name: 'Meu Perfil', to: companyUrl('settings/profile'), icon: <User size={14} /> },
    { name: 'Canais e Integrações', to: companyUrl('settings/channels'), icon: <Share2 size={14} /> },
    { name: 'Usuários e Segurança', to: companyUrl('settings/security'), icon: <ShieldCheck size={14} /> },
    { name: 'Agentes', to: companyUrl('settings/agents'), icon: <Bot size={14} /> },
    { name: 'Preferências', to: companyUrl('settings/preferences'), icon: <Settings2 size={14} /> },
    { name: 'Backup e Dados', to: companyUrl('settings/backup'), icon: <Database size={14} /> },
  ], [companyUrl]);

  const renderContent = () => {
    switch (currentTab) {
      case 'channels': return <ChannelsHub />;
      case 'security': return <SecurityHub />;
      case 'preferences': return <PreferencesHub />;
      case 'organizations': return <OrganizationsHub />;
      case 'backup': return <BackupHub />;
      case 'agents': return <AgentsHub />;
      default: return <ProfileHub />;
    }
  };

  return (
    <Page navigation={navigation}>
      <div className="flex flex-col h-full w-full">
        <Topbar title='Configurações' inputSearch='off' />
        <div className='flex-1 overflow-y-auto p-6'>
          <div className="max-w-6xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </Page>
  );
}
