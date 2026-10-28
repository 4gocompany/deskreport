import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';

export default function Resume() {
  return (
    <Page navigation={[]}>
      <Topbar title='Resumo' inputSearch='off' />
    </Page>
  );
}
