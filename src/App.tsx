import { Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app/*" element={<ArenaRoute />}>
        <Route index element={<ArenaApp />} />
        <Route path="challenge/new" element={<CreateChallenge />} />
        <Route path="profile/:address" element={<PlayerProfile />} />
        <Route path="category/:category" element={<CategoryDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/admin/*" element={<AdminLayout />}>
        <Route index element={<Navigate to="disputes" replace />} />
        <Route path="disputes" element={<DisputeConsole />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/whitepaper" element={<WhitepaperPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
