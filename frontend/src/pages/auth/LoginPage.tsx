import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const LoginPage = () => {
  const navigate = useNavigate();

  const { login } = useAuth();
  const { showNotification } = useNotification();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsLoading(true);

    try {
      await login({
        username,
        password,
      });

      showNotification(
        "Zalogowano pomyślnie.",
        "success"
      );

      navigate("/projects");
    } catch (error: any) {
      const data = error.response?.data;

      if (data && typeof data === "object") {
        if (typeof data.detail === "string") {
          showNotification(data.detail, "error");
        } else {
          showNotification(
            "Nieprawidłowa nazwa użytkownika lub hasło.",
            "error"
          );
        }
      } else {
        showNotification(
          "Nie udało się połączyć z serwerem.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">
          Logowanie
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium"
            >
              Nazwa użytkownika
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Hasło
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading
              ? "Logowanie..."
              : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Nie masz jeszcze konta?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline"
          >
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
