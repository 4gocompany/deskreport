import { useEffect } from 'react';
import { SubmenuItem, useSubmenuNavigation } from '../../store';

type PageProps = {
  navigation?: SubmenuItem[];
  children?: React.ReactNode;
};

export function Page({ navigation, children }: PageProps) {
  const [setNavigation] = useSubmenuNavigation((state) => [state.setNavigation]);

  useEffect(() => {
    setNavigation(navigation || []);
  }, [navigation, setNavigation]);

  return <div className='flex flex-col flex-1 h-screen max-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors'>{children}</div>;
}
