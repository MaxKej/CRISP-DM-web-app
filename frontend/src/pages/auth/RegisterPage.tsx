import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../../api/auth";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (password !== password2) {
      setError("Hasła nie są takie same.");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        username,
        email,
        password,
        password2,
      });

      navigate("/login");
    } catch (error: any) {
      const data = error.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data)
          .flatMap(([field, value]) => {
            if (Array.isArray(value)) {
              return value.map((message) => `${field}: ${message}`);
            }

            return [`${field}: ${String(value)}`];
          });

        setError(
          messages.length > 0
            ? messages.join("\n")
            : "Nie udało się utworzyć konta."
        );
      } else {
        setError("Nie udało się połączyć z serwerem.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">
          Rejestracja
        </h1>

        {error && (
          <div className="mb-4 whitespace-pre-line rounded-md bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="password2"
              className="mb-1 block text-sm font-medium"
            >
              Powtórz hasło
            </label>

            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(event) => setPassword2(event.target.value)}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Rejestracja..." : "Zarejestruj się"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Masz już konto?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;