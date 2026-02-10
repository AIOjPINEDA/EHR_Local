"use client";

import Link from "next/link";
import { formatLastEncounterDate, formatPatientGender } from "@/lib/patients/directory";
import { cn } from "@/lib/utils";
import type { PatientSummary } from "@/types/api";

export interface PatientListProps {
  patients: PatientSummary[];
  showPhone?: boolean;
  showActionLink?: boolean;
  actionLinkText?: string;
  className?: string;
}

/**
 * Reusable PatientList component for displaying patient data in a table.
 *
 * Supports two layouts:
 * - Dashboard: Compact view with allergies badge (no phone, no action link)
 * - Patients Directory: Full view with phone and action link
 *
 * @param patients - Array of PatientSummary objects to display
 * @param showPhone - Whether to display the phone column (default: false)
 * @param showActionLink - Whether to display the action link column (default: false)
 * @param actionLinkText - Custom text for the action link (default: "Ver ficha →")
 * @param className - Additional CSS classes for the table wrapper
 */
export function PatientList({
  patients,
  showPhone = false,
  showActionLink = false,
  actionLinkText = "Ver ficha →",
  className,
}: PatientListProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">
              {showPhone ? "DNI" : "Paciente"}
            </th>
            <th className="px-6 py-3 text-left font-semibold">
              {showPhone ? "Nombre" : "ID"}
            </th>
            <th className="px-6 py-3 text-left font-semibold">Edad</th>
            <th className="px-6 py-3 text-left font-semibold">Género</th>
            <th className="px-6 py-3 text-left font-semibold">Consultas</th>
            <th className="px-6 py-3 text-left font-semibold">Última consulta</th>
            {showPhone && (
              <th className="px-6 py-3 text-left font-semibold">Teléfono</th>
            )}
            <th className="px-6 py-3 text-left font-semibold">Alergias</th>
            {showActionLink && <th className="px-6 py-3 text-left"></th>}
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr
              key={patient.id}
              className="border-t border-gray-100 hover:bg-gray-50"
            >
              <td className={cn("px-6 py-4", showPhone ? "font-mono text-xs text-gray-600" : "font-medium")}>
                {showPhone ? (
                  patient.identifier_value
                ) : (
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {patient.name_given} {patient.name_family}
                  </Link>
                )}
              </td>
              <td className={cn("px-6 py-4", showPhone ? "" : "font-mono text-xs text-gray-600")}>
                {showPhone ? (
                  <Link
                    href={`/patients/${patient.id}`}
                    className="font-medium text-gray-800 hover:text-blue-600"
                  >
                    {patient.name_given} {patient.name_family}
                  </Link>
                ) : (
                  patient.identifier_value
                )}
              </td>
              <td className="px-6 py-4 text-gray-600">{patient.age} años</td>
              <td className="px-6 py-4 text-gray-600">
                {formatPatientGender(patient.gender)}
              </td>
              <td className="px-6 py-4 text-gray-700">{patient.encounter_count}</td>
              <td className="px-6 py-4 text-gray-600">
                {formatLastEncounterDate(patient.last_encounter_at)}
              </td>
              {showPhone && (
                <td className="px-6 py-4 text-gray-600">
                  {patient.telecom_phone || "-"}
                </td>
              )}
              <td className="px-6 py-4">
                {patient.has_allergies ? (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                    {patient.allergy_count} alergia
                    {patient.allergy_count === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Sin registro</span>
                )}
              </td>
              {showActionLink && (
                <td className="px-6 py-4">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    {actionLinkText}
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

