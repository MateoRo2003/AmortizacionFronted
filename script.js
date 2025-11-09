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

// Cálculo de métricas financieras - SOLO cuando no vienen del backend
function calcularMetricas(tna, monto, cuotas, totalPagar, datosBackend = {}) {
    // TEM - Tasa Efectiva Mensual (siempre calcular, no viene del backend)
    const tem = ((1 + tna / 100) ** (1 / 12) - 1) * 100;

    // TEA - Tasa Efectiva Anual
    // Usar del backend si existe, sino calcular
    const tea = datosBackend.TEA !== null && datosBackend.TEA !== undefined
        ? datosBackend.TEA
        : ((1 + tem / 100) ** 12 - 1) * 100;

    // CFT - Costo Financiero Total (total de intereses)
    const cft = totalPagar - monto;

    // CFTNA - CFT Nominal Anual (como porcentaje)
    const cftna = (cft / monto) * (12 / cuotas) * 100;

    // CFTEA - Usar del backend si existe, sino calcular basado en CFTNA
    const cftea = datosBackend.CFTEA !== null && datosBackend.CFTEA !== undefined
        ? datosBackend.CFTEA
        : ((1 + cftna / 100) ** 1 - 1) * 100; // Aproximación simple

    return {
        tem: tem.toFixed(2),
        tea: tea.toFixed(2),
        cft: cft.toFixed(2),
        cftna: cftna.toFixed(2),
        cftea: cftea.toFixed(2),
        teaCalculada: datosBackend.TEA === null || datosBackend.TEA === undefined,
        cfteaCalculada: datosBackend.CFTEA === null || datosBackend.CFTEA === undefined
    };
}

async function calcularYActualizar() {
    if (!validarCampos()) {
        return; // detiene todo
    }
    const monto = document.getElementById("monto").value;
    const cuotas = document.getElementById("cuotas").value;
    const banco = document.getElementById("banco").value;

    document.getElementById("loading").classList.add("active");

    const payload = {
        monto: Number(monto),
        cuotas: Number(cuotas),
        banco: banco
    };

    try {
        const res = await fetch("https://amortizacionbackend.onrender.com/api/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Respuesta del backend:", data);
        if (data.error) {
            alert(data.error);
            return;
        }

        datoPrincipal = {
            banco: banco,
            data: data,
            monto: Number(monto),
            cuotas: Number(cuotas)
        };

        actualizarDashboard(data, banco);

        // Si hay comparación activa, actualizarla
        if (datoComparacion) {
            mostrarComparacion();
        }
    } catch (error) {
        alert("Error al calcular: " + error.message);
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
            alert(data.error);
            return;
        }

        datoComparacion = {
            banco: bancoComp,
            data: data
        };

        mostrarComparacion();
    } catch (error) {
        alert("Error al comparar: " + error.message);
    } finally {
        document.getElementById("loading").classList.remove("active");
    }
}

