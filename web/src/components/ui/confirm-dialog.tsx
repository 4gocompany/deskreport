import { create } from 'zustand';
import { Button } from './button';
import { Dialog } from './dialog';

// Substitui o alert e o confirm do navegador. O ConfirmDialogHost fica montado no layout
type Request = { message: string; confirmLabel?: string; danger?: boolean; onlyOk?: boolean; resolve: (ok: boolean) => void };

const useConfirmStore = create<{ request: Request | null }>(() => ({ request: null }));

export function confirmDialog(message: string, options: { confirmLabel?: string; danger?: boolean } = {}) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ request: { message, ...options, resolve } }));
}

export function alertDialog(message: string) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ request: { message, onlyOk: true, resolve } }));
}

export function ConfirmDialogHost() {
  const request = useConfirmStore((state) => state.request);

  function close(ok: boolean) {
    request?.resolve(ok);
    useConfirmStore.setState({ request: null });
  }

  return (
    <Dialog
      isOpen={Boolean(request)}
      onClose={() => close(false)}
      hideHeader
      maxWidth='sm'
      footer={
        <>
          {!request?.onlyOk && (
            <Button variant='ghost' onClick={() => close(false)}>
              Cancelar
            </Button>
          )}
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {request?.onlyOk ? 'Ok' : request?.confirmLabel || 'Confirmar'}
          </Button>
        </>
      }
    >
      <p className='text-sm text-zinc-700 dark:text-zinc-200'>{request?.message}</p>
    </Dialog>
  );
}
