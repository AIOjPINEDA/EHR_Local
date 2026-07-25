"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { formatLastEncounterAge, formatPatientGender } from "@/lib/patients/directory";
import { cn } from "@/lib/utils";
import type { PatientSummary } from "@/types/api";

export interface PatientListProps {
  patients: PatientSummary[];
  showPhone?: boolean;
  showActionLink?: boolean;
  actionLinkText?: string;
  showNewEncounterAction?: boolean;
  className?: string;
}

/**
 * Tabla reutilizable de pacientes.
 *
 * Las columnas van siempre en el mismo orden (nombre primero, que es por lo que
 * se busca al paciente que tienes delante); las opciones solo añaden o quitan
 * columnas, nunca las reordenan.
 *
 * @param patients - Pacientes a mostrar
 * @param showPhone - Añade la columna de teléfono (default: false)
 * @param showActionLink - Añade el enlace a la ficha al final de la fila (default: false)
 * @param actionLinkText - Texto del enlace de acción (default: "Ver ficha →")
 * @param showNewEncounterAction - Añade el acceso directo a nueva consulta (default: false)
 * @param className - Clases adicionales para el contenedor de la tabla
 */
export function PatientList({
  patients,
  showPhone = false,
  showActionLink = false,
  actionLinkText = "Ver ficha →",
  showNewEncounterAction = false,
  className,
}: PatientListProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-6 py-3 text-left font-semibold">Paciente</th>
            <th className="px-6 py-3 text-left font-semibold">DNI</th>
            <th className="px-6 py-3 text-left font-semibold">Edad</th>
            <th className="px-6 py-3 text-left font-semibold">Género</th>
            <th className="px-6 py-3 text-left font-semibold">Consultas</th>
            <th className="px-6 py-3 text-left font-semibold">Última visita</th>
            {showPhone && <th className="px-6 py-3 text-left font-semibold">Teléfono</th>}
            <th className="px-6 py-3 text-left font-semibold">Alergias</th>
            {showNewEncounterAction && <th className="px-6 py-3 text-left"></th>}
            {showActionLink && <th className="px-6 py-3 text-left"></th>}
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-6 py-4 font-medium">
                <Link
                  href={`/patients/${patient.id}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {patient.name_given} {patient.name_family}
                </Link>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-600">
                {patient.identifier_value}
              </td>
              <td className="px-6 py-4 text-gray-600">{patient.age} años</td>
              <td className="px-6 py-4 text-gray-600">{formatPatientGender(patient.gender)}</td>
              <td className="px-6 py-4 tabular-nums text-gray-700">{patient.encounter_count}</td>
              <td className="px-6 py-4 text-gray-600">
                {formatLastEncounterAge(patient.last_encounter_at)}
              </td>
              {showPhone && (
                <td className="px-6 py-4 text-gray-600">{patient.telecom_phone || "-"}</td>
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
              {showNewEncounterAction && (
                <td className="px-6 py-4">
                  <Link
                    href={`/patients/${patient.id}/encounters/new`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    <Plus className="h-4 w-4" /> Nueva Consulta
                  </Link>
                </td>
              )}
              {showActionLink && (
                <td className="px-6 py-4">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
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
