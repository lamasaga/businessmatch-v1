import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import GamesPage from './pages/Games/GamesPage';
import GameRoomPage from './pages/Games/GameRoomPage';
import WikiPage from './pages/Wiki/WikiPage';
import WikiArticlePage from './pages/Wiki/WikiArticlePage';
import CoursesPage from './pages/Courses/CoursesPage';
import CourseDetailPage from './pages/Courses/CourseDetailPage';
import WealthOfNationsPage from './pages/WealthOfNations/WealthOfNationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:id" element={<GameRoomPage />} />
          <Route path="wiki" element={<WikiPage />} />
          <Route path="wiki/:id" element={<WikiArticlePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="wealth-of-nations" element={<WealthOfNationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
