README – Frontend (Vercel) – Producción
# Amortización Frontend

Este repositorio contiene el **frontend** del proyecto de simulación de préstamos y comparación de bancos en Argentina.  
Está construido para **Vercel** y consume el backend desplegado en **Render**.

## 🌐 URL de producción

[https://amortizacion-fronted.vercel.app](https://amortizacion-fronted.vercel.app)

## 🛠 Tecnologías

- HTML5, CSS3, JavaScript (ES6)  
- Fetch API para consumo de la API REST  
- SweetAlert2 para alertas y validaciones   

## ⚡ Integración con Backend

El frontend consume la API del backend desplegado en Render:

**Base URL del backend:**



https://amortizacionbackend.onrender.com


**Endpoint principal:**



POST /api/calcular


**Ejemplo de request desde frontend (JavaScript):**

```javascript
const payload = {
  monto: 100000,
  cuotas: 12,
  banco: "Santander"
};

const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
});

const data = await res.json();
console.log(data);


⚡ El backend está configurado con CORS para permitir solicitudes únicamente desde este dominio.

🗂 Estructura del proyecto
/amortizacion-frontend
│
├─ index.html          # Página principal
├─ style.css           # Estilos
├─ script.js           # Lógica de consumo de API y actualización de UI
├─ assets/             # Imágenes, íconos, fuentes
├─ README.md           # Este archivo

💡 Funcionalidades principales

Ingreso de monto, cuotas y banco principal

Cálculo de tabla de amortización

Comparación entre bancos

Validaciones y alertas de errores (ej: banco inválido, campos vacíos)

Actualización dinámica del dashboard de resultados

🔗 Notas importantes

El frontend está hecho para producción y no depende de ejecución local del backend.

Todas las requests deben ir al backend autorizado en Render.

Para desarrollo local, se puede usar un servidor simple (Live Server, Vite, etc.), pero no es necesario para producción.