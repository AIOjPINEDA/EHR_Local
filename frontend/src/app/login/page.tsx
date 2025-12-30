"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";

interface LoginResponse {
  access_token: string;
  token_type: string;
  practitioner: {
    id: string;
    identifier_value: string;
    name_given: string;
    name_family: string;
    qualification_code: string | null;
    telecom_email: string | null;
  };
}

interface AvailableUser {
  email: string;
  name: string;
  specialty: string;
}

// Usuarios disponibles del consultorio (en producción vendría del backend)
const AVAILABLE_USERS: AvailableUser[] = [
  {
    email: "sara@consultamed.es",
    name: "Dra. Sara Isabel Muñoz Mejía",
    specialty: "Medicina Familiar y Comunitaria",
  },
  {
    email: "jaime@consultamed.es",
    name: "Dr. Jaime A. Pineda Moreno",
    specialty: "Medicina de Urgencias",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const router = useRouter();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setShowUserDropdown(false);
    if (showUserDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showUserDropdown]);

  const handleSelectUser = (user: AvailableUser) => {
    setEmail(user.email);
    setShowUserDropdown(false);
    // Focus en el campo de contraseña
    document.getElementById("password")?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Enviar como form-data para OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error de autenticación");
      }
      
      const data: LoginResponse = await response.json();
      
      // Guardar en store y API client
      authStore.login(data.access_token, data.practitioner);
      api.setToken(data.access_token);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = AVAILABLE_USERS.find((u) => u.email === email);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">ConsultaMed</h1>
          <p className="text-gray-600">Iniciar sesión</p>
        </div>

        {/* Quick User Selection */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-700 mb-3 font-medium">
            👤 Selección rápida de usuario
          </p>
          <div className="grid grid-cols-1 gap-2">
            {AVAILABLE_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleSelectUser(user)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  email === user.email
                    ? "border-blue-500 bg-blue-100"
                    : "border-transparent bg-white hover:border-blue-300"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user.name.split(" ")[1]?.[0] || user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.specialty}</p>
                </div>
                {email === user.email && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (hidden if user selected, shown as info) */}
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Iniciando sesión como:</p>
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmail("")}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="medico@consultorio.com"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Consultorio Médico Guadalix
        </p>
      </div>
    </main>
  );
}
