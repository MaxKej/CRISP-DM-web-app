import { useState } from "react";
import type { SubmitEvent } from "react";

import { changePassword } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { showNotification } = useNotification();

  const [username, setUsername] = useState(
    user?.username ?? ""
  );

  const [email, setEmail] = useState(
    user?.email ?? ""
  );

  const [firstName, setFirstName] = useState(
    user?.first_name ?? ""
  );

  const [lastName, setLastName] = useState(
    user?.last_name ?? ""
  );

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  const handleProfileSubmit = async (
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsSavingProfile(true);

    try {
      await updateProfile({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
      });

      showNotification(
        "Dane profilu zostały zmienione.",
        "success"
      );
    } catch (error: any) {
      const data = error.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data).flatMap(
          ([, value]) => {
            if (Array.isArray(value)) {
              return value.map((message) =>
                String(message)
              );
            }

            return [String(value)];
          }
        );

        showNotification(
          messages.length > 0
            ? messages.join(" ")
            : "Nie udało się zapisać danych.",
          "error"
        );
      } else {
        showNotification(
          "Nie udało się połączyć z serwerem.",
          "error"
        );
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (newPassword !== newPassword2) {
      showNotification(
        "Nowe hasła nie są takie same.",
        "error"
      );

      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });

      showNotification(
        response.detail || "Hasło zostało zmienione.",
        "success"
      );

      setOldPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (error: any) {
      const data = error.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data).flatMap(
          ([, value]) => {
            if (Array.isArray(value)) {
              return value.map((message) =>
                String(message)
              );
            }

            return [String(value)];
          }
        );

        showNotification(
          messages.length > 0
            ? messages.join(" ")
            : "Nie udało się zmienić hasła.",
          "error"
        );
      } else {
        showNotification(
          "Nie udało się połączyć z serwerem.",
          "error"
        );
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold">
          Profil użytkownika
        </h1>

        <p className="mt-1 text-gray-600">
          Zarządzaj swoimi danymi oraz hasłem.
        </p>

        <section className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Dane użytkownika
          </h2>

          <form
            onSubmit={handleProfileSubmit}
            className="mt-6 space-y-4"
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
                maxLength={150}
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
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="first-name"
                  className="mb-1 block text-sm font-medium"
                >
                  Imię
                </label>

                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>

              <div>
                <label
                  htmlFor="last-name"
                  className="mb-1 block text-sm font-medium"
                >
                  Nazwisko
                </label>

                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSavingProfile
                ? "Zapisywanie..."
                : "Zapisz zmiany"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">
            Zmiana hasła
          </h2>

          <form
            onSubmit={handlePasswordSubmit}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="old-password"
                className="mb-1 block text-sm font-medium"
              >
                Obecne hasło
              </label>

              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(event) =>
                  setOldPassword(event.target.value)
                }
                required
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium"
              >
                Nowe hasło
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                required
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="new-password2"
                className="mb-1 block text-sm font-medium"
              >
                Powtórz nowe hasło
              </label>

              <input
                id="new-password2"
                type="password"
                value={newPassword2}
                onChange={(event) =>
                  setNewPassword2(event.target.value)
                }
                required
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isChangingPassword
                ? "Zmiana hasła..."
                : "Zmień hasło"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
