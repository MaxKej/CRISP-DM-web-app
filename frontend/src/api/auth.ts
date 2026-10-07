import apiClient from "./client";

import type {
  LoginData,
  LoginResponse,
  RegisterData,
  User,
  ChangePasswordData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
} from "../types/auth";

export const login = async (
  data: LoginData
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "auth/login/",
    data
  );

  return response.data;
};

export const register = async (
  data: RegisterData
): Promise<User> => {
  const response = await apiClient.post<User>(
    "auth/register/",
    data
  );

  return response.data;
};

export const logout = async (
  refreshToken: string
): Promise<void> => {
  await apiClient.post("auth/logout/", {
    refresh: refreshToken,
  });
};

export const refreshToken = async (
  refresh: string
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "auth/token/refresh/",
    {
      refresh,
    }
  );

  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<User>("auth/me/");

  return response.data;
};

export const updateMe = async (
  data: Partial<User>
): Promise<User> => {
  const response = await apiClient.patch<User>(
    "auth/me/",
    data
  );

  return response.data;
};

export const changePassword = async (
  data: ChangePasswordData
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    "auth/change-password/",
    data
  );

  return response.data;
};

export const requestPasswordReset = async (
  data: PasswordResetRequestData
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    "auth/password-reset/",
    data
  );

  return response.data;
};

export const confirmPasswordReset = async (
  data: PasswordResetConfirmData
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    "auth/password-reset-confirm/",
    data
  );

  return response.data;
};