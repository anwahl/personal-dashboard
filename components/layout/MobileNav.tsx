'use client';

import Link                             from 'next/link';
import { Button, Icon }                 from '@/components/ui';
import { usePathname }                  from 'next/navigation';
import { MENU_ITEMS, MOBILE_ITEMS, NAV_ITEMS, isNavActive }    from '@/lib/constants/nav';
import { localTodayISO }                from '@/lib/utils/dates';
import { useState } from 'react';

export function MobileNavBar() {
    const path = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="mobile-nav">
            {MOBILE_ITEMS.map(({ href, label, svg_data, is_menu }) => {
                const dest   = href === '/daily' ? `/daily/${localTodayISO()}` 
                    : href;
                const active = !is_menu ? isNavActive(href, path) : false;

                return (
                    <div className={`mobile-nav--item${(active || (!active && is_menu && menuOpen)) ? ' mobile-nav--item_selected' : ''}`} key={href}>
                        <Button className='mobile-nav--btn' size="sm"
                            onClick={() => is_menu ? setMenuOpen(true) : null}>
                            <Link
                                className='mobile-nav--item-link'
                                href={dest}>
                                <Icon
                                    svg_data={svg_data}
                                    size="md"
                                    className="mobile-nav--item_icon"
                                />
                                {active ?   
                                    <div className="mobile-nav--item_selected_text">
                                        {label}
                                    </div>
                                : ''}
                            </Link>
                        </Button>
                    </div>
                );
            })}
            {menuOpen && (
                <div className="mobile-nav--menu-modal">
                    <div 
                        className="mobile-nav--menu-backdrop"
                        onClick={() => setMenuOpen(false)} 
                    />
                    <div className="mobile-nav--menu-content">
                        <span className="mobile-nav--menu-title">Menu</span>
                        <hr className="hr-sm" />
                        {MENU_ITEMS.map(({ href, emoji, label }) => (
                            <Link 
                                key={href}
                                href={href}
                                className="mobile-nav--menu-link" 
                                onClick={() => setMenuOpen(false)}
                            >
                                <span className="mobile-nav--menu-link-icon">{emoji}</span>
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}