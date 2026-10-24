import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Menu, PanelLeftClose } from 'lucide-react';

import Sidebar from './components/Sidebar';
import WhatsAppMark from './components/WhatsAppMark';
import { TOKEN_KEY } from './api';
import { PageTransition } from './components/motion/PageTransition';
import { cn } from './lib/utils';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Contacts from './pages/Contacts';
import Messages from './pages/Messages';
import Campaigns from './pages/Campaigns';
import Offers from './pages/Offers';
import Templates from './pages/Templates';

// Internal Management Pages
import BotConfig from './pages/BotConfig';

/**
 * Every routed page renders inside this shell: ink rail on the left, a
 * hairline-ruled title block across the top, white working area below.
 *
 * It is a layout *route*, so it stays mounted across navigations — that is
 * what lets the sidebar keep its collapsed state and lets the active rail
 * slide from one item to the next instead of remounting at the new position.
 */
const Layout = () => {
  // Start collapsed on small screens so the rail never covers the work.
  const [collapsed, setCollapsed] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );

  // Messages is a fixed-height chat console, not a document — it does its own
  // scrolling (contact list, message log) and must land pixel-exact in the
  // space below the header. It used to size itself with calc(100vh-9rem),
  // guessing at the header height plus the container's padding; a 1px miss
  // there (easy — border widths, sub-pixel layout) made `main` itself
  // scrollable too, so a stray scrollbar showed up at the edge of the whole
  // window even though there was nothing real to scroll. Letting main stretch
  // Messages via flexbox instead removes the guesswork entirely. Every other
  // route keeps the normal padded, page-scrolling container.
  const location = useLocation();
  const isMessages = location.pathname === '/messages';

  return (
    <div className="flex h-screen overflow-hidden bg-white text-body-text">
      {/* Scrim — only on mobile, where the rail overlays the page. */}
      {!collapsed && (
        <div
          aria-hidden="true"
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity lg:hidden"
        />
      )}

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Title block. Hairline rule, mono labels — the top of a drawing sheet. */}
        <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-white px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Open navigation' : 'Close navigation'}
              className="-ml-2 rounded-lg p-2 text-titanium-700 transition-colors hover:bg-paper hover:text-ink"
            >
              {collapsed ? <Menu className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>

            <span className="hidden items-center gap-2 sm:flex">
              <WhatsAppMark className="size-4" />
              <span className="text-[13px] font-medium text-body-text">
                WhatsApp marketing · Connect Speciality Coffee Roasters
              </span>
            </span>
          </div>

        </header>

        <main
          className={cn(
            'relative flex-1 bg-white',
            isMessages ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}
        >
          <AnimatedOutlet isMessages={isMessages} />
        </main>
      </div>
    </div>
  );
};

/**
 * Only the page body animates. AnimatePresence needs a key that changes with
 * the route, otherwise React reuses the same element and the outgoing page
 * never gets a chance to leave.
 */
const AnimatedOutlet = ({ isMessages }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition
        key={location.pathname}
        className={isMessages ? 'flex h-full flex-col' : 'container-admin'}
      >
        <Outlet />
      </PageTransition>
    </AnimatePresence>
  );
};

const ROUTES = [
  { path: '/', element: <Dashboard /> },
  { path: '/messages', element: <Messages /> },
  { path: '/contacts', element: <Contacts /> },
  { path: '/offers', element: <Offers /> },
  { path: '/campaigns', element: <Campaigns /> },
  { path: '/templates', element: <Templates /> },
  { path: '/leads', element: <Leads /> },
  { path: '/config', element: <BotConfig /> },
];

/**
 * Gate. Without a token every API call comes back 401 and the operator lands
 * on a panel of empty tables with no explanation — sending them to sign in
 * first is the only honest thing to show.
 */
const RequireAuth = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          {ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
