import { Header, PageBody } from '@/components/layout';
import { SideCalendar } from '@/components/layout/SideCalendar';

export default async function CalendarPage() {
    return (
        <PageBody>
            <Header title='Calendar'/>

            <div className='calendar-page--calendar'>
                <SideCalendar />
            </div>
        </PageBody>
    );
}