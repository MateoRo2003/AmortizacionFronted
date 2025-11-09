let charts = {};
let datoPrincipal = null;
let datoComparacion = null;

function formatearPesos(valor) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(valor);
}
function cambiarSistemaAmortizacion() {
    const sistema = document.getElementById("sistemaAmortizacion").value;
    
    if (datoPrincipal) {
        // Recalcular con el nuevo sistema
        recalcularConSistema(sistema);
    }
}
async function recalcularConSistema(sistema) {
    if (!datoPrincipal) return;

    document.getElementById("loading").classList.add("active");

    const payload = {
        monto: datoPrincipal.monto,
        cuotas: datoPrincipal.cuotas,
        banco: datoPrincipal.banco,
        sistema: sistema  // Enviar el sistema seleccionado
    };

    try {
        const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (data.error) {
            Swal.fire("Error", data.error, "error");
            return;
        }

        // Actualizar datos principales con el nuevo sistema
        datoPrincipal.data = data;
        datoPrincipal.sistema = sistema;

        // Actualizar dashboard
        actualizarDashboard(data, datoPrincipal.banco);

        // Si hay comparación, actualizarla también
        if (datoComparacion) {
            await actualizarComparacionConSistema(sistema);
        }

    } catch (error) {
        Swal.fire("Error", "Error al recalcular: " + error.message, "error");
    } finally {
        document.getElementById("loading").classList.remove("active");
    }
}
async function actualizarComparacionConSistema(sistemaPrincipal) {
    if (!datoComparacion) return;

    const payload = {
        monto: datoPrincipal.monto,
        cuotas: datoPrincipal.cuotas,
        banco: datoComparacion.banco,
        sistema: sistemaPrincipal  // Aplicar el mismo sistema a la comparación para consistencia
    };

    try {
        const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (!data.error) {
            datoComparacion.data = data;
            mostrarComparacion();
        }
    } catch (error) {
        console.error("Error al actualizar comparación:", error);
    }
}

// CORREGIDO: Cálculo de métricas financieras 
function calcularMetricas(tna, monto, cuotas, totalPagar, datosBackend = {}) {
    // CORRECCIÓN: TEM correcta para préstamos (TNA / 12)
    const tem = tna / 12;

    // TEA - Usar del backend si existe, sino calcular correctamente
    const tea = datosBackend.TEA !== null && datosBackend.TEA !== undefined
        ? datosBackend.TEA
        : ((1 + tna / 100 / 12) ** 12 - 1) * 100;

    // CFT - Costo Financiero Total (total de intereses) - CORRECTO
    const cft = totalPagar - monto;

    // CFTNA - CFT Nominal Anual (aproximación)
    const cftna = (cft / monto) * (12 / cuotas) * 100;

    // CFTEA - Usar del backend si existe
    const cftea = datosBackend.CFTEA !== null && datosBackend.CFTEA !== undefined
        ? datosBackend.CFTEA
        : null;

    return {
        tem: tem.toFixed(2),
        tea: tea.toFixed(2),
        cft: cft.toFixed(2),
        cftna: cftna.toFixed(2),
        cftea: cftea ? cftea.toFixed(2) : 'N/A',
        teaCalculada: datosBackend.TEA === null || datosBackend.TEA === undefined,
        cfteaCalculada: datosBackend.CFTEA === null || datosBackend.CFTEA === undefined
    };
}

