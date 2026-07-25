"use client";

import { useState } from "react";
import { KeyRound, Lock, Mail, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, registerPractitioner } from "@/lib/api/auth";
import type { Practitioner } from "@/types/api";

interface RegisterFormProps {
  onRegistered: (practitioner: Practitioner) => void;
}

interface FormState {
  name_given: string;
  name_family: string;
  identifier_value: string;
  qualification_code: string;
  telecom_email: string;
  password: string;
  password_confirmation: string;
  registration_password: string;
}

const EMPTY_FORM: FormState = {
  name_given: "",
  name_family: "",
  identifier_value: "",
  qualification_code: "",
  telecom_email: "",
  password: "",
  password_confirmation: "",
  registration_password: "",
};

/**
 * Comprobaciones de UX antes de enviar. El backend valida igualmente:
 * estas solo evitan un viaje al servidor para errores evidentes.
 */
function validate(form: FormState): string {
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (form.password !== form.password_confirmation) {
    return "Las contraseñas no coinciden.";
  }
  if (!form.registration_password.trim()) {
    return "Introduce la clave de alta que te ha dado administración.";
  }
  return "";
}

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const practitioner = await registerPractitioner({
        identifier_value: form.identifier_value.trim(),
        name_given: form.name_given.trim(),
        name_family: form.name_family.trim(),
        qualification_code: form.qualification_code.trim() || null,
        telecom_email: form.telecom_email.trim(),
        password: form.password,
        registration_password: form.registration_password,
      });

      onRegistered(practitioner);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name_given">Nombre</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="name_given"
              className="pl-9"
              value={form.name_given}
              onChange={setField("name_given")}
              maxLength={100}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name_family">Apellidos</Label>
          <Input
            id="name_family"
            value={form.name_family}
            onChange={setField("name_family")}
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="identifier_value">Nº Colegiado</Label>
          <Input
            id="identifier_value"
            value={form.identifier_value}
            onChange={setField("identifier_value")}
            minLength={3}
            maxLength={20}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="qualification_code">Especialidad</Label>
          <div className="relative">
            <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="qualification_code"
              className="pl-9"
              placeholder="Medicina Familiar y Comunitaria"
              value={form.qualification_code}
              onChange={setField("qualification_code")}
              maxLength={50}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="telecom_email">Email de acceso</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="telecom_email"
            type="email"
            className="pl-9"
            placeholder="medico@consultamed.es"
            value={form.telecom_email}
            onChange={setField("telecom_email")}
            maxLength={100}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              className="pl-9"
              value={form.password}
              onChange={setField("password")}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password_confirmation">Repetir contraseña</Label>
          <Input
            id="password_confirmation"
            type="password"
            value={form.password_confirmation}
            onChange={setField("password_confirmation")}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_password">Clave de alta (administración)</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="registration_password"
            type="password"
            className="pl-9"
            value={form.registration_password}
            onChange={setField("registration_password")}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Sin esta clave no se puede dar de alta ningún perfil.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creando perfil..." : "Crear perfil"}
      </Button>
    </form>
  );
}
