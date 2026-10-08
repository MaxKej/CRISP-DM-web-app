import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to="/projects"
          className="text-xl font-bold"
        >
          CRISP-DM
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/projects"
            className="text-gray-700 hover:text-blue-600"
          >
            Projekty
          </Link>

          <Link
            to="/profile"
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            {user?.username}
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Wyloguj
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;