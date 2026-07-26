import Link from "next/link";
import { Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — WIA Social",
  description: "Términos y condiciones de uso de WIA Social.",
};

export default function TermsPage() {
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
        <h1 className="mb-2 text-4xl font-black">Términos de Servicio</h1>
        <p className="mb-10 text-sm text-muted">Última actualización: 26 de julio de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">1. Aceptación de los términos</h2>
            <p>
              Al acceder y utilizar WIA Social (&ldquo;el Servicio&rdquo;), usted acepta quedar vinculado
              por estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos,
              no podrá acceder al Servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">2. Descripción del servicio</h2>
            <p>
              WIA Social es una plataforma SaaS que proporciona herramientas de crecimiento para
              Instagram, incluyendo generación de contenido mediante inteligencia artificial,
              gestión de leads (CRM), análisis de métricas y estrategias de crecimiento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">3. Cuentas de usuario</h2>
            <p>Para utilizar el Servicio debe:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Registrarse con un email válido y una contraseña segura.</li>
              <li>Ser mayor de 18 años o tener el consentimiento parental.</li>
              <li>Proporcionar información veraz y mantenerla actualizada.</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Notificarnos inmediatamente ante cualquier uso no autorizado de su cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">4. Planes y facturación</h2>
            <p>
              WIA Social ofrece un plan gratuito con limitaciones y planes de pago (Starter y Agency).
              Los planes de pago se facturan mensualmente mediante Stripe. Al suscribirse a un plan de pago:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Autoriza el cobro mensual recurrente en su método de pago.</li>
              <li>Los precios pueden cambiar con previo aviso de 30 días.</li>
              <li>Puede cancelar en cualquier momento desde el Panel de cliente (Stripe Portal).</li>
              <li>No se realizan reembolsos por períodos parciales salvo obligación legal.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">5. Uso aceptable</h2>
            <p>Usted se compromete a no utilizar el Servicio para:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Generar contenido ilegal, difamatorio, abusivo o que infrinja derechos de terceros.</li>
              <li>Spam, phishing u otras prácticas de marketing no ético.</li>
              <li>Violar los Términos de Servicio de Instagram/Meta.</li>
              <li>Automatizar acciones masivas en Instagram que violen sus políticas.</li>
              <li>Revender o redistribuir el Servicio sin autorización expresa.</li>
              <li>Intentar acceder a sistemas o datos de otros usuarios.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">6. Propiedad intelectual</h2>
            <p>
              El Servicio y su contenido original son propiedad de WIA Social. El contenido
              generado por IA a través del Servicio es de su propiedad una vez generado, siempre
              que su uso sea conforme a estos términos y a las políticas de OpenAI.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">7. Disponibilidad del servicio</h2>
            <p>
              Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos
              disponibilidad ininterrumpida. Podemos realizar mantenimiento programado con aviso previo.
              WIA Social no será responsable de interrupciones causadas por terceros (Supabase, OpenAI, Stripe, Meta).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">8. Limitación de responsabilidad</h2>
            <p>
              El Servicio se proporciona &ldquo;tal cual&rdquo; sin garantías de ningún tipo. WIA Social
              no será responsable de pérdidas de datos, ingresos o beneficios derivados del uso o
              imposibilidad de uso del Servicio. La responsabilidad máxima de WIA Social no excederá
              el importe pagado por el usuario en los últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">9. Terminación</h2>
            <p>
              Podemos suspender o terminar su acceso al Servicio si incumple estos términos,
              con previo aviso cuando sea posible. Usted puede cancelar su cuenta en cualquier
              momento desde la configuración de su perfil.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">10. Cambios en los términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos. Le notificaremos por email
              ante cambios significativos. El uso continuado del Servicio tras los cambios
              constituye aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">11. Legislación aplicable</h2>
            <p>
              Estos términos se rigen por la legislación española y de la Unión Europea.
              Cualquier disputa se someterá a los tribunales competentes de España.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-foreground">12. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, contáctenos en{" "}
              <a href="mailto:legal@wiasocial.app" className="text-lime hover:underline">legal@wiasocial.app</a>
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
