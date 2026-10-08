import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ProfilePage from "./pages/auth/ProfilePage";

import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectCreatePage from "./pages/projects/ProjectCreatePage";
import ProjectPage from "./pages/projects/ProjectPage";
import ProjectEditPage from "./pages/projects/ProjectEditPage";

import DatasetPage from "./pages/datasets/DatasetPage";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Notification from "./components/Notification";

import { useNotification } from "./context/NotificationContext";


function App() {
  const {
    notification,
    hideNotification,
  } = useNotification();


  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}


      <BrowserRouter>
        <Routes>

          {/* ========================= */}
          {/* PUBLIC ROUTES              */}
          {/* ========================= */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />


          {/* ========================= */}
          {/* PROTECTED ROUTES           */}
          {/* ========================= */}

          <Route element={<ProtectedRoute />}>

            <Route
              path="/projects"
              element={
                <>
                  <Navbar />
                  <ProjectsPage />
                </>
              }
            />


            <Route
              path="/projects/new"
              element={
                <>
                  <Navbar />
                  <ProjectCreatePage />
                </>
              }
            />


            <Route
              path="/projects/:projectId"
              element={
                <>
                  <Navbar />
                  <ProjectPage />
                </>
              }
            />


            <Route
              path="/projects/:projectId/edit"
              element={
                <>
                  <Navbar />
                  <ProjectEditPage />
                </>
              }
            />


            {/* Dataset / CRISP-DM */}
            <Route
              path="/projects/:projectId/datasets/:datasetId"
              element={
                <>
                  <Navbar />
                  <DatasetPage />
                </>
              }
            />


            <Route
              path="/profile"
              element={
                <>
                  <Navbar />
                  <ProfilePage />
                </>
              }
            />

          </Route>


          {/* ========================= */}
          {/* FALLBACK                   */}
          {/* ========================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </>
  );
}


export default App;