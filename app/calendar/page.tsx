import { SideCalendar } from '@/components/layout/SideCalendar';

export default async function CalendarPage() {
    return (
        <div className="page-content">
            <div className="page-header">
                <h1 className="page-header__title">Calendar</h1>
            </div>

            <div className='calendar-page--calendar'>
                <SideCalendar />
            </div>
        </div>
    );
}