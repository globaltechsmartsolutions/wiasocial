import Link from "next/link";
import { Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad de WIA Social. Cómo recopilamos, usamos y protegemos tus datos.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-lime">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold">WIA Social</span>
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-2 text-4xl font-black">Política de Privacidad</h1>
        <p className="mb-10 text-sm text-muted">Última actualización: 26 de julio de 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">1. Responsable del tratamiento</h2>
            <p>
              WIA Social es el responsable del tratamiento de los datos personales que usted nos
              proporciona al utilizar nuestra plataforma. Para cualquier consulta sobre privacidad,
              puede contactarnos en: <a href="mailto:privacy@wiasocial.app" className="text-lime hover:underline">privacy@wiasocial.app</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes datos cuando utiliza WIA Social:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Datos de cuenta:</strong> dirección de email y contraseña cifrada para autenticación.</li>
              <li><strong className="text-foreground">Datos de perfil de marca:</strong> nicho, audiencia objetivo y oferta que usted introduce.</li>
              <li><strong className="text-foreground">Datos de Instagram:</strong> métricas de cuenta (seguidores, engagement) solo si conecta su cuenta.</li>
              <li><strong className="text-foreground">Contenido generado:</strong> textos, scripts y captions creados mediante IA en la plataforma.</li>
              <li><strong className="text-foreground">Datos de CRM:</strong> información de leads y clientes que usted introduce manualmente.</li>
              <li><strong className="text-foreground">Datos de uso:</strong> páginas visitadas, funcionalidades utilizadas y frecuencia de uso.</li>
              <li><strong className="text-foreground">Datos de facturación:</strong> gestionados de forma segura por Stripe. No almacenamos datos de tarjeta.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">3. Finalidad del tratamiento</h2>
            <p>Usamos sus datos para:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Proporcionar y mejorar los servicios de WIA Social.</li>
              <li>Personalizar el contenido generado por IA según su perfil de marca.</li>
              <li>Gestionar su suscripción y facturación.</li>
              <li>Enviarle notificaciones relevantes sobre el servicio.</li>
              <li>Cumplir con obligaciones legales.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">4. Base legal del tratamiento</h2>
            <p>El tratamiento de sus datos se basa en:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Ejecución del contrato:</strong> para prestarle los servicios contratados.</li>
              <li><strong className="text-foreground">Consentimiento:</strong> para comunicaciones de marketing (puede retirarlo en cualquier momento).</li>
              <li><strong className="text-foreground">Interés legítimo:</strong> para mejorar la plataforma y prevenir fraudes.</li>
              <li><strong className="text-foreground">Obligación legal:</strong> para cumplir con requisitos fiscales y regulatorios.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">5. Proveedores y terceros</h2>
            <p>Compartimos datos con los siguientes proveedores bajo acuerdos de protección de datos:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Supabase:</strong> base de datos y autenticación (infraestructura en UE).</li>
              <li><strong className="text-foreground">OpenAI:</strong> procesamiento de IA para generación de contenido.</li>
              <li><strong className="text-foreground">Stripe:</strong> procesamiento de pagos (certificado PCI DSS).</li>
              <li><strong className="text-foreground">Meta (Instagram):</strong> si conecta su cuenta de Instagram mediante OAuth.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">6. Sus derechos (RGPD)</h2>
            <p>Si es residente en la UE/EEE, tiene derecho a:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Acceso:</strong> solicitar una copia de sus datos personales.</li>
              <li><strong className="text-foreground">Rectificación:</strong> corregir datos inexactos.</li>
              <li><strong className="text-foreground">Supresión:</strong> solicitar la eliminación de sus datos.</li>
              <li><strong className="text-foreground">Portabilidad:</strong> recibir sus datos en formato estructurado.</li>
              <li><strong className="text-foreground">Oposición:</strong> oponerse al tratamiento en determinadas circunstancias.</li>
              <li><strong className="text-foreground">Limitación:</strong> solicitar la limitación del tratamiento.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, contacte: <a href="mailto:privacy@wiasocial.app" className="text-lime hover:underline">privacy@wiasocial.app</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">7. Cookies</h2>
            <p>
              Utilizamos cookies estrictamente necesarias para el funcionamiento del servicio
              (sesión, autenticación). No utilizamos cookies de rastreo o publicidad de terceros.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">8. Conservación de datos</h2>
            <p>
              Conservamos sus datos mientras su cuenta esté activa. Al eliminar su cuenta, sus
              datos serán eliminados en un plazo máximo de 30 días, salvo obligación legal de conservación.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">9. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Le notificaremos por email
              ante cambios significativos. La fecha de última actualización aparece al inicio del documento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">10. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad o protección de datos, contáctenos en{" "}
              <a href="mailto:privacy@wiasocial.app" className="text-lime hover:underline">privacy@wiasocial.app</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6 text-xs text-muted">
          <span>© 2026 WIA Social</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link href="/terms" className="hover:text-foreground">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
