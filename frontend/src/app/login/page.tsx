"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { fetchAvailablePractitioners, formatPractitionerName, login } from "@/lib/api/auth";
import { authStore } from "@/lib/stores/auth-store";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { APP_NAME } from "@/lib/branding/constants";
import { PractitionerPicker } from "@/components/auth/practitioner-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Lock } from "lucide-react";
import type { PractitionerPublicSummary } from "@/types/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [practitioners, setPractitioners] = useState<PractitionerPublicSummary[]>([]);
  const [isLoadingPractitioners, setIsLoadingPractitioners] = useState(true);
  const [practitionersError, setPractitionersError] = useState("");
  const router = useRouter();

  const loadPractitioners = useCallback(async () => {
    setIsLoadingPractitioners(true);
    setPractitionersError("");

    try {
      setPractitioners(await fetchAvailablePractitioners());
    } catch {
      setPractitioners([]);
      setPractitionersError(
        "No se pudo cargar la lista de perfiles. Introduce tus credenciales manualmente.",
      );
    } finally {
      setIsLoadingPractitioners(false);
    }
  }, []);

  useEffect(() => {
    void loadPractitioners();
  }, [loadPractitioners]);

  const handleSelectPractitioner = (practitioner: PractitionerPublicSummary) => {
    setEmail(practitioner.telecom_email ?? "");
    document.getElementById("password")?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await login(email, password);

      authStore.login(data.access_token, data.practitioner);
      api.setToken(data.access_token);

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPractitioner = practitioners.find((p) => p.telecom_email === email);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <HospitalBrand title={APP_NAME} className="text-left" />
          </div>
          <p className="text-sm text-muted-foreground">Gestión Clínica Inteligente</p>
        </div>

        <PractitionerPicker
          practitioners={practitioners}
          selectedEmail={email}
          isLoading={isLoadingPractitioners}
          error={practitionersError}
          onSelect={handleSelectPractitioner}
        />

        {/* Login Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              {selectedPractitioner
                ? `Accediendo como ${formatPractitionerName(selectedPractitioner)}`
                : "Introduce tus credenciales para continuar"}
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
                <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verificando..." : "Acceder al Sistema"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t bg-gray-50/50 p-4">
            <p className="text-xs text-muted-foreground">
              Sistema seguro de gestión de historia clínica electrónica
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
