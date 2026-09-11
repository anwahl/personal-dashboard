/**
 * Landing page for all brain dumps.
 */
import { Header, PageBody }         from '@/components/layout';
import BrainDumpList                from '@/components/brain-dump/BrainDumpClient';

export default function BrainDumpPage() {
  
  return (
    <PageBody>
      <Header title='🧠 Brain Dump'/>
      <BrainDumpList withForm />
    </PageBody>
  );
}