async function calcularYActualizar() {
    if (!validarCampos()) {
        return;
    }
    
    const monto = document.getElementById("monto").value;
    const cuotas = document.getElementById("cuotas").value;
    const banco = document.getElementById("banco").value;
    const sistema = document.getElementById("sistemaAmortizacion").value; // Obtener sistema seleccionado

    document.getElementById("loading").classList.add("active");

    const payload = {
        monto: Number(monto),
        cuotas: Number(cuotas),
        banco: banco,
        sistema: sistema  // Incluir sistema en el payload
    };

    try {
        const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (data.error) {
            Swal.fire("Error", data.error, "error");
            return;
        }

        datoPrincipal = {
            banco: banco,
            data: data,
            monto: Number(monto),
            cuotas: Number(cuotas),
            sistema: sistema
        };

        actualizarDashboard(data, banco);

        if (datoComparacion) {
            mostrarComparacion();
        }
    } catch (error) {
        Swal.fire("Error", "Error al calcular: " + error.message, "error");
    } finally {
        document.getElementById("loading").classList.remove("active");
    }
}
async function compararBancos() {
    const bancoComp = document.getElementById("bancoComparacion").value;
    if (!datoPrincipal) {
        Swal.fire({
            icon: "error",
            title: "Préstamo no calculado",
            text: "Primero calcula el préstamo principal."
        });
        return;
    }
    if (!bancoComp) {
       Swal.fire({
            icon: "error",
            title: "Banco inválido",
            text: "Selecciona un banco"
        });
        return;
    }

    if (bancoComp === datoPrincipal.banco) {
        Swal.fire({
            icon: "error",
            title: "Banco inválido",
            text: "Selecciona un banco diferente al principal."
        });
        return;
    }

    document.getElementById("loading").classList.add("active");

    const payload = {
        monto: datoPrincipal.monto,
        cuotas: datoPrincipal.cuotas,
        banco: bancoComp
    };

    try {
        const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.error) {
            Swal.fire("Error", data.error, "error");
            return;
        }

        datoComparacion = {
            banco: bancoComp,
            data: data
        };

        mostrarComparacion();
    } catch (error) {
        Swal.fire("Error", "Error al comparar: " + error.message, "error");
    } finally {
        document.getElementById("loading").classList.remove("active");
    }
}

function limpiarComparacion() {
    datoComparacion = null;
    document.getElementById("bancoComparacion").value = "";
    document.getElementById("comparacionSection").style.display = "none";

    document.querySelectorAll('.kpi-subtitle').forEach(el => el.textContent = '');
    document.querySelectorAll('.metrica-comp').forEach(el => el.textContent = '');
}

function actualizarDashboard(data, banco) {
    const tabla = data.Tabla;
    const totalPagar = tabla.reduce((sum, row) => sum + row.Cuota_total, 0);
    const interesTotal = tabla.reduce((sum, row) => sum + row.Interes, 0);
    const cuotaMensual = tabla[0].Cuota_total;
    const monto = datoPrincipal.monto;
    const cuotas = datoPrincipal.cuotas;

    // Actualizar KPIs
    document.getElementById("totalPagar").textContent = formatearPesos(totalPagar);
    document.getElementById("interesTotal").textContent = formatearPesos(interesTotal);
    document.getElementById("cuotaMensual").textContent = formatearPesos(cuotaMensual);
    document.getElementById("tnaAplicada").textContent = data.TNA + "%";

    // Calcular métricas con datos del backend
    const datosBackend = {
        TEA: data.TEA || null,
        CFTEA: data.CFTEA || null
    };

    const metricas = calcularMetricas(data.TNA, monto, cuotas, totalPagar, datosBackend);

    // Actualizar métricas
    document.getElementById("tem").textContent = metricas.tem + "%";
    document.getElementById("tea").innerHTML = metricas.tea + "%" +
        (metricas.teaCalculada ? ' <span style="font-size: 10px; opacity: 0.7;">*</span>' : '');
    document.getElementById("cft").textContent = formatearPesos(metricas.cft);
    document.getElementById("cftna").textContent = metricas.cftna + "%";

    const cfteaElement = document.getElementById("cftea");
    if (cfteaElement) {
        cfteaElement.innerHTML = metricas.cftea !== 'N/A' 
            ? metricas.cftea + "%" + (metricas.cfteaCalculada ? ' <span style="font-size: 10px; opacity: 0.7;">*</span>' : '')
            : 'N/A';
    }

    actualizarGraficos(tabla);
    actualizarTabla(tabla);
}

