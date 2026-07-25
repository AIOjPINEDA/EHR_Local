"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { HospitalBrand } from "@/components/branding/hospital-brand";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPractitionerName } from "@/lib/api/auth";
import { APP_NAME } from "@/lib/branding/constants";
import type { Practitioner } from "@/types/api";

export default function RegisterPage() {
  const [registered, setRegistered] = useState<Practitioner | null>(null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <HospitalBrand title={APP_NAME} className="text-left" />
          </div>
          <p className="text-sm text-muted-foreground">Alta de profesional</p>
        </div>

        {registered ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Perfil creado
              </CardTitle>
              <CardDescription>
                {formatPractitionerName(registered)} ya puede acceder al sistema con{" "}
                {registered.telecom_email}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Crear perfil nuevo</CardTitle>
              <CardDescription>
                Alta de un médico en esta consulta. Necesitas la clave de alta que entrega
                administración.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm onRegistered={setRegistered} />
            </CardContent>
            <CardFooter className="justify-center border-t bg-gray-50/50 p-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al acceso
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}
