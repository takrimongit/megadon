import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { CenterSpinner } from './components/Ui';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import NewCampaignPage from './pages/NewCampaignPage';
import BatchesPage from './pages/BatchesPage';
import BatchReviewPage from './pages/BatchReviewPage';
import GeekModePage from './pages/GeekModePage';
import AnalyticsPage from './pages/AnalyticsPage';
import BrandPlaybookPage from './pages/BrandPlaybookPage';
import UsagePage from './pages/UsagePage';

export default function App() {
  const { status, error, retry, playbook } = useAuth();
  const location = useLocation();

  if (status === 'loading' || status === 'bootstrapping') {
    return (
      <div className="auth-bg">
        <CenterSpinner label="Loading your workspace…" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="auth-bg">
        <div className="card auth-card col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h3>Couldn't reach AdForge</h3>
          <p className="sub">{error}</p>
          <button className="btn btn-primary" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // Signed in. Brand onboarding is mandatory before the main app.
  const onboarded = playbook?.status === 'approved';
  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/campaigns/new" element={<NewCampaignPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/batches/:batchId" element={<BatchReviewPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/brand" element={<BrandPlaybookPage />} />
        <Route path="/geek" element={<GeekModePage />} />
        <Route path="/usage" element={<UsagePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
