import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';

export default function Notifications() {
    return (
        <Page navigation={[]}>
            <Topbar title='Avisos' inputSearch='off' />
            <div className="p-8 flex flex-col items-center justify-center h-full text-neutral-400">
                <p>Em breve: Painel de Avisos e Notificações.</p>
            </div>
        </Page>
    );
}
