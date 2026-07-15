import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PostProvider } from './context/PostContext';
import { NotificationProvider } from './context/NotificationContext';
import { MessageProvider } from './context/MessageContext';
import { SupabaseSyncProvider } from './context/SupabaseSyncContext';
import { CommunityProvider } from './context/CommunityContext';
import { runDataCleanup } from './lib/cleanup';
import { runMigration } from './lib/migrate';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Explore from './pages/Explore';
import { Toaster } from './components/ui/sonner';

/* Vite emits this when a lazy-loaded chunk 404s -- typically because the
   service worker or browser is holding an index.html from a previous
   deploy that references JS chunks which no longer exist on the server.
   A one-time reload picks up the current deployment. */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    const key = 'hobbyhub_reloaded_after_preload_error';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
  });
}

/* ─── Lazy load all non-critical pages ─── */
const Login            = lazy(() => import('./pages/Login'));
const Signup           = lazy(() => import('./pages/Signup'));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword    = lazy(() => import('./pages/ResetPassword'));
const Admin            = lazy(() => import('./pages/Admin'));
const PrivacyPolicy    = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService   = lazy(() => import('./pages/TermsOfService'));
const Support          = lazy(() => import('./pages/Support'));
const Community        = lazy(() => import('./pages/Community'));
const GuideEditor       = lazy(() => import('./pages/GuideEditor'));
const GuideDetail       = lazy(() => import('./pages/GuideDetail'));
const AskQuestion       = lazy(() => import('./pages/AskQuestion'));
const QuestionDetail    = lazy(() => import('./pages/QuestionDetail'));
const ProjectEditor     = lazy(() => import('./pages/ProjectEditor'));
const ProjectDetail     = lazy(() => import('./pages/ProjectDetail'));
const Updates           = lazy(() => import('./pages/Updates'));
const DataPrivacy       = lazy(() => import('./pages/DataPrivacy'));
const CreatePost       = lazy(() => import('./pages/CreatePost'));
const Profile          = lazy(() => import('./pages/Profile'));
const Notifications    = lazy(() => import('./pages/Notifications'));
const Messages         = lazy(() => import('./pages/Messages'));
const Chat             = lazy(() => import('./pages/Chat'));

function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
    </div>
  );
}

/* Clear all old localStorage data on first load of new version */
runDataCleanup();
/* Migrate old flat-format joins to per-user storage */
runMigration();

function App() {
  return (
    <ErrorBoundary>
      <SupabaseSyncProvider>
        <AuthProvider>
          <CommunityProvider>
            <PostProvider>
              <NotificationProvider>
                <MessageProvider>
                  <Router>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Suspense fallback={<InlineLoader />}><Login /></Suspense>} />
                    <Route path="/signup" element={<Suspense fallback={<InlineLoader />}><Signup /></Suspense>} />
                    <Route path="/forgot-password" element={<Suspense fallback={<InlineLoader />}><ForgotPassword /></Suspense>} />
                    <Route path="/reset-password" element={<Suspense fallback={<InlineLoader />}><ResetPassword /></Suspense>} />
                    <Route path="/admin" element={<AdminRoute><Suspense fallback={<InlineLoader />}><Admin /></Suspense></AdminRoute>} />

                    {/* Protected Application Routes Layout */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Home />} />
                      <Route path="explore" element={<Explore />} />
                      <Route path="community/:id" element={<Suspense fallback={<InlineLoader />}><Community /></Suspense>} />
                      <Route path="community/:id/guides/new" element={<Suspense fallback={<InlineLoader />}><GuideEditor /></Suspense>} />
                      <Route path="community/:id/guides/:guideId/edit" element={<Suspense fallback={<InlineLoader />}><GuideEditor /></Suspense>} />
                      <Route path="community/:id/guides/:guideId" element={<Suspense fallback={<InlineLoader />}><GuideDetail /></Suspense>} />
                      <Route path="community/:id/questions/new" element={<Suspense fallback={<InlineLoader />}><AskQuestion /></Suspense>} />
                      <Route path="community/:id/questions/:questionId" element={<Suspense fallback={<InlineLoader />}><QuestionDetail /></Suspense>} />
                      <Route path="community/:id/projects/new" element={<Suspense fallback={<InlineLoader />}><ProjectEditor /></Suspense>} />
                      <Route path="community/:id/projects/:projectId" element={<Suspense fallback={<InlineLoader />}><ProjectDetail /></Suspense>} />
                      <Route path="create-post" element={<Suspense fallback={<InlineLoader />}><CreatePost /></Suspense>} />
                      <Route path="notifications" element={<Suspense fallback={<InlineLoader />}><Notifications /></Suspense>} />
                      <Route path="messages" element={<Suspense fallback={<InlineLoader />}><Messages /></Suspense>} />
                      <Route path="chat/:id" element={<Suspense fallback={<InlineLoader />}><Chat /></Suspense>} />
                      <Route path="profile" element={<Suspense fallback={<InlineLoader />}><Profile /></Suspense>} />
                      <Route path="privacy" element={<Suspense fallback={<InlineLoader />}><PrivacyPolicy /></Suspense>} />
                      <Route path="terms" element={<Suspense fallback={<InlineLoader />}><TermsOfService /></Suspense>} />
                      <Route path="support" element={<Suspense fallback={<InlineLoader />}><Support /></Suspense>} />
                      <Route path="updates" element={<Suspense fallback={<InlineLoader />}><Updates /></Suspense>} />
                      <Route path="privacy-data" element={<Suspense fallback={<InlineLoader />}><DataPrivacy /></Suspense>} />
                    </Route>
                  </Routes>
                </Router>
                <Toaster />
              </MessageProvider>
            </NotificationProvider>
          </PostProvider>
          </CommunityProvider>
        </AuthProvider>
      </SupabaseSyncProvider>
    </ErrorBoundary>
  );
}

export default App;
