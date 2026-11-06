import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { ProjectsHub } from './projects-hub';

export default function Projects() {
    return (
        <Page navigation={[]}>
            <div className="flex flex-col h-full w-full">
                <Topbar title='Projetos' inputSearch='off' />
                <div className='flex-1 overflow-y-auto p-6'>
                    <div className="max-w-6xl mx-auto space-y-6">
                        <ProjectsHub />
                    </div>
                </div>
            </div>
        </Page>
    );
}
