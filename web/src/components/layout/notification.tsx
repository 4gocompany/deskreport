import { Check, MessageCircle, UserPlus } from 'lucide-react';

export function Notification() {
  return (
    <div className='z-50 absolute border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-lg w-0 group-focus:min-w-[320px] left-14 bottom-4'>
      <div className='text-left bg-white dark:bg-neutral-900 h-0 group-focus:h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-neutral-100 dark:scrollbar-track-neutral-800'>
        <div className='px-4 pt-3'>
          <span className='text-xl'>Notificações </span>
          <span className=''>(10)</span>
        </div>
        <ul className='mt-4 text-xs'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
            <li className='px-4 py-3 flex items-start relative hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors' key={item}>
              <span className='z-10 left-8 h-full absolute flex border-r border-neutral-200 dark:border-neutral-800' />
              <div className='relative z-20 rounded-full bg-neutral-100 dark:bg-neutral-800 p-2 mr-3 text-neutral-600 dark:text-neutral-300'>
                <MessageCircle size={18} />
              </div>
              <div>
                <p className='mb-2 text-neutral-800 dark:text-neutral-200'>
                  <span className='font-bold'>Rodrigo Andrade </span>
                  comentou na tarefa que você criou
                </p>
                <span className='text-indigo-600 dark:text-indigo-400'>há 2 horas</span>
              </div>
              <span className='ml-3 text-neutral-300 dark:text-neutral-600'>
                <Check size={16} />
              </span>
            </li>
          ))}

          <li className='px-4 py-3 flex items-start relative hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
            <div className='relative z-20 rounded-full bg-neutral-100 dark:bg-neutral-800 p-2 mr-3 text-neutral-600 dark:text-neutral-300'>
              <UserPlus size={18} />
            </div>
            <div>
              <p className='mb-2 text-neutral-800 dark:text-neutral-200'>
                <span className='font-bold'>Rodrigo Andrade </span>
                adicionou você no DeskReport
              </p>
              <span className='text-indigo-600 dark:text-indigo-400'>há 2 meses</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}