import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import AppInitializer from './components/AppInitializer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import CareerPage from './pages/Career/CareerPage';
import CareerStartPage from './pages/Career/CareerStartPage';
import DebriefPage from './pages/Career/DebriefPage';
import DailyActivitiesPage from './pages/Activities/DailyActivitiesPage';
import AchievementsPage from './pages/Achievements/AchievementsPage';
import ShowcasePage from './pages/Showcase/ShowcasePage';
import GamesPage from './pages/Games/GamesPage';
import GameLobbyPage from './pages/Games/GameLobbyPage';
import TradingGamePage from './pages/Games/TradingGamePage';
import TechVenturePlayPage from './pages/Games/TechVenturePlayPage';
import TechVentureLobbyPage from './pages/Games/TechVentureLobbyPage';
import WikiPage from './pages/Wiki/WikiPage';
import WikiArticlePage from './pages/Wiki/WikiArticlePage';
import CoursesPage from './pages/Courses/CoursesPage';
import CourseDetailPage from './pages/Courses/CourseDetailPage';
import WealthOfNationsPage from './pages/WealthOfNations/WealthOfNationsPage';
import OPCPage from './pages/OPC/OPCPage';
import TalentMarketPage from './pages/OPC/TalentMarketPage';
import MissionControlPage from './pages/OPC/MissionControlPage';
import BMCPage from './pages/OPC/BMCPage';
import EmployeeDetailPage from './pages/OPC/EmployeeDetailPage';
import MyCampPage from './pages/Camp/MyCampPage';
import JoinCampPage from './pages/Camp/JoinCampPage';
import SandboxPage from './pages/Sandbox/SandboxPage';
import GameFullscreenLayout from './components/GameFullscreenLayout';

function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* 对局全屏：无左侧导航 */}
          <Route
            element={
              <AuthGuard requireAuth>
                <GameFullscreenLayout />
              </AuthGuard>
            }
          >
            <Route path="games/:id/play" element={<TradingGamePage />} />
            <Route path="games/:id/techventure" element={<TechVenturePlayPage />} />
          </Route>

          <Route path="/" element={<Layout />}>
            {/* 公开页面 */}
            <Route index element={<HomePage />} />
            <Route path="showcase" element={<ShowcasePage />} />

            {/* 仅限游客 */}
            <Route
              path="login"
              element={
                <AuthGuard guestOnly>
                  <LoginPage />
                </AuthGuard>
              }
            />
            <Route
              path="register"
              element={
                <AuthGuard guestOnly>
                  <RegisterPage />
                </AuthGuard>
              }
            />

            {/* 需要登录 */}
            <Route
              path="dashboard"
              element={<Navigate to="/career" replace />}
            />
            <Route
              path="career"
              element={
                <AuthGuard requireAuth>
                  <CareerPage />
                </AuthGuard>
              }
            />
            <Route
              path="career/start"
              element={<CareerStartPage />}
            />
            <Route
              path="career/debrief/:matchId"
              element={
                <AuthGuard requireAuth>
                  <DebriefPage />
                </AuthGuard>
              }
            />
            <Route
              path="activities"
              element={
                <AuthGuard requireAuth>
                  <DailyActivitiesPage />
                </AuthGuard>
              }
            />
            <Route path="quests" element={<Navigate to="/activities" replace />} />
            <Route
              path="achievements"
              element={
                <AuthGuard requireAuth>
                  <AchievementsPage />
                </AuthGuard>
              }
            />
            <Route
              path="camp"
              element={
                <AuthGuard requireAuth>
                  <MyCampPage />
                </AuthGuard>
              }
            />
            <Route
              path="camp/join"
              element={
                <AuthGuard requireAuth>
                  <JoinCampPage />
                </AuthGuard>
              }
            />
            <Route
              path="camp/:groupId"
              element={
                <AuthGuard requireAuth>
                  <MyCampPage />
                </AuthGuard>
              }
            />
            <Route
              path="games"
              element={
                <AuthGuard requireAuth>
                  <GamesPage />
                </AuthGuard>
              }
            />
            <Route
              path="games/:id/lobby"
              element={
                <AuthGuard requireAuth>
                  <GameLobbyPage />
                </AuthGuard>
              }
            />
            <Route
              path="games/:id/techventure/lobby"
              element={
                <AuthGuard requireAuth>
                  <TechVentureLobbyPage />
                </AuthGuard>
              }
            />
            <Route
              path="wiki"
              element={
                <AuthGuard requireAuth>
                  <WikiPage />
                </AuthGuard>
              }
            />
            <Route
              path="wiki/:id"
              element={
                <AuthGuard requireAuth>
                  <WikiArticlePage />
                </AuthGuard>
              }
            />
            <Route
              path="courses"
              element={
                <AuthGuard requireAuth>
                  <CoursesPage />
                </AuthGuard>
              }
            />
            <Route
              path="courses/:id"
              element={
                <AuthGuard requireAuth>
                  <CourseDetailPage />
                </AuthGuard>
              }
            />
            <Route
              path="wealth-of-nations"
              element={
                <AuthGuard requireAuth>
                  <WealthOfNationsPage />
                </AuthGuard>
              }
            />
            {/* OPC 一人公司孵化器 */}
            <Route
              path="opc"
              element={
                <AuthGuard requireAuth>
                  <OPCPage />
                </AuthGuard>
              }
            />
            <Route
              path="opc/talent"
              element={
                <AuthGuard requireAuth>
                  <TalentMarketPage />
                </AuthGuard>
              }
            />
            <Route
              path="opc/missions"
              element={
                <AuthGuard requireAuth>
                  <MissionControlPage />
                </AuthGuard>
              }
            />
            <Route
              path="opc/bmc"
              element={
                <AuthGuard requireAuth>
                  <BMCPage />
                </AuthGuard>
              }
            />
            <Route
              path="opc/employee/:id"
              element={
                <AuthGuard requireAuth>
                  <EmployeeDetailPage />
                </AuthGuard>
              }
            />
            {/* 赛事工坊（开发工具）*/}
            <Route
              path="sandbox"
              element={
                <AuthGuard requireAuth>
                  <SandboxPage />
                </AuthGuard>
              }
            />
            {/* 旧路由重定向 */}
            <Route path="ohb" element={<Navigate to="/opc" replace />} />
            <Route path="ohb/*" element={<Navigate to="/opc" replace />} />
          </Route>
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}

export default App;
