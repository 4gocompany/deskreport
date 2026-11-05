import { Contact } from '../../models/contact';

type ContactProps = {
  data?: Contact;
};

export function ContactCard({ data }: ContactProps) {
  return data ? (
    <div className='flex items-center gap-3'>
      <div className='relative flex items-center justify-center'>
        <img className='bg-zinc-200 dark:bg-zinc-800 rounded-full object-cover' width={36} height={36} src={data.avatar} />
        <div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full'></div>
      </div>
      <div className='flex flex-col'>
        <span className='font-semibold text-zinc-900 dark:text-zinc-100 leading-tight text-sm'>{data.first_name + ' ' + data.last_name}</span>
        <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>Online agora</span>
      </div>
    </div>
  ) : null;
}