// CORREGIDO: Mostrar comparación con lógica correcta
function mostrarComparacion() {
    if (!datoPrincipal || !datoComparacion) return;

    const tabla1 = datoPrincipal.data.Tabla;
    const tabla2 = datoComparacion.data.Tabla;

    const total1 = tabla1.reduce((sum, row) => sum + row.Cuota_total, 0);
    const total2 = tabla2.reduce((sum, row) => sum + row.Cuota_total, 0);
    const interes1 = tabla1.reduce((sum, row) => sum + row.Interes, 0);
    const interes2 = tabla2.reduce((sum, row) => sum + row.Interes, 0);
    const cuota1 = tabla1[0].Cuota_total;
    const cuota2 = tabla2[0].Cuota_total;

    const monto = datoPrincipal.monto;
    const cuotas = datoPrincipal.cuotas;

    // Calcular métricas
    const datosBackend1 = {
        TEA: datoPrincipal.data.TEA || null,
        CFTEA: datoPrincipal.data.CFTEA || null
    };
    const datosBackend2 = {
        TEA: datoComparacion.data.TEA || null,
        CFTEA: datoComparacion.data.CFTEA || null
    };

    const metricas1 = calcularMetricas(datoPrincipal.data.TNA, monto, cuotas, total1, datosBackend1);
    const metricas2 = calcularMetricas(datoComparacion.data.TNA, monto, cuotas, total2, datosBackend2);

    // CORRECCIÓN: Calcular diferencias (valores POSITIVOS indican que el banco de comparación es PEOR)
    const difTotal = total2 - total1;
    const difInteres = interes2 - interes1;
    const difCuota = cuota2 - cuota1;
    const difTNA = datoComparacion.data.TNA - datoPrincipal.data.TNA;

    // CORRECCIÓN: Mostrar comparaciones con lógica correcta
    // Si difTotal > 0, el banco comparación es MÁS CARO (rojo)
    document.getElementById("totalPagarComp").innerHTML =
        `${datoComparacion.banco}: ${formatearPesos(total2)} <span class="${difTotal > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difTotal > 0 ? '+' : ''}${formatearPesos(difTotal)})</span>`;

    document.getElementById("interesTotalComp").innerHTML =
        `${datoComparacion.banco}: ${formatearPesos(interes2)} <span class="${difInteres > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difInteres > 0 ? '+' : ''}${formatearPesos(difInteres)})</span>`;

    document.getElementById("cuotaMensualComp").innerHTML =
        `${datoComparacion.banco}: ${formatearPesos(cuota2)} <span class="${difCuota > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difCuota > 0 ? '+' : ''}${formatearPesos(difCuota)})</span>`;

    document.getElementById("tnaAplicadaComp").innerHTML =
        `${datoComparacion.banco}: ${datoComparacion.data.TNA}% <span class="${difTNA > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difTNA > 0 ? '+' : ''}${difTNA.toFixed(2)}%)</span>`;

    // Actualizar comparación de métricas
    const difTEM = parseFloat(metricas2.tem) - parseFloat(metricas1.tem);
    const difTEA = parseFloat(metricas2.tea) - parseFloat(metricas1.tea);
    const difCFT = parseFloat(metricas2.cft) - parseFloat(metricas1.cft);
    const difCFTNA = parseFloat(metricas2.cftna) - parseFloat(metricas1.cftna);

    document.getElementById("temComp").innerHTML =
        `${datoComparacion.banco}: ${metricas2.tem}% <span class="${difTEM > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difTEM > 0 ? '+' : ''}${difTEM.toFixed(2)}%)</span>`;

    const indicadorTEA2 = metricas2.teaCalculada ? ' <span style="font-size: 10px;">*</span>' : '';
    document.getElementById("teaComp").innerHTML =
        `${datoComparacion.banco}: ${metricas2.tea}%${indicadorTEA2} <span class="${difTEA > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difTEA > 0 ? '+' : ''}${difTEA.toFixed(2)}%)</span>`;

    document.getElementById("cftComp").innerHTML =
        `${datoComparacion.banco}: ${formatearPesos(metricas2.cft)} <span class="${difCFT > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difCFT > 0 ? '+' : ''}${formatearPesos(difCFT)})</span>`;

    document.getElementById("cftnaComp").innerHTML =
        `${datoComparacion.banco}: ${metricas2.cftna}% <span class="${difCFTNA > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difCFTNA > 0 ? '+' : ''}${difCFTNA.toFixed(2)}%)</span>`;

    const cfteaCompElement = document.getElementById("cfteaComp");
    if (cfteaCompElement && metricas2.cftea !== 'N/A') {
        const difCFTEA = parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea);
        const indicadorCFTEA2 = metricas2.cfteaCalculada ? ' <span style="font-size: 10px;">*</span>' : '';
        cfteaCompElement.innerHTML =
            `${datoComparacion.banco}: ${metricas2.cftea}%${indicadorCFTEA2} <span class="${difCFTEA > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difCFTEA > 0 ? '+' : ''}${difCFTEA.toFixed(2)}%)</span>`;
    }

    document.getElementById("comparacionSection").style.display = "block";
    actualizarGraficosComparacion();
    actualizarTablaResumen();
}

