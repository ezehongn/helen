(() => {
  "use strict";
  const money = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const $ = (id) => document.getElementById(id);
  const overlay = $("redistribuirDeudaModal");

  if (!overlay) {
    console.error(
      "No se encontró #redistribuirDeudaModal. Verificá que el HTML del modal esté insertado antes de cargar redistribuirdeudacliente.js.",
    );
    return;
  }
  const tbody = $("rdProductos");
  let config = null;
  let montos = [];
  let originales = [];
  let guardarCallback = null;

  const numero = (v) => Math.max(0, Math.round(Number(v) || 0));
  const fmt = (v) => money.format(numero(v)).replace(/\u00a0/g, " ");
  const fmtDelta = (v) =>
    v < 0 ? `- ${fmt(-v)}` : v > 0 ? `+ ${fmt(v)}` : fmt(0);

  function cerrar() {
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function renderFilas() {
    tbody.innerHTML = "";
    config.productos.forEach((p, i) => {
      const actual = numero(p.montoActual);
      const maximo = Math.max(actual, numero(p.maximo));
      const tr = document.createElement("tr");
      const tdProducto = document.createElement("td");
      const product = document.createElement("div");
      product.className = "rd-product";
      const imageBox = document.createElement("div");
      imageBox.className = "rd-product-image";
      if (p.imagenUrl) {
        const img = document.createElement("img");
        img.src = p.imagenUrl;
        img.alt = p.nombre || "Producto";
        img.loading = "lazy";
        img.onerror = () => {
          img.remove();
          imageBox.textContent = "Sin imagen";
        };
        imageBox.appendChild(img);
      } else {
        imageBox.textContent = "Sin imagen";
      }
      const details = document.createElement("div");
      const name = document.createElement("div");
      name.className = "rd-product-name";
      name.textContent = p.nombre || "Producto";
      const size = document.createElement("div");
      size.className = "rd-product-size";
      size.textContent = p.talle
        ? `Talle: ${p.talle}`
        : p.bloqueado
          ? "No desglosado en origen"
          : "Sin talle";
      details.append(name, size);
      product.append(imageBox, details);
      tdProducto.appendChild(product);

      const tdActual = document.createElement("td");
      tdActual.className = "rd-current";
      tdActual.textContent = fmt(actual);

      const tdNuevo = document.createElement("td");
      tdNuevo.className = "rd-edit";
      const input = document.createElement("input");
      input.className = "rd-number";
      input.type = "number";
      input.min = "0";
      input.max = String(maximo);
      input.step = "1";
      input.value = String(montos[i]);
      input.disabled = Boolean(p.bloqueado);
      input.setAttribute("aria-label", `Nuevo saldo de ${p.nombre}`);

      const range = document.createElement("input");
      range.className = "rd-range";
      range.type = "range";
      range.min = "0";
      range.max = String(maximo);
      range.step = "1";
      range.value = String(montos[i]);
      range.disabled = Boolean(p.bloqueado);
      const labels = document.createElement("div");
      labels.className = "rd-range-labels";
      const min = document.createElement("span");
      min.textContent = fmt(0);
      const max = document.createElement("span");
      max.textContent = fmt(maximo);
      labels.append(min, max);
      const cambiar = (value) => {
        montos[i] = Math.min(maximo, numero(value));
        input.value = String(montos[i]);
        range.value = String(montos[i]);
        actualizarTotales();
        actualizarDeltaFila(tr, i);
      };
      input.addEventListener("input", () => cambiar(input.value));
      range.addEventListener("input", () => cambiar(range.value));
      tdNuevo.append(input, range, labels);

      const tdDelta = document.createElement("td");
      const delta = document.createElement("span");
      delta.className = "rd-difference";
      tdDelta.appendChild(delta);
      tr.append(tdProducto, tdActual, tdNuevo, tdDelta);
      tbody.appendChild(tr);
      actualizarDeltaFila(tr, i);
    });
    actualizarTotales();
  }

  function actualizarDeltaFila(tr, i) {
    const delta = montos[i] - numero(config.productos[i].montoActual);
    const badge = tr.querySelector(".rd-difference");
    badge.textContent = fmtDelta(delta);
    badge.classList.toggle("positive", delta > 0);
  }

  function actualizarTotales() {
    const deuda = numero(config.deudaTotal);
    const actual = config.productos.reduce(
      (sum, p) => sum + numero(p.montoActual),
      0,
    );
    const total = montos.reduce((sum, v) => sum + numero(v), 0);
    const diferencia = deuda - total;
    $("rdDeudaTotal").textContent = fmt(deuda);
    $("rdTotalDistribuido").textContent = fmt(total);
    $("rdDiferencia").textContent = fmt(diferencia);
    $("rdSumaActual").textContent = fmt(actual);
    $("rdSumaNuevo").textContent = fmt(total);
    $("rdSumaDiferencia").textContent = fmt(total - actual);
    $("rdEstadoDistribucion").classList.toggle("invalid", total !== deuda);
    $("rdEstadoDistribucion").textContent = total === deuda ? "✓" : "!";
    $("rdSumaDiferencia").classList.toggle("invalid", total !== deuda);
    $("rdValidacion").textContent =
      total === deuda
        ? "La distribución coincide con la deuda total."
        : total > deuda
          ? `La distribución supera la deuda total por ${fmt(total - deuda)}.`
          : `Faltan ${fmt(deuda - total)} para distribuir. La suma debe coincidir con la deuda total.`;
    $("rdGuardar").disabled = total !== deuda;
  }

  function distribuirIgual() {
    let restante = numero(config.deudaTotal);
    montos = config.productos.map(() => 0);
    let activos = config.productos
      .map((p, i) => i)
      .filter(
        (i) =>
          !config.productos[i].bloqueado &&
          numero(config.productos[i].maximo) > 0,
      );
    // Los productos bloqueados conservan su importe actual.
    config.productos.forEach((p, i) => {
      if (p.bloqueado) montos[i] = numero(p.montoActual);
    });
    restante -= montos.reduce((a, b) => a + b, 0);
    while (restante > 0 && activos.length) {
      const cuota = Math.max(1, Math.floor(restante / activos.length));
      let progreso = false;
      for (const i of [...activos]) {
        const maximo = Math.max(
          numero(config.productos[i].montoActual),
          numero(config.productos[i].maximo),
        );
        const cantidad = Math.min(maximo - montos[i], cuota, restante);
        if (cantidad > 0) {
          montos[i] += cantidad;
          restante -= cantidad;
          progreso = true;
        }
        if (montos[i] >= maximo) activos = activos.filter((x) => x !== i);
        if (restante <= 0) break;
      }
      if (!progreso) break;
    }
    renderFilas();
  }

  function abrir(nuevaConfig, callback) {
    if (
      !nuevaConfig ||
      !Array.isArray(nuevaConfig.productos) ||
      !nuevaConfig.productos.length
    ) {
      alert("No hay productos con deuda para redistribuir.");
      return;
    }
    config = {
      cliente: nuevaConfig.cliente || {},
      deudaTotal: numero(nuevaConfig.deudaTotal),
      productos: nuevaConfig.productos.map((p) => ({
        ...p,
        montoActual: numero(p.montoActual),
        maximo: Math.max(numero(p.montoActual), numero(p.maximo)),
      })),
    };
    montos = config.productos.map((p) => p.montoActual);
    originales = [...montos];
    guardarCallback = callback;
    $("rdTitulo").textContent =
      "Redistribuir deuda" +
      (config.cliente.nombre
        ? ` · ${config.cliente.nombre} ${config.cliente.apellido || ""}`
        : "");
    $("rdMensajeGuardado").textContent = "";
    renderFilas();
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  $("rdCerrar").addEventListener("click", cerrar);
  $("rdCancelar").addEventListener("click", cerrar);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cerrar();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      overlay.getAttribute("aria-hidden") === "false"
    )
      cerrar();
  });
  $("rdDistribuir").addEventListener("click", distribuirIgual);
  $("rdRestablecer").addEventListener("click", () => {
    montos = [...originales];
    renderFilas();
    $("rdMensajeGuardado").textContent =
      "Se restablecieron los saldos al abrir el modal.";
  });
  $("rdQuitar").addEventListener("click", () => {
    montos = config.productos.map((p) =>
      p.bloqueado ? numero(p.montoActual) : 0,
    );
    renderFilas();
    $("rdMensajeGuardado").textContent =
      "Importes puestos en cero. Para guardar, la suma debe volver a coincidir con la deuda.";
  });
  $("rdGuardar").addEventListener("click", async () => {
    const total = montos.reduce((sum, v) => sum + numero(v), 0);
    if (total !== numero(config.deudaTotal)) return;
    const resultado = {
      cliente: config.cliente,
      deudaTotal: numero(config.deudaTotal),
      totalDistribuido: total,
      diferencia: numero(config.deudaTotal) - total,
      productos: config.productos.map((p, i) => ({
        ...p,
        nuevoMonto: numero(montos[i]),
        diferencia: numero(montos[i]) - numero(p.montoActual),
      })),
    };
    const button = $("rdGuardar");
    button.disabled = true;
    button.textContent = "Guardando...";
    try {
      if (typeof guardarCallback !== "function")
        throw new Error("No se configuró el guardado de la distribución.");
      await guardarCallback(resultado);
      $("rdMensajeGuardado").textContent =
        "Distribución guardada correctamente.";
      cerrar();
    } catch (error) {
      console.error(error);
      $("rdMensajeGuardado").textContent =
        "No se pudo guardar la distribución.";
      button.disabled = false;
      button.textContent = "▣ Guardar distribución";
      return;
    }
    button.textContent = "▣ Guardar distribución";
  });

  window.abrirRedistribucionDeuda = abrir;
  window.cerrarRedistribucionDeuda = cerrar;
})();
