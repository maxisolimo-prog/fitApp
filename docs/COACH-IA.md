# Coach con IA (B-26)

**Gemini conectado en FitApp.** Clave privada disponible en entorno/API, modelo `gemini-3.5-flash-lite`, límite inicial de 20 solicitudes mensuales y cuenta obligatoria. Se verificó una propuesta real con un pedido sintético. No se habilitó facturación ni se modificó el plan de Google; el contador de FitApp limita solicitudes, no certifica que la cuenta del proveedor sea gratuita.

El editor permite escribir un pedido, ver una propuesta y aplicarla al borrador antes de guardar. Conserva el mecanismo de volver a la lista anterior. Sin disponibilidad o conexión, la propuesta guiada existente sigue funcionando.

La API ofrece `GET /api/coach/status?brand=fitapp` y `POST /api/coach/routine`. El segundo exige sesión de cuenta. Recibe solo pedido (10–1000 caracteres), nivel, lugar, minutos (20–90) y marca. No envía email, contraseña, peso, calendario ni historial. La clave permanece en el servidor. Las molestias, lesiones y pedidos clínicos se rechazan; esta herramienta propone entrenamiento general.

El proveedor está aislado en `api/src/ai-coach.ts`, con protocolo nativo de Gemini `generateContent` y opción de chat completions compatible. Se verificaron la [referencia nativa](https://ai.google.dev/api/generate-content) y la [compatibilidad](https://ai.google.dev/gemini-api/docs/openai). Modelo y endpoint son configurables; no se fija un modelo que pueda quedar obsoleto. La salida solicita JSON Schema y también se valida en el servidor contra catálogo, equipo, duplicados, series, carga cero, tiempo estimado y `validateRoutine`.

Configuración privada, en `api/.env` o archivo de entorno del servicio:

- `AI_API_KEY` o `GEMINI_API_KEY`: clave del proveedor. Nunca va en código ni en el navegador.
- `AI_MODEL`: identificador habilitado en esa cuenta, compatible con JSON Schema.
- `AI_ENDPOINT`: endpoint HTTPS; por defecto `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.
- `AI_MONTHLY_REQUEST_LIMIT`: tope global de solicitudes mensual, entero positivo. `0` desactiva.
- `AI_BRANDS`: marcas habilitadas, separadas por comas. Vacío desactiva.

El usuario debe fijar el presupuesto en el proveedor. FitApp controla número de solicitudes, no dólares: una reserva se consume antes de llamar al proveedor y no se devuelve si falla. La tabla `ai_monthly_usage` hace cumplir el límite incluso ante reinicios o solicitudes concurrentes. Hay además un límite de 10 intentos diarios por cuenta y proceso, tiempo máximo de 25 segundos y límite de salida. No hay reintentos automáticos.

Para habilitar: elegir proveedor/modelo, configurar su límite de gasto, completar variables privadas, reiniciar la API y realizar una prueba con cuenta. Verificar resultado, error, demora, rechazo de salida inválida, agotamiento del cupo y retorno a propuesta guiada. Las pruebas automatizadas cubren respuestas simuladas y límites. Se añadió una prueba real de Gemini con un pedido general sintético de 20 minutos; la evaluación profesional de los resultados sigue en B-30. La salida válida se ajusta al tiempo reduciendo series y, si hace falta, ejercicios del final antes de presentarla. No se aumenta la carga ni se inventan ejercicios.
