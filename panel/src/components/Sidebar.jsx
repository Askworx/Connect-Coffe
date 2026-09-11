import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MessageSquare,
  LogOut,
  Radio,
  Settings2,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { logout, getSignedInEmail } from '../api';
import WhatsAppMark from './WhatsAppMark';

/**
 * Navigation, ordered the way the established WhatsApp Business platforms
 * order theirs (WATI, Interakt, respond.io, AiSensy all converge on this):
 *
 *   1. A flat list. None of them nest, and none of them label a section that
 *      holds one item — which is what "Team Management → Team" was.
 *   2. Grouped by hairline rule, not by heading. Seven text headings over
 *      eight items is more chrome than navigation, and a rule is this
 *      system's own device (DESIGN.md §5).
 *   3. Ordered by how often it is opened, not by how the database is shaped.
 *      The inbox is the surface an operator lives in, so it sits at the top,
 *      under the overview.
 *   4. Named for the job, not the table. Every one of those platforms says
 *      Inbox, Contacts, Broadcasts and Automation; not Messages, Campaigns
 *      and Bot Config.
 *
 * `divider: true` opens a new band above the item.
 */
const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },

  // Day-to-day customer contact.
  { to: '/messages', icon: MessageSquare, label: 'Inbox', divider: true },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/campaigns', icon: Radio, label: 'Offers' },

  // Table and workshop bookings made through the bot.
  { to: '/leads', icon: CalendarCheck, label: 'Bookings', divider: true },

  // Everything the bot says. Opened rarely — so it sits at the bottom.
  { to: '/config', icon: Settings2, label: 'Bot Settings', divider: true },
];

/**
 * Hoisted rather than declared inside <Sidebar> so React keeps the same
 * element type between renders — otherwise the whole nav remounts on every
 * collapse and the shared-layout rail has nothing to animate from.
 */
const NavItem = ({ item, collapsed, setCollapsed }) => (
  <NavLink
    to={item.to}
    end={item.to === '/'}
    onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
    title={collapsed ? item.label : undefined}
    className={({ isActive }) =>
      cn(
        'group relative mb-0.5 flex items-center gap-3 rounded-lg transition-colors duration-200',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-2 py-2.5',
        isActive
          ? 'bg-white text-primary shadow-card'
          : 'text-white/75 hover:bg-white/10 hover:text-white',
      )
    }
  >
    {({ isActive }) => (
      <>
        {/* The rail that marks where you are. It slides between items rather
            than blinking on, so the move reads as one continuous position. */}
        {isActive && (
          <motion.span
            layoutId="sidebar-rail"
            aria-hidden="true"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-champagne-600"
          />
        )}

        <item.icon className="size-[18px] shrink-0" />

        {!collapsed && (
          <span className="whitespace-nowrap text-[13px] font-medium">{item.label}</span>
        )}
      </>
    )}
  </NavLink>
);

/**
 * The one ink panel in the app.
 *
 * DESIGN.md asks for ink to be used sparingly and for the moments that carry
 * weight; in a tool the navigation is that moment — it is the only surface
 * present on every screen, so it anchors the sheet while the working area
 * stays white. Champagne text on ink, titanium grid behind it.
 *
 * ── The left rail ─────────────────────────────────────────────────────────
 * Two vertical lines, and only two.
 *
 *   CONTENT     16px — the wordmark, the group labels, every nav icon, the
 *                      sign-out icon. Achieved as px-2 on each group plus
 *                      px-2 on each row, and px-4 on the header, which has no
 *                      group wrapper of its own.
 *   BACKGROUND   8px — the row highlight and the active rail. They belong to
 *                      the row, not to the text column, so they are held one
 *                      step outside the content line; that offset is what
 *                      lets the column still read as a column.
 *
 * It previously ran on three unrelated edges — the logo at 20px, the labels
 * and icons at 24px, the rail at 12px — which is what made the group headings
 * look adrift from the items beneath them.
 *
 * Label text lands at 16 + 18 (icon) + 14 (gap-3) = 48px, matching the
 * header's logo-to-wordmark gap. Collapsed, every row centres on the same
 * 40px axis because the inset is px-2 in both states.
 */
const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();

  // Read once per mount rather than held in state: it only changes on sign-in
  // or sign-out, and both of those unmount this component.
  const email = getSignedInEmail();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-sidebar transition-[width,transform] duration-300 lg:relative',
        collapsed ? 'w-0 -translate-x-full lg:w-20 lg:translate-x-0' : 'w-[268px] translate-x-0',
      )}
    >

      <div
        className={cn(
          'relative flex h-20 shrink-0 items-center gap-3 border-b border-white/15 transition-all duration-300',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <img
          src="/logo.png"
          alt=""
          className={cn(
            'rounded-xl bg-white object-contain p-1 transition-all duration-300',
            collapsed ? 'size-10' : 'size-12',
          )}
        />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block font-heading text-xl font-semibold leading-none text-white">
              Connect
            </span>
            {/* Which channel this console operates, said once and quietly.
                The wordmark keeps its line at full size; this sits under it in
                the recessive register rather than competing for the title. */}
            <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
              <WhatsAppMark className="size-3" />
              <span className="text-[11px] leading-none text-white/70">
                Speciality Coffee Roasters
              </span>
            </span>
          </span>
        )}
      </div>

      <nav className="relative flex-1 overflow-y-auto no-scrollbar px-2 py-4">
        {NAV_ITEMS.map((item) => (
          <React.Fragment key={item.to}>
            {item.divider && (
              <hr
                aria-hidden="true"
                className={cn('border-0 border-t border-white/15', collapsed ? 'mx-2 my-3' : 'my-3')}
              />
            )}
            <NavItem item={item} collapsed={collapsed} setCollapsed={setCollapsed} />
          </React.Fragment>
        ))}
      </nav>

      {/* Who is signed in. It sat in the top-right of the header as a fixed
          "Administrator / ASKworX" that named nobody — the same two words for
          every account, on a panel that now has real ones. It belongs next to
          Sign out, because that is the only control it relates to.

          The address itself, not a display name built from it: capitalising
          the part before the @ turns developersrujan12 into
          "Developersrujan12" and presents a guess as though it were the
          person's name. An account here is identified by its email, so that
          is what this shows. */}
      <div className="relative border-t border-white/15 p-2">
        {email && (
          <div
            className={cn(
              'flex items-center gap-3 py-2.5',
              collapsed ? 'justify-center px-0' : 'px-2',
            )}
            title={collapsed ? email : undefined}
          >
            <span
              aria-hidden="true"
              className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-bold uppercase leading-none text-sidebar"
            >
              {email.charAt(0)}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold leading-none tracking-[0.06em] uppercase text-white/60">
                  Signed in as
                </span>
                <span className="mt-1.5 block truncate text-[13px] font-medium leading-tight text-white">
                  {email}
                </span>
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white',
            collapsed ? 'justify-center px-0' : 'px-2',
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