function limpiarComparacion() {
    datoComparacion = null;
    document.getElementById("bancoComparacion").value = "";
    document.getElementById("comparacionSection").style.display = "none";

    // Limpiar subtítulos de comparación
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

    // Calcular y actualizar métricas financieras
    // Pasar datos del backend (TEA, CFTEA) si existen
    const datosBackend = {
        TEA: data.TEA || null,
        CFTEA: data.CFTEA || null
    };

    const metricas = calcularMetricas(data.TNA, monto, cuotas, totalPagar, datosBackend);

    // Mostrar TEM (siempre calculada)
    document.getElementById("tem").textContent = metricas.tem + "%";

    // Mostrar TEA con indicador si fue calculada
    document.getElementById("tea").innerHTML = metricas.tea + "%" +
        (metricas.teaCalculada ? ' <span style="font-size: 10px; opacity: 0.7;">*</span>' : '');

    // Mostrar CFT (siempre calculado)
    document.getElementById("cft").textContent = formatearPesos(metricas.cft);

    // Mostrar CFTNA (siempre calculado)
    document.getElementById("cftna").textContent = metricas.cftna + "%";

    // Actualizar sección de CFTEA (nueva métrica)
    // Si existe el elemento, actualizarlo
    const cfteaElement = document.getElementById("cftea");
    if (cfteaElement) {
        cfteaElement.innerHTML = metricas.cftea + "%" +
            (metricas.cfteaCalculada ? ' <span style="font-size: 10px; opacity: 0.7;">*</span>' : '');
    }

    // Actualizar gráficos
    actualizarGraficos(tabla);

    // Actualizar tabla
    actualizarTabla(tabla);
}

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

    // Calcular métricas para comparación con datos del backend
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

    // Actualizar subtítulos KPI con comparación
    const difTotal = total2 - total1;
    const difInteres = interes2 - interes1;
    const difCuota = cuota2 - cuota1;
    const difTNA = datoComparacion.data.TNA - datoPrincipal.data.TNA;

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

    // Actualizar CFTEA si existe el elemento
    const cfteaCompElement = document.getElementById("cfteaComp");
    if (cfteaCompElement) {
        const difCFTEA = parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea);
        const indicadorCFTEA2 = metricas2.cfteaCalculada ? ' <span style="font-size: 10px;">*</span>' : '';
        cfteaCompElement.innerHTML =
            `${datoComparacion.banco}: ${metricas2.cftea}%${indicadorCFTEA2} <span class="${difCFTEA > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">(${difCFTEA > 0 ? '+' : ''}${difCFTEA.toFixed(2)}%)</span>`;
    }

    // Mostrar sección de comparación
    document.getElementById("comparacionSection").style.display = "block";

    // Actualizar gráficos de comparación
    actualizarGraficosComparacion();

    // Actualizar tabla resumen
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

    if (cuotas > 70) {
        Swal.fire({
            icon: "warning",
            title: "Demasiadas cuotas",
            text: "Ingresá un valor menor o igual a 70 cuotas."
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

    // Gráfico de composición
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
                legend: { position: 'bottom' }
            }
        }
    });

    // Gráfico de distribución
    const ctxDist = document.getElementById('chartDistribucion').getContext('2d');
    if (charts.distribucion) charts.distribucion.destroy();
    charts.distribucion = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: tabla.map(r => `${r.Cuota}`),
            datasets: [{
                label: 'Interés',
                data: tabla.map(r => r.Interes),
                backgroundColor: '#f5576c'
            }, {
                label: 'Capital',
                data: tabla.map(r => r.Amortizacion),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Gráfico de cuotas mensuales
    const ctxCuotas = document.getElementById('chartCuotas').getContext('2d');
    if (charts.cuotas) charts.cuotas.destroy();
    charts.cuotas = new Chart(ctxCuotas, {
        type: 'bar',
        data: {
            labels: tabla.map(r => `Cuota ${r.Cuota}`),
            datasets: [{
                label: 'Cuota Total',
                data: tabla.map(r => r.Cuota_total),
                backgroundColor: '#30cfd0'
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

function actualizarGraficosComparacion() {
    const tabla1 = datoPrincipal.data.Tabla;
    const tabla2 = datoComparacion.data.Tabla;

    const total1 = tabla1.reduce((sum, row) => sum + row.Cuota_total, 0);
    const total2 = tabla2.reduce((sum, row) => sum + row.Cuota_total, 0);
    const interes1 = tabla1.reduce((sum, row) => sum + row.Interes, 0);
    const interes2 = tabla2.reduce((sum, row) => sum + row.Interes, 0);

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
                    <td>${metricas1.cftea}%${indicadorCFTEA1}</td>
                    <td>${metricas2.cftea}%${indicadorCFTEA2}</td>
                    <td class="${(parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea)) > 0 ? 'diferencia-negativa' : 'diferencia-positiva'}">
                        ${(parseFloat(metricas2.cftea) - parseFloat(metricas1.cftea)).toFixed(2)}%
                    </td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>Nota:</strong> Los valores marcados con asterisco (*) son calculados. Los valores sin asterisco provienen directamente del banco.
        </div>
    `;

    // Agregar análisis de ahorro
    const ahorro = total1 - total2;
    if (ahorro !== 0) {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: ${ahorro > 0 ? '#dcfce7' : '#fee2e2'}; border-radius: 8px;">
                <h4 style="margin-bottom: 10px; color: ${ahorro > 0 ? '#16a34a' : '#dc2626'};">
                    ${ahorro > 0 ? 'Mejor Opción' : 'Opción más Costosa'}
                </h4>
                <p style="color: #333;">
                    ${ahorro > 0
                ? `Eligiendo <strong>${datoPrincipal.banco}</strong> ahorrarías <strong>${formatearPesos(Math.abs(ahorro))}</strong> en comparación con ${datoComparacion.banco}.`
                : `Eligiendo <strong>${datoComparacion.banco}</strong> ahorrarías <strong>${formatearPesos(Math.abs(ahorro))}</strong> en comparación con ${datoPrincipal.banco}.`
            }
                </p>
            </div>
        `;
    }

    document.getElementById("tablaResumenComparativo").innerHTML = html;
}

function actualizarTabla(tabla) {
    let html = `
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
    `;

    document.getElementById("tablaAmortizacion").innerHTML = html;
}

// Función para cambiar entre pestañas
function openTab(tabId) {
    // Ocultar todas las pestañas
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    // Desactivar todos los botones
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Activar la pestaña seleccionada
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Calcular automáticamente al cargar
// window.addEventListener('load', () => {
//     // Establecer valore
//     calcularYActualizar();
// });