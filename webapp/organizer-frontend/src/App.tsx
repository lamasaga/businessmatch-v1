import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthGuard from './components/AuthGuard';
import OrganizerBootstrap from './components/OrganizerBootstrap';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CampListPage from './pages/CampListPage';
import CampDetailPage from './pages/CampDetailPage';
import CreateCampPage from './pages/CreateCampPage';
import CreateEventPage from './pages/CreateEventPage';
import EventControlPage from './pages/EventControlPage';
import TechVentureControl from './pages/TechVentureControl';
import TechVentureScreen from './pages/TechVentureScreen';
import TechVentureJudge from './pages/TechVentureJudge';

export default function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <AuthGuard>
              <OrganizerBootstrap>
                <Layout />
              </OrganizerBootstrap>
            </AuthGuard>
          }
        >
          <Route index element={<CampListPage />} />
          <Route path="camps/create" element={<CreateCampPage />} />
          <Route path="camps/:id" element={<CampDetailPage />} />
          <Route path="events/create" element={<CreateEventPage />} />
          <Route path="events/:id" element={<EventControlPage />} />
          <Route path="events/:id/techventure" element={<TechVentureControl />} />
          <Route path="events/:id/techventure/screen" element={<TechVentureScreen />} />
          <Route path="events/:id/techventure/judge" element={<TechVentureJudge />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
