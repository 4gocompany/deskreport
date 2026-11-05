import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { OrganizationsHub } from '../settings/views/organizations-hub';

export default function OrganizationsPage() {
    return (
        <Page navigation={[]}>
            <div className="flex flex-col h-full w-full">
                <Topbar title='Gestão de Organizações' smartHeader={false} />
                <div className='flex-1 overflow-y-auto bg-transparent p-8'>
                    <div className="w-full">
                        <OrganizationsHub />
                    </div>
                </div>
            </div>
        </Page>
    );
}