function validarCampos() {
    const montoRaw = document.getElementById("monto").value.trim();
    const cuotasRaw = document.getElementById("cuotas").value.trim();
    const banco = document.getElementById("banco").value;

    const monto = montoRaw === "" ? NaN : Number(montoRaw);
    const cuotas = cuotasRaw === "" ? NaN : Number(cuotasRaw);

    // Validar monto
    if (montoRaw === "" || Number.isNaN(monto)) {
        Swal.fire({
            icon: "error",
            title: "Monto inválido",
            text: "Ingresá un monto numérico. Ejemplo: 150000"
        });
        return false;
    }

    if (monto <= 0) {
        Swal.fire({
            icon: "error",
            title: "Monto inválido",
            text: "El monto debe ser mayor que 0."
        });
        return false;
    }

    if (monto > 10000000) {
        Swal.fire({
            icon: "warning",
            title: "Monto muy alto",
            text: "El monto no puede superar los $10.000.000"
        });
        return false;
    }

    // Validar cuotas
    if (cuotasRaw === "" || Number.isNaN(cuotas)) {
        Swal.fire({
            icon: "error",
            title: "Cantidad de cuotas inválida",
            text: "Ingresá un número de cuotas válido. Ejemplo: 12"
        });
        return false;
    }

    if (!Number.isInteger(cuotas) || cuotas <= 0) {
        Swal.fire({
            icon: "error",
            title: "Cuotas inválidas",
            text: "La cantidad de cuotas debe ser un número entero mayor a 0."
        });
        return false;
    }

    if (cuotas > 84) {
        Swal.fire({
            icon: "warning",
            title: "Demasiadas cuotas",
            text: "Ingresá un valor menor o igual a 84 cuotas (7 años)."
        });
        return false;
    }

    if (cuotas < 3) {
        Swal.fire({
            icon: "warning",
            title: "Muy pocas cuotas",
            text: "El mínimo de cuotas es 3."
        });
        return false;
    }

    // Validar banco
    if (!banco || banco.trim() === "") {
        Swal.fire({
            icon: "error",
            title: "Banco no seleccionado",
            text: "Por favor elegí un banco principal."
        });
        return false;
    }

    return true;
}

