# Research: ConsultaMed MVP

## Decisions

### Desktop-first UI
- **Decision**: Diseño prioritario para escritorio (1280px+), laptop 1024px+, tablet 768px+; soporte mouse/teclado con atajos y focus visible.
- **Rationale**: Dispositivo principal PC; flujo de consulta rápido con teclado.
- **Alternatives considered**: Mobile-first (iPad) descartado por cambio de requerimiento y menor prioridad móvil en MVP.

### Supabase Auth + RLS
- **Decision**: Supabase Auth (email/password) con RLS habilitado en todas las tablas clínicas; JWT expira en 1h; políticas por usuario/médico.
- **Rationale**: Cumplir principio de seguridad y RGPD; mínimo esfuerzo operativo con Supabase.
- **Alternatives considered**: OAuth corporativo descartado por alcance y complejidad; auth propia descartada por seguridad/tiempo.

### Backend PDF generation (WeasyPrint)
- **Decision**: Generar PDF en FastAPI con WeasyPrint 60, plantilla HTML única versionada; preview vía endpoint de render.
- **Rationale**: Control clínico y formato consistente; evita dependencia de navegador.
- **Alternatives considered**: Client-side print (window.print) descartado por variabilidad y control limitado.

### Validación DNI/NIE
- **Decision**: Validación en backend con letra de control y soporte NIE (X/Y/Z→0/1/2); frontend solo UX.
- **Rationale**: Confiabilidad clínica y normativa; evita spoofing desde cliente.
- **Alternatives considered**: Solo validación frontend descartada por riesgo.

### Performance objetivos clave
- **Decision**: Búsqueda <500ms (API + DB), PDF <5s, LCP <2.5s, INP <200ms.
- **Rationale**: Alineado con constitución y NFR; experiencia rápida en consulta.
- **Alternatives considered**: Sin metas numéricas descartado por falta de guía medible.
