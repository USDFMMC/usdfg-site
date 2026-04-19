import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ArenaRoute from './pages/ArenaRoute';
import ArenaApp from './pages/ArenaApp';
import WhitepaperPage from './pages/WhitepaperPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CreateChallenge from './pages/app/challenge/new';
import PlayerProfile from './pages/app/profile/[address]';
import CategoryDetailPage from './pages/app/category/[category]';
import DisputeConsole from './pages/admin/DisputeConsole';
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './layouts/AdminLayout';

/**
 * Admin layout routes use `/*` on the parent so React Router v7 matches nested paths
 * like `/console-7x9a/disputes` (layout + child). Without the splat, the parent may not
 * match deep links and the catch-all can behave incorrectly.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Landing />} />

      <Route path="/console-7x9a/*" element={<AdminLayout />}>
        <Route path="disputes" element={<DisputeConsole />} />
      </Route>

      <Route path="/admin/*" element={<AdminLayout />}>
        <Route path="disputes" element={<DisputeConsole />} />
      </Route>

      <Route path="/app/*" element={<ArenaRoute />}>
        <Route index element={<ArenaApp />} />
        <Route path="challenge/new" element={<CreateChallenge />} />
        <Route path="profile/:address" element={<PlayerProfile />} />
        <Route path="category/:category" element={<CategoryDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/whitepaper" element={<WhitepaperPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
