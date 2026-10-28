import { Check, MessageCircle, UserPlus } from 'lucide-react';

export function Notification() {
  return (
    <div className='z-50 drop-shadow-xl absolute border border-neutral-700/40 overflow-hidden rounded-lg w-0 group-focus:min-w-[320px] right-0 top-9'>
      <div className='text-left bg-neutral-900 h-0 group-focus:h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800'>
        <div className='px-4 pt-3'>
          <span className='text-xl'>Notificações </span>
          <span className=''>(10)</span>
        </div>
        <ul className='mt-4 text-xs'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
            <li className='px-4 py-3 flex items-start relative hover:bg-neutral-700/30' key={item}>
              <span className='z-10 left-8 h-full absolute flex border-r border-neutral-800' />
              <div className='relative z-20 rounded-full bg-neutral-700 p-2 mr-3'>
                <MessageCircle size={18} />
              </div>
              <div>
                <p className='mb-2'>
                  <span className='font-bold'>Rodrigo Andrade </span>
                  comentou na tarefa que você criou
                </p>
                <span className='text-indigo-600'>há 2 horas</span>
              </div>
              <span className='ml-3 text-neutral-700'>
                <Check size={16} />
              </span>
            </li>
          ))}

          <li className='px-4 py-3 flex items-start relative'>
            <div className='relative z-20 rounded-full bg-neutral-700 p-2 mr-3'>
              <UserPlus size={18} />
            </div>
            <div>
              <p className='mb-2'>
                <span className='font-bold'>Rodrigo Andrade </span>
                adicionou você no DeskReport
              </p>
              <span className='text-indigo-600'>há 2 meses</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}