/**
 * Textos legales de AEGIS Urban.
 *
 * IMPORTANTE: son un texto base redactado para el prototipo (Argentina).
 * Antes de un uso real con público deben ser revisados por un/a abogado/a.
 * Si se cambia el contenido, subir la versión (y la de aegis-urban-backend/src/config/legal.ts):
 * el registro rechaza versiones viejas y cada consentimiento queda asociado a la versión leída.
 */
export const LEGAL = {
  VERSION_TERMINOS:   "2026-10-30.2",
  VERSION_PRIVACIDAD: "2026-10-30.2",
  VERSION_UBICACION:  "2026-10-30.2",
  EDAD_MINIMA:        18,
} as const;

export interface SeccionLegal { titulo: string; parrafos: string[] }

export const TERMINOS: SeccionLegal[] = [
  { titulo: "1. Qué es AEGIS Urban", parrafos: [
    "AEGIS Urban es un prototipo de monitoreo y alerta temprana ante eventos climáticos y de emergencia en la ciudad. Muestra información del clima real (fuente: Open-Meteo) y avisos generados por sensores simulados con fines de demostración.",
  ]},
  { titulo: "2. No reemplaza a los organismos oficiales", parrafos: [
    "La información de la aplicación es orientativa. No reemplaza los avisos oficiales del Servicio Meteorológico Nacional, de Defensa Civil ni de los servicios de emergencia. Ante una emergencia real llamá al 911 (policía), 100 (bomberos), 107 (emergencias médicas) o 103 (Defensa Civil).",
    "Los avisos marcados como «simulado» provienen de sensores virtuales de demostración y no representan una situación real.",
  ]},
  { titulo: "3. Registro y cuenta", parrafos: [
    "Para crear una cuenta debés tener 18 años o más, o contar con la autorización de tu madre, padre o tutor/a legal. Los datos que cargues deben ser verdaderos y sos responsable de mantener tu contraseña en secreto.",
    "Tu perfil queda verificado cuando aceptás estos Términos y la Política de Privacidad. Podés usar la parte pública de la aplicación (clima y zonas de riesgo) sin crear una cuenta.",
  ]},
  { titulo: "4. Uso permitido", parrafos: [
    "Te comprometés a no intentar vulnerar la seguridad del sistema, no sobrecargar el servicio, no usarlo para difundir información falsa sobre emergencias y no acceder a datos de otras personas.",
  ]},
  { titulo: "5. Disponibilidad y responsabilidad", parrafos: [
    "El servicio se brinda «tal cual», sin garantía de disponibilidad continua ni de exactitud. En la medida permitida por la ley, los responsables del proyecto no responden por decisiones tomadas únicamente en base a la aplicación.",
  ]},
  { titulo: "6. Baja de la cuenta", parrafos: [
    "Podés dar de baja tu cuenta en cualquier momento desde «Mis datos». La baja desactiva la cuenta y anonimiza tus datos personales.",
  ]},
  { titulo: "7. Cambios y ley aplicable", parrafos: [
    "Si estos Términos cambian, se publicará una nueva versión y se te pedirá aceptarla. Se rigen por las leyes de la República Argentina.",
  ]},
];

export const PRIVACIDAD: SeccionLegal[] = [
  { titulo: "1. Responsable y marco legal", parrafos: [
    "Esta política se rige por la Ley 25.326 de Protección de los Datos Personales y su Decreto Reglamentario 1558/2001. El órgano de control es la Agencia de Acceso a la Información Pública (AAIP), que atiende denuncias y reclamos por incumplimientos de la ley: www.argentina.gob.ar/aaip.",
    "Responsable del tratamiento: Carolina Lobo, responsable del proyecto AEGIS Urban.",
  ]},
  { titulo: "2. Qué datos recolectamos", parrafos: [
    "Solo los mínimos necesarios: nombre de usuario, correo electrónico y contraseña (guardada cifrada de forma irreversible con BCrypt).",
    "También guardamos la evidencia de tus consentimientos: qué aceptaste, la versión del texto, la fecha y la dirección IP.",
    "No pedimos DNI, teléfono, nombre real ni datos sensibles.",
  ]},
  { titulo: "3. Para qué los usamos", parrafos: [
    "Para crear y proteger tu cuenta, verificar tu perfil, mostrarte avisos del clima y de zonas de riesgo, y llevar un registro de auditoría de seguridad del sistema.",
    "No vendemos ni cedemos tus datos a terceros ni los usamos para publicidad.",
  ]},
  { titulo: "4. Tu ubicación", parrafos: [
    "La ubicación es opcional y solo se usa si das tu consentimiento expreso. Se utiliza únicamente para calcular, en el momento, si estás cerca de una zona de peligro y avisarte.",
    "Tus coordenadas exactas se envían al servidor solo para ese cálculo: no se guardan, no se asocian a tu cuenta y no quedan en el historial. Para el clima se usa una ubicación aproximada (redondeada a ~1 km) que se envía al proveedor Open-Meteo.",
    "Podés revocar el permiso cuando quieras desde la aplicación y también desde la configuración de tu navegador. Sin ubicación, la aplicación sigue funcionando con la ciudad por defecto o con una zona que elijas a mano.",
  ]},
  { titulo: "5. Terceros", parrafos: [
    "Usamos Open-Meteo (open-meteo.com) para datos de clima y calidad del aire, y OpenStreetMap para los mapas. Esos servicios reciben tu dirección IP y una ubicación aproximada para responder.",
  ]},
  { titulo: "6. Tus derechos", parrafos: [
    "Podés ejercer en cualquier momento los derechos de acceso (art. 14), rectificación y supresión (art. 16) de la Ley 25.326. Desde «Mis datos» podés descargar la información que tenemos sobre vos y dar de baja tu cuenta, lo que anonimiza tus datos personales.",
    "El acceso gratuito a tus datos puede ejercerse a intervalos no inferiores a seis meses, salvo que acredites un interés legítimo.",
  ]},
  { titulo: "7. Conservación y seguridad", parrafos: [
    "Conservamos tus datos mientras tengas una cuenta activa. El registro de auditoría es inmutable y verificable (DVH/DVV) y por eso conserva el identificador interno de la cuenta, nunca tu correo ni tu nombre una vez anonimizados.",
    "Aplicamos cifrado de contraseñas, tokens revocables y control de acceso por roles.",
  ]},
  { titulo: "8. Almacenamiento local", parrafos: [
    "Guardamos en tu navegador (localStorage) tu sesión y tus preferencias, como el permiso de ubicación. No usamos cookies de publicidad ni de seguimiento.",
  ]},
];

export const CONSENTIMIENTO_UBICACION: string[] = [
  "Usaremos la ubicación de tu dispositivo solo mientras la aplicación esté abierta, para avisarte si estás cerca de una zona de peligro.",
  "Tus coordenadas exactas no se guardan ni se asocian a tu cuenta.",
  "Podés revocar este permiso cuando quieras.",
];
