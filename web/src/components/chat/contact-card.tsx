import { Contact } from '../../models/contact';

type ContactProps = {
  data?: Contact;
};

export function ContactCard({ data }: ContactProps) {
  return data ? (
    <div className='flex items-center'>
      <img className='mr-3 bg-indigo-500 rounded-full' width={32} height={32} src={data.avatar} />
      <span>{data.first_name + ' ' + data.last_name}</span>
    </div>
  ) : null;
}
