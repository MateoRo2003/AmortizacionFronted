Amortización – Sistema de cálculo de préstamos

Este proyecto permite simular amortización de préstamos mediante el método francés para distintos bancos argentinos. Incluye backend en Python con scrapers para obtener tasas (TNA, TEA, CFTEA) y frontend web con interfaz, gráficas y comparaciones.

Características

Cálculo automático de tabla de amortización (cuotas fijas) según el banco seleccionado.

Scrapers para obtener tasas actualizadas de bancos: Banco Santander, Banco Nación, Banco Macro, etc.

Backend en Flask (Python) que sirve la API /api/calcular.

Frontend HTML + CSS + JavaScript que permite ingresar monto, cuotas y banco, y visualizar tabla, métricas e indicadores.

Uso de librerías como SweetAlert2 para validaciones, Chart.js para gráficas, y Font Awesome para iconos.

Estructura del proyecto
Amortizacion/
│  main.py                ← servidor Flask + lógica principal
│  actualizar_tasas.py    ← script para actualizar tasas.json vía scrapers
│  tasas.json             ← archivo con tasas guardadas (Banco, TNA, TEA, CFTEA)
│  index.html             ← interfaz web frontend
│  styles.css             ← estilos CSS personalizados
│  script.js              ← lógica cliente (validaciones, fetch API, actualización UI)
│  scrapers/              ← carpeta con módulos scraper para cada banco
│      bbva.py
│      bna.py
│      santander.py
│      … etc
└─ README.md              ← este archivo

Instrucciones de uso
1. Entorno local
# Clonar repositorio
git clone https://github.com/MateoRo2003/Amortizacion.git
cd Amortizacion

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
python main.py


Luego abrir tu navegador en http://127.0.0.1:5000 para ver la interfaz.

2. Ejecutar actualización de tasas

Para refrescar las tasas de los bancos:

python actualizar_tasas.py


Esto actualizará el archivo tasas.json con valores recientes (TNA, TEA, CFTEA).

3. Tarea programada

Se puede configurar una tarea (cron o Windows Task Scheduler) para ejecutar actualizar_tasas.py cada hora y mantener las tasas actualizadas automáticamente.

Validaciones de entrada

En el frontend:

Monto debe ser numérico, mayor que 0.

Cuotas debe ser un entero mayor que 0 y menor o igual a 360 (por ejemplo).

Banco debe ser seleccionado en el desplegable.
Si falla alguna validación, se muestra una alerta con SweetAlert2.

🛠 Mejoras futuras

Inclusión de comisiones, seguros y otros cargos para calcular CFT real.

Comparación automática de bancos con ranking.

Exportar tabla a PDF o Excel.

Autenticación de usuarios y guardar simulaciones.

Despliegue en producción (Heroku, Render, AWS, etc.)
