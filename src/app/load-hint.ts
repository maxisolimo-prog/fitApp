/**
 * Qué representa el número de Kg según el equipo del ejercicio. Decisión del usuario del 19 de noviembre de 2026: con
 * mancuernas se anota la carga de una (el número impreso en la que se agarra); con barra, el total con la barra
 * incluida. Es solo una aclaración en pantalla: no cambia lo que se guarda ni cómo se calcula.
 *
 * Devuelve el texto que sigue a "Kg" ("por mancuerna") o '' si el equipo no necesita aclaración.
 */
export function loadHint(equipment: string): string {
  const text = equipment.toLocaleLowerCase('es');
  if (text.includes('mancuerna')) return 'por mancuerna';
  if (text.includes('barra')) return 'con la barra incluida';
  return '';
}
