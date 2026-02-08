import Image from "next/image";
import { HOSPITAL_LOGO_ALT, HOSPITAL_NAME } from "@/lib/branding/constants";
import { cn } from "@/lib/utils";

interface HospitalBrandProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function HospitalBrand({ title, subtitle, className }: HospitalBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-28 items-center justify-center rounded-lg border border-gray-200 bg-white px-1.5 shadow-sm sm:h-11 sm:w-32">
        <Image
          src="/assets/logo-guadalix.png"
          alt={HOSPITAL_LOGO_ALT}
          width={1100}
          height={360}
          className="h-7 w-auto object-contain sm:h-8"
        />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle ?? HOSPITAL_NAME}</p>
      </div>
    </div>
  );
}
