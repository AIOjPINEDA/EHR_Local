"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { authStore } from "@/lib/stores/auth-store";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { APP_NAME } from "@/lib/branding/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoginResponse } from "@/types/api";

interface AvailableUser {
  email: string;
  name: string;
  specialty: string;
}

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
  const router = useRouter();

  const handleSelectUser = (user: AvailableUser) => {
    setEmail(user.email);
    document.getElementById("password")?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const data = await api.postForm<LoginResponse>("/auth/login", formData);

      authStore.login(data.access_token, data.practitioner);
      api.setToken(data.access_token);

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = AVAILABLE_USERS.find((u) => u.email === email);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <HospitalBrand
              title={APP_NAME}
              className="text-left"
            />
          </div>
          <p className="text-sm text-muted-foreground">Gestión Clínica Inteligente</p>
        </div>

        {/* Quick User Selection Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Selección rápida
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {AVAILABLE_USERS.map((user) => (
              <div
                key={user.email}
                onClick={() => handleSelectUser(user)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                  email === user.email ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-white"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {user.name.split(" ")[1]?.[0] || user.name[0]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.specialty}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Login Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              {selectedUser ? `Accediendo como ${selectedUser.name}` : "Introduce tus credenciales para continuar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="medico@ejemplo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verificando..." : "Acceder al Sistema"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t p-4 bg-gray-50/50">
            <p className="text-xs text-muted-foreground">
              Sistema seguro de gestión de historia clínica electrónica
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
