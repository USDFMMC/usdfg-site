import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import ArenaRoute from './pages/ArenaRoute';
import WhitepaperPage from './pages/WhitepaperPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CreateChallenge from './pages/app/challenge/new';
import PlayerProfile from './pages/app/profile/[address]';
import CategoryDetailPage from './pages/app/category/[category]';
import DisputeConsole from './pages/admin/DisputeConsole';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<ArenaRoute />} />
      <Route path="/app/challenge/new" element={<CreateChallenge />} />
      <Route path="/app/profile/:address" element={<PlayerProfile />} />
      <Route path="/app/category/:category" element={<CategoryDetailPage />} />
      <Route path="/admin" element={<Navigate to="/admin/disputes" replace />} />
      <Route path="/admin/disputes" element={<DisputeConsole />} />
      <Route path="/whitepaper" element={<WhitepaperPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
