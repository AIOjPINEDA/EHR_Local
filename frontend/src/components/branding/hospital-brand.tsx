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
      <div className="flex items-center justify-center">
        <Image
          src="/assets/logo-guadalix.png"
          alt={HOSPITAL_LOGO_ALT}
          width={1100}
          height={360}
          className="h-12 w-auto object-contain sm:h-16"
          priority
        />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle ?? HOSPITAL_NAME}</p>
      </div>
    </div>
  );
}
