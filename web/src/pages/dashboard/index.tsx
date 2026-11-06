import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { DashboardView } from './dashboard-view';

export default function Dashboard() {
  return (
    <Page navigation={[]}>
      <div className="flex flex-col h-full w-full">
        <Topbar title='Dashboard' inputSearch='off' />
        <div className='flex-1 overflow-y-auto p-6'>
          <div className='max-w-6xl mx-auto w-full space-y-6'>
            <DashboardView />
          </div>
        </div>
      </div>
    </Page>
  );
}
