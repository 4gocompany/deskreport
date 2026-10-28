import useSWR from 'swr';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { api } from '../../api/fetcher';
import { Loader2 } from 'lucide-react';

export default function Settings() {
  const { data: qrcode, isLoading: isLoadingQrCode } = useSWR(`http://localhost:3000/settings/instance/scan-qrcode`, api.get);
  const { data: instance, isLoading: isLoadingInstance } = useSWR(`http://localhost:3000/settings/instance/info`, api.get);

  return (
    <Page navigation={[]}>
      <Topbar title='Configurações' inputSearch='off' />

      <div className='flex px-10 py-4 overflow-y-auto'>
        {!isLoadingQrCode ? (
          <div className='w-64 h-64 p-4 bg-white rounded-xl'>
            <img className='w-full bg-blend-screen' src={qrcode?.base64} />
          </div>
        ) : (
          <div className='flex items-center justify-center w-64 h-64 bg-white rounded-xl'>
            <Loader2 className='animate-spin' />
          </div>
        )}
      </div>
    </Page>
  );
}
