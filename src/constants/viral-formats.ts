import type { ViralFormat } from "@/types";

export const viralFormats: ViralFormat[] = [
  {
    id: "mistakes",
    name: "3 Errores",
    description: "Lista errores comunes y cómo solucionarlos",
    structure: ["Gancho con error #1", "Error #2 con ejemplo", "Error #3 + solución", "CTA"],
    example: "3 errores que matan tu alcance en Reels",
    avgViews: "15-50K",
  },
  {
    id: "pov",
    name: "POV",
    description: "Situación reconocible desde el punto de vista de la audiencia",
    structure: ["POV: [situación]", "Desarrollo del problema", "Giro o solución", "CTA"],
    example: "POV: Llevas 6 meses publicando y nadie te sigue",
    avgViews: "20-80K",
  },
  {
    id: "before-after",
    name: "Antes / Después",
    description: "Transformación visual o de resultados",
    structure: ["Estado antes", "Qué cambió", "Resultado después", "Cómo replicarlo"],
    example: "Mi perfil antes vs después de optimizar la bio",
    avgViews: "10-40K",
  },
  {
    id: "quick-tutorial",
    name: "Tutorial rápido",
    description: "How-to en menos de 60 segundos",
    structure: ["Promesa del resultado", "Paso 1", "Paso 2", "Paso 3", "Guarda esto"],
    example: "Cómo escribir un gancho en 30 segundos",
    avgViews: "25-60K",
  },
  {
    id: "myth-reality",
    name: "Mito vs Realidad",
    description: "Desmonta creencias de tu nicho",
    structure: ["Mito común", "Por qué es falso", "La verdad", "Prueba", "CTA"],
    example: "Mito: necesitas publicar 3 veces al día",
    avgViews: "18-45K",
  },
  {
    id: "client-result",
    name: "Resultado de cliente",
    description: "Prueba social con caso real",
    structure: ["Resultado en gancho", "Situación inicial", "Qué hiciste", "Resultado final"],
    example: "Mi cliente pasó de 500 a 5k en 60 días",
    avgViews: "30-100K",
  },
];
