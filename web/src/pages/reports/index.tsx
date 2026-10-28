import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Check, Plus, X } from 'lucide-react';
import { api } from '../../api/fetcher';
import useSWR from 'swr';

type TaskBoardStatusProps = 'under-analysis' | 'in-progress' | 'awaiting-review' | 'finished' | string

export type TaskCardProps = {
  id?: string;
  title: string;
  resume?: string;
  dueDate?: string;
  status: TaskBoardStatusProps;
  signee?: string;
}

export function Reports() {
  const [scrollHeight, setScrollHeight] = useState(0);

  const [newReport, setNewReport] = useState<TaskCardProps>();
  const { data:reports, mutate } = useSWR<TaskCardProps[]>('/reports', api.get);

  const navigation = [
    { name: 'Todas', to: '/tasks/all' },
    /* { name: 'Em andamento', to: '/tasks/in-progress' }, */
    { name: 'Vencidas', to: '/tasks/over' },
    { name: 'Finalizadas', to: '/tasks/finished' },
  ]

  const params = useParams();
  const activeReportId = params['task_id']
  const activeOption = params['option'];

  useEffect(() => {
    if (window !== undefined) {
      navigator.requestMediaKeySystemAccess
      window.addEventListener('resize', () => {
        setScrollHeightOnLoad(window.innerHeight);
        return;
      });
      setScrollHeightOnLoad(window.innerHeight);
    }    
  }, []);
  
  function createNewReport(status: TaskBoardStatusProps) {
    setNewReport({
      dueDate: new Date().toISOString(),
      title: '',
      status
    })
  }
  
  function saveNewReport() {    
    if (newReport == undefined) return;
    api.post('/reports', newReport)
      .then(() => {
        if (reports !== undefined) mutate([newReport, ...reports]);
        setNewReport(undefined);
      })
  }

  function setScrollHeightOnLoad(windowSize: number) {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) setScrollHeight(windowSize - toolbar.clientHeight);
    window.removeEventListener('resize', () => { });
  }

  const boards = [
    { title: 'Em análise', flagColor: '#6e7681', data: 'under-analysis' },
    { title: 'Em andamento', flagColor: '#1f6feb', data: 'in-progress' },
    { title: 'Aguardando revisão', flagColor: '#bd561d', data: 'awaiting-review' },
    { title: 'Finalizadas', flagColor: '#238636', data: 'finished' }
  ]
  
  return (
    <Page navigation={navigation}>
      <Topbar title='Serviços'>
        <span className='text-xs'>Há um total de {reports?.length} problemas relatados</span>
      </Topbar>
      <div className='flex'>
        {boards.map((board) => <div key={board.title} className='min-w-max'>
          <div
            data-board={board.data}
            style={{ height: scrollHeight + 'px' }}
            className='border-r border-neutral-900 px-4 w-80 relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-neutral-900 pb-4 space-y-4 text-sm'
          >
            <div className='py-2 flex items-center bg-neutral-950 sticky top-0 border-b border-neutral-900 -mx-10 px-10'>
              <div className='flex items-center'>
                <span style={{ borderColor: board.flagColor }}
                      className="ml-2 mr-3 w-3 h-3 flex rounded-full border-2" />
                <span>{board.title}</span>
                <button onClick={() => createNewReport(board.data)} className='ml-3 hover:bg-neutral-700 hover:text-white p-1 rounded-lg'><Plus size={16} /></button>
              </div>
            </div>
            {
              (newReport && newReport.status === board.data) ? (
                <div className='bg-neutral-900 rounded-lg border border-neutral-800/50'>
                  <textarea onChange={(e) => setNewReport({...newReport, title: e.target.value})} className="py-2 h-24 px-4 w-full bg-transparent outline-none border-transparent resize-none overflow-hidden" placeholder="Escreva um título" />
                  <div className='flex justify-end items-center gap-1 px-2 mb-2'>
                    <button onClick={saveNewReport} className='bg-neutral-800 rounded-lg p-1 hover:bg-neutral-700'>
                      <Check size={18} />
                    </button>
                    <button onClick={() => setNewReport(undefined)} className='bg-neutral-800 rounded-lg p-1 hover:bg-neutral-700'>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : null
            }
            {reports?.length && reports?.map((report) => report.status === board.data && (
              <NavLink
                data-task={report.id}
                to={'/reports/' + activeOption + '/' + report.id}
                key={report.id}
                className={`${activeReportId === report.id?.toString() ? 'bg-neutral-900 text-indigo-500' : 'bg-neutral-900 border-neutral-800/50'
                  } w-full flex items-center gap-3 py-2 px-4 hover:bg-neutral-800/75 rounded-lg border`}
              >
                <div className='flex flex-col w-full'>
                  <div className='flex-1 flex justify-between'>
                    <span className='text-xs text-neutral-500'>Demanda #{report.id}</span>
                    {/* <span className='text-xs'>
                      {index == Math.round(Math.random() * 20) && <ChevronsUp size={16} color='#ca1212' />}
                      {index == Math.round(Math.random() * 20) && <ChevronUp size={16} color='#bd561d' />}
                      {index == Math.round(Math.random() * 20) && <Minus size={16} color='#1f6feb' />}
                    </span> */}
                  </div>
                  <p className='my-3 text-sm break-words'>{report.title}</p>
                  {/*<div className='flex items-center justify-between'>*/}
                  {/*  <span className='text-xs text-neutral-500'>Vencimento: {report.dueDate}</span>*/}
                  {/*  {board.data == report.status && <span className='text-xs text-white px-2 rounded' style={{ background: board.flagColor }}>{report.status}</span>}*/}
                  {/*</div>*/}
                  <div className='mt-5 flex border-t border-neutral-800 items-center flex-1 justify-between pt-2.5 pb-0.5'>
                    <div className='flex items-center gap-2'>
                      <img className='rounded-full bg-indigo-400' width={16} height={16} src={`https://robohash.org/${report.signee?.replace(' ', '').toLocaleLowerCase}.png?size=300x300\u0026set=set1`} />
                      <span className='truncate text-xs'>{report.signee}</span>
                    </div>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        </div>)}

      </div>
    </Page>
  );
}
