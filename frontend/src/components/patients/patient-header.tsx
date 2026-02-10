"use client";

import { AlertCircle, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPatientGender } from "@/lib/patients/directory";
import type { Patient } from "@/types/api";

interface PatientHeaderProps {
  patient: Patient;
  variant?: "full" | "compact" | "minimal";
  showAllergies?: boolean;
  className?: string;
}

/**
 * Reusable PatientHeader component with three variants:
 * - "full": Complete patient info with contact details (patient detail page)
 * - "compact": Patient name + ID + age + gender (encounter pages)
 * - "minimal": Just name and ID (inline use)
 */
export function PatientHeader({
  patient,
  variant = "full",
  showAllergies = true,
  className,
}: PatientHeaderProps) {
  const fullName = `${patient.name_given} ${patient.name_family}`;

  if (variant === "minimal") {
    return (
      <div className={cn("text-sm", className)}>
        <span className="font-semibold">{fullName}</span>
        <span className="text-gray-600 ml-2">({patient.identifier_value})</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "bg-blue-50 border border-blue-200 rounded-lg p-4",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="font-semibold text-blue-800">{fullName}</span>
            <span className="text-blue-600 ml-4">
              {patient.identifier_value} · {patient.age} años ·{" "}
              {formatPatientGender(patient.gender)}
            </span>
          </div>
          {showAllergies && patient.allergies.length > 0 && (
            <div className="ml-auto flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">
                {patient.allergies.length} alergia{patient.allergies.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // variant === "full"
  return (
    <div className={cn("bg-white rounded-lg shadow-md p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{fullName}</h2>
          <div className="flex items-center gap-4 mt-2 text-gray-600">
            <span>{patient.identifier_value}</span>
            <span>•</span>
            <span>{patient.age} años</span>
            <span>•</span>
            <span>{formatPatientGender(patient.gender)}</span>
          </div>

          {(patient.telecom_phone || patient.telecom_email) && (
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              {patient.telecom_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{patient.telecom_phone}</span>
                </div>
              )}
              {patient.telecom_email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{patient.telecom_email}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {showAllergies && patient.allergies.length > 0 && (
          <div className="ml-6 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                {patient.allergies.length} alergia{patient.allergies.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