function actualizarGraficos(tabla) {
    const sistema = document.getElementById("sistemaAmortizacion").value;
    const sistemaLabel = sistema === 'aleman' ? 'Sistema Alemán' : 'Sistema Francés';

    // Gráfico de evolución del saldo
    const ctxSaldo = document.getElementById('chartSaldo').getContext('2d');
    if (charts.saldo) charts.saldo.destroy();
    charts.saldo = new Chart(ctxSaldo, {
        type: 'line',
        data: {
            labels: tabla.map(r => `Cuota ${r.Cuota}`),
            datasets: [{
                label: 'Saldo',
                data: tabla.map(r => r.Saldo),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `Evolución del Saldo - ${sistemaLabel}`,
                    font: { size: 14 }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Gráfico de composición - especialmente útil para ver la diferencia entre sistemas
    const totalInteres = tabla.reduce((sum, r) => sum + r.Interes, 0);
    const totalAmortizacion = tabla.reduce((sum, r) => sum + r.Amortizacion, 0);

    const ctxComp = document.getElementById('chartComposicion').getContext('2d');
    if (charts.composicion) charts.composicion.destroy();
    charts.composicion = new Chart(ctxComp, {
        type: 'doughnut',
        data: {
            labels: ['Capital', 'Interés'],
            datasets: [{
                data: [totalAmortizacion, totalInteres],
                backgroundColor: ['#667eea', '#f5576c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `Composición Total - ${sistemaLabel}`,
                    font: { size: 14 }
                },
                legend: { position: 'bottom' }
            }
        }
    });

    // Gráfico de distribución por cuotas - muestra claramente la diferencia entre sistemas
    const ctxDist = document.getElementById('chartDistribucion').getContext('2d');
    if (charts.distribucion) charts.distribucion.destroy();
    charts.distribucion = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: tabla.slice(0, 12).map(r => `${r.Cuota}`),
            datasets: [{
                label: 'Interés',
                data: tabla.slice(0, 12).map(r => r.Interes),
                backgroundColor: '#f5576c'
            }, {
                label: 'Capital',
                data: tabla.slice(0, 12).map(r => r.Amortizacion),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `Distribución por Cuota - ${sistemaLabel}`,
                    font: { size: 14 }
                }
            },
            scales: {
                x: { 
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Número de Cuota'
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    title: {
                        display: true,
                        text: 'Monto ($)'
                    }
                }
            }
        }
    });

    // Gráfico de cuotas mensuales - muestra la diferencia clave entre sistemas
    const ctxCuotas = document.getElementById('chartCuotas').getContext('2d');
    if (charts.cuotas) charts.cuotas.destroy();
    
    // Para sistema alemán, las cuotas son decrecientes
    const cuotasData = tabla.slice(0, 12).map(r => r.Cuota_total);
    
    charts.cuotas = new Chart(ctxCuotas, {
        type: sistema === 'aleman' ? 'line' : 'bar', // Línea para alemán, barras para francés
        data: {
            labels: tabla.slice(0, 12).map(r => `Cuota ${r.Cuota}`),
            datasets: [{
                label: 'Cuota Total',
                data: cuotasData,
                backgroundColor: sistema === 'aleman' ? 'rgba(48, 207, 208, 0.2)' : '#30cfd0',
                borderColor: sistema === 'aleman' ? '#30cfd0' : undefined,
                borderWidth: sistema === 'aleman' ? 2 : undefined,
                fill: sistema === 'aleman' ? true : undefined,
                tension: sistema === 'aleman' ? 0.4 : undefined
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `Cuotas Mensuales - ${sistemaLabel}`,
                    font: { size: 14 }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    title: {
                        display: true,
                        text: 'Monto de Cuota ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Número de Cuota'
                    }
                }
            }
        }
    });
}

function actualizarGraficosComparacion() {
    const tabla1 = datoPrincipal.data.Tabla;
    const tabla2 = datoComparacion.data.Tabla;

    const total1 = tabla1.reduce((sum, row) => sum + row.Cuota_total, 0);
    const total2 = tabla2.reduce((sum, row) => sum + row.Cuota_total, 0);

    // Gráfico de costos totales
    const ctxTotal = document.getElementById('chartComparacionTotal').getContext('2d');
    if (charts.comparacionTotal) charts.comparacionTotal.destroy();
    charts.comparacionTotal = new Chart(ctxTotal, {
        type: 'bar',
        data: {
            labels: [datoPrincipal.banco, datoComparacion.banco],
            datasets: [{
                label: 'Total a Pagar',
                data: [total1, total2],
                backgroundColor: ['#667eea', '#f5576c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Gráfico de cuotas mensuales comparadas
    const ctxCuotasComp = document.getElementById('chartComparacionCuotas').getContext('2d');
    if (charts.comparacionCuotas) charts.comparacionCuotas.destroy();
    charts.comparacionCuotas = new Chart(ctxCuotasComp, {
        type: 'bar',
        data: {
            labels: [datoPrincipal.banco, datoComparacion.banco],
            datasets: [{
                label: 'Cuota Mensual',
                data: [tabla1[0].Cuota_total, tabla2[0].Cuota_total],
                backgroundColor: ['#4facfe', '#fee140']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// CORREGIDO: Actualizar tabla resumen con análisis correcto
function actualizarTablaResumen() {
    const tabla1 = datoPrincipal.data.Tabla;
    const tabla2 = datoComparacion.data.Tabla;

    const total1 = tabla1.reduce((sum, row) => sum + row.Cuota_total, 0);
    const total2 = tabla2.reduce((sum, row) => sum + row.Cuota_total, 0);
    const interes1 = tabla1.reduce((sum, row) => sum + row.Interes, 0);
    const interes2 = tabla2.reduce((sum, row) => sum + row.Interes, 0);
    const cuota1 = tabla1[0].Cuota_total;
    const cuota2 = tabla2[0].Cuota_total;

    const monto = datoPrincipal.monto;
    const cuotas = datoPrincipal.cuotas;

    const datosBackend1 = {
        TEA: datoPrincipal.data.TEA || null,
        CFTEA: datoPrincipal.data.CFTEA || null
    };
    const datosBackend2 = {
        TEA: datoComparacion.data.TEA || null,
        CFTEA: datoComparacion.data.CFTEA || null
    };

    const metricas1 = calcularMetricas(datoPrincipal.data.TNA, monto, cuotas, total1, datosBackend1);
    const metricas2 = calcularMetricas(datoComparacion.data.TNA, monto, cuotas, total2, datosBackend2);

    const indicadorTEA1 = metricas1.teaCalculada ? ' <span style="font-size: 10px; opacity: 0.6;" title="Valor calculado">*</span>' : '';
    const indicadorTEA2 = metricas2.teaCalculada ? ' <span style="font-size: 10px; opacity: 0.6;" title="Valor calculado">*</span>' : '';
    const indicadorCFTEA1 = metricas1.cfteaCalculada ? ' <span style="font-size: 10px; opacity: 0.6;" title="Valor calculado">*</span>' : '';
    const indicadorCFTEA2 = metricas2.cfteaCalculada ? ' <span style="font-size: 10px; opacity: 0.6;" title="Valor calculado">*</span>' : '';

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>${datoPrincipal.banco}</th>
                    <th>${datoComparacion.banco}</th>
                    <th>Diferencia</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Monto Solicitado</strong></td>
                    <td>${formatearPesos(monto)}</td>
                    <td>${formatearPesos(monto)}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td><strong>Cantidad de Cuotas</strong></td>
                    <td>${cuotas}</td>
                    <td>${cuotas}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td><strong>TNA</strong></td>
                    <td>${datoPrincipal.data.TNA}%</td>
                    <td>${datoComparacion.data.TNA}%</td>
                    <td class="${(datoComparacion.data.TNA - datoPrincipal.data.TNA) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${(datoComparacion.data.TNA - datoPrincipal.data.TNA).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td><strong>TEM</strong></td>
                    <td>${metricas1.tem}%</td>
                    <td>${metricas2.tem}%</td>
                    <td class="${(parseFloat(metricas2.tem) - parseFloat(metricas1.tem)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${(parseFloat(metricas2.tem) - parseFloat(metricas1.tem)).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td><strong>TEA</strong></td>
                    <td>${metricas1.tea}%${indicadorTEA1}</td>
                    <td>${metricas2.tea}%${indicadorTEA2}</td>
                    <td class="${(parseFloat(metricas2.tea) - parseFloat(metricas1.tea)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${(parseFloat(metricas2.tea) - parseFloat(metricas1.tea)).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td><strong>Cuota Mensual</strong></td>
                    <td>${formatearPesos(cuota1)}</td>
                    <td>${formatearPesos(cuota2)}</td>
                    <td class="${(cuota2 - cuota1) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${formatearPesos(cuota2 - cuota1)}
                    </td>
                </tr>
                <tr>
                    <td><strong>Total Intereses</strong></td>
                    <td>${formatearPesos(interes1)}</td>
                    <td>${formatearPesos(interes2)}</td>
                    <td class="${(interes2 - interes1) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${formatearPesos(interes2 - interes1)}
                    </td>
                </tr>
                <tr>
                    <td><strong>Total a Pagar</strong></td>
                    <td>${formatearPesos(total1)}</td>
                    <td>${formatearPesos(total2)}</td>
                    <td class="${(total2 - total1) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${formatearPesos(total2 - total1)}
                    </td>
                </tr>
                <tr>
                    <td><strong>CFT</strong></td>
                    <td>${formatearPesos(metricas1.cft)}</td>
                    <td>${formatearPesos(metricas2.cft)}</td>
                    <td class="${(parseFloat(metricas2.cft) - parseFloat(metricas1.cft)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${formatearPesos(parseFloat(metricas2.cft) - parseFloat(metricas1.cft))}
                    </td>
                </tr>
                <tr>
                    <td><strong>CFTNA</strong></td>
                    <td>${metricas1.cftna}%</td>
                    <td>${metricas2.cftna}%</td>
                    <td class="${(parseFloat(metricas2.cftna) - parseFloat(metricas1.cftna)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${(parseFloat(metricas2.cftna) - parseFloat(metricas1.cftna)).toFixed(2)}%
                    </td>
                </tr>
                <tr>
                    <td><strong>CFTEA</strong></td>
                    <td>${metricas1.cftea !== 'N/A' ? metricas1.cftea + '%' + indicadorCFTEA1 : 'N/A'}</td>
                    <td>${metricas2.cftea !== 'N/A' ? metricas2.cftea + '%' + indicadorCFTEA2 : 'N/A'}</td>
                    <td class="${metricas1.cftea !== 'N/A' && metricas2.cftea !== 'N/A' ? ((parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva') : ''}">
                        ${metricas1.cftea !== 'N/A' && metricas2.cftea !== 'N/A' ? (parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea)).toFixed(2) + '%' : '-'}
                    </td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>Nota:</strong> Los valores marcados con asterisco (*) son calculados. Los valores sin asterisco provienen directamente del banco.
        </div>
    `;

    // CORRECCIÓN: Comparamos total1 vs total2
    // Si total1 < total2 → banco1 (datoPrincipal) es MEJOR
    // Si total1 > total2 → banco2 (datoComparacion) es MEJOR
    const ahorro = Math.abs(total1 - total2);
    
    if (total1 !== total2) {
        const esMejorBanco1 = total1 < total2;
        const mejorBanco = esMejorBanco1 ? datoPrincipal.banco : datoComparacion.banco;
        const peorBanco = esMejorBanco1 ? datoComparacion.banco : datoPrincipal.banco;
        const mejorTNA = esMejorBanco1 ? datoPrincipal.data.TNA : datoComparacion.data.TNA;
        const peorTNA = esMejorBanco1 ? datoComparacion.data.TNA : datoPrincipal.data.TNA;
        
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #16a34a;">
                <h4 style="margin-bottom: 10px; color: #16a34a;">
                    Mejor Opción: ${mejorBanco}
                </h4>
                <p style="color: #333; margin-bottom: 8px;">
                    Eligiendo <strong>${mejorBanco}</strong> ahorrarías <strong>${formatearPesos(ahorro)}</strong> en comparación con ${peorBanco}.
                </p>
                <p style="font-size: 12px; margin-top: 8px; color: #666;">
                    <strong>Análisis:</strong> ${mejorBanco} tiene menor TNA (${mejorTNA}% vs ${peorTNA}%) y menor costo total.
                </p>
            </div>
        `;
    } else {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #1e40af;">
                <h4 style="margin-bottom: 10px; color: #1e40af;">⚖️ Mismo Costo Total</h4>
                <p style="color: #333;">Ambos bancos tienen el mismo costo total a pagar.</p>
            </div>
        `;
    }

    document.getElementById("tablaResumenComparativo").innerHTML = html;
}

function actualizarTabla(tabla) {
    const sistema = document.getElementById("sistemaAmortizacion").value;
    const sistemaLabel = sistema === 'aleman' ? 'Sistema Alemán' : 'Sistema Francés';
    
    let html = `
        <div style="margin-bottom: 15px; padding: 10px; background: #f0f8ff; border-radius: 6px; border-left: 4px solid #667eea;">
            <strong>Sistema de Amortización:</strong> ${sistemaLabel}
            ${sistema === 'aleman' ? 
                ' (Amortización constante - Cuotas decrecientes)' : 
                ' (Cuota constante - Composición variable)'
            }
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Cuota</th>
                        <th>Cuota Total</th>
                        <th>Interés</th>
                        <th>Amortización</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
    `;

    tabla.forEach(fila => {
        html += `
            <tr>
                <td><strong>${fila.Cuota}</strong></td>
                <td>${formatearPesos(fila.Cuota_total)}</td>
                <td>${formatearPesos(fila.Interes)}</td>
                <td>${formatearPesos(fila.Amortizacion)}</td>
                <td>${formatearPesos(fila.Saldo)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById("tablaAmortizacion").innerHTML = html;
}

// Función para cambiar entre pestañas
function openTab(tabId) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Calcular automáticamente al cargar
// window.addEventListener('load', () => {
//     document.getElementById('monto').value = 150000;
//     document.getElementById('cuotas').value = 12;
//     calcularYActualizar();
// });