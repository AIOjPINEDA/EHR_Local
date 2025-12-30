import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl">
        {/* Logo/Title */}
        <h1 className="text-5xl font-bold text-blue-600 mb-4">
          ConsultaMed
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Sistema de gestión de consultas médicas
        </p>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-800">Búsqueda Rápida</h3>
            <p className="text-sm text-gray-500">
              Encuentra pacientes en segundos
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-800">Templates</h3>
            <p className="text-sm text-gray-500">
              Tratamientos predefinidos
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl mb-2">🖨️</div>
            <h3 className="font-semibold text-gray-800">Recetas PDF</h3>
            <p className="text-sm text-gray-500">
              Genera recetas con 1 clic
            </p>
          </div>
        </div>
        
        {/* CTA Button */}
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          Iniciar Sesión
        </Link>
        
        {/* Footer */}
        <p className="mt-12 text-sm text-gray-400">
          Consultorio Médico Guadalix · v1.0.0
        </p>
      </div>
    </main>
  );
}
