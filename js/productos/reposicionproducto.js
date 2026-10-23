/*
 * Costos de reposición Helen.
 * Requiere que window.db esté inicializado por js/firebase/firebase-config.js.
 * No escribe ni modifica documentos de Firestore.
 * Para abrir: window.abrirModalCostosReposicion();
 */
(() => {
  "use strict";
  const root = document.getElementById("modal-costos-reposicion");
  if (!root || root.dataset.inicializado === "true") return;
  root.dataset.inicializado = "true";

  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Math.round(Number(n) || 0));
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const startDate = (d) => {
    const x = new Date(d);
    return Number.isNaN(x.getTime())
      ? null
      : new Date(x.getFullYear(), x.getMonth(), x.getDate());
  };
  const getDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    if (v.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  let catalog = new Map();
  let rowsPagados = [];
  let rowsDeuda = [];
  let usuarioActivo = "";
  let cargando = false;

  function getUsuario() {
    return (
      sessionStorage.getItem("usuarioOperativo") ||
      window.usuarioOperativo ||
      ""
    ).trim();
  }
  function getLineProductId(line) {
    return line?.productoId || line?.idProducto || line?.id || "";
  }
  function getLineQty(line) {
    return Math.max(0, num(line?.cantidad) || 1);
  }
  function getLineSubtotal(line) {
    const sub = num(line?.subtotal);
    return sub > 0
      ? sub
      : num(line?.precioUnitario || line?.precio) * getLineQty(line);
  }
  function getSaleBalance(sale) {
    const direct = num(
      sale?.saldoAdeber ?? sale?.saldoAdeudar ?? sale?.deudaPendiente,
    );
    if (direct > 0) return direct;
    const total = num(
      sale?.total ?? sale?.totalVenta ?? sale?.subtotalConDescuento,
    );
    const delivered = num(sale?.totalEntregado ?? sale?.montoPagado);
    return Math.max(0, total - delivered);
  }
  function saleIsDebt(sale) {
    return getSaleBalance(sale) > 0 || sale?.estado === "con_deuda";
  }
  function equalAllocation(lines, balance) {
    const amounts = lines.map((line) =>
      Math.max(0, Math.round(getLineSubtotal(line))),
    );
    const result = amounts.map(() => 0);
    let remaining = Math.max(0, Math.round(balance));
    let active = amounts.map((_, i) => i).filter((i) => amounts[i] > 0);
    // Reparto equitativo del saldo pendiente, sin asignar más que el valor de cada línea.
    while (remaining > 0 && active.length) {
      const quota = Math.max(1, Math.floor(remaining / active.length));
      let progressed = false;
      for (const i of [...active]) {
        const take = Math.min(amounts[i] - result[i], quota, remaining);
        if (take > 0) {
          result[i] += take;
          remaining -= take;
          progressed = true;
        }
        if (result[i] >= amounts[i]) active = active.filter((x) => x !== i);
        if (remaining <= 0) break;
      }
      if (!progressed) break;
    }
    return result;
  }
  function setDefaultDates() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const toInput = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    $("rp-desde").value = toInput(first);
    $("rp-hasta").value = toInput(now);
  }
  function lineCost(product, qty) {
    return (
      Math.max(
        0,
        num(product.precioCompra ?? product.costoCompra ?? product.precioCosto),
      ) * qty
    );
  }
  function aggregate(sales) {
    const paid = new Map();
    const debt = new Map();
    const from = startDate($("rp-desde").value);
    const to = startDate($("rp-hasta").value);
    if (to) to.setHours(23, 59, 59, 999);
    for (const sale of sales) {
      // Cada cuenta ve exclusivamente las ventas del usuario operativo seleccionado.
      if (
        String(sale.usuario || "")
          .trim()
          .toLowerCase() !== usuarioActivo.toLowerCase()
      )
        continue;
      const date = getDate(sale.fecha || sale.creadoEn);
      if (from && date && date < from) continue;
      if (to && date && date > to) continue;
      const saleLines = Array.isArray(sale.productos) ? sale.productos : [];
      // Solo líneas cuyo ID exista en el catálogo; excluye deudas antiguas y productos libres.
      const lines = saleLines
        .map((line) => ({ line, product: catalog.get(getLineProductId(line)) }))
        .filter((x) => x.product);
      if (!lines.length) continue;
      const isDebt = saleIsDebt(sale);
      if (!isDebt) {
        for (const { line, product } of lines) {
          const qty = getLineQty(line);
          const cost = lineCost(product, qty);
          if (!cost) continue;
          const id = getLineProductId(line);
          const current = paid.get(id) || {
            id,
            nombre: product.nombre || line.nombre || "Producto",
            categoria:
              product.categoria || product.categorias?.[0] || "Sin categoría",
            costoUnitario: lineCost(product, 1),
            unidades: 0,
            costo: 0,
          };
          current.unidades += qty;
          current.costo += cost;
          paid.set(id, current);
        }
        continue;
      }
      // Si ya existe una distribución manual, se respeta. Se toleran formatos de array u objeto.
      const saved = sale.distribucionDeudaProductos;
      const allocationById = new Map();
      if (Array.isArray(saved))
        saved.forEach((item) => {
          const id = item.productoId || item.id || item.idProducto;
          if (id)
            allocationById.set(
              id,
              Math.max(
                0,
                num(
                  item.saldoPendiente ??
                    item.montoPendiente ??
                    item.montoActual ??
                    item.saldo,
                ),
              ),
            );
        });
      else if (saved && typeof saved === "object")
        Object.entries(saved).forEach(([id, v]) =>
          allocationById.set(
            id,
            Math.max(
              0,
              num(
                typeof v === "object"
                  ? (v.saldoPendiente ??
                      v.montoPendiente ??
                      v.montoActual ??
                      v.saldo)
                  : v,
              ),
            ),
          ),
        );
      const allocations = equalAllocation(
        lines.map((x) => x.line),
        getSaleBalance(sale),
      );
      lines.forEach(({ line, product }, i) => {
        const id = getLineProductId(line);
        const qty = getLineQty(line);
        const cost = lineCost(product, qty);
        if (!cost) return;
        const subtotal = Math.max(0, getLineSubtotal(line));
        const outstanding = allocationById.has(id)
          ? allocationById.get(id)
          : allocations[i];
        const covered = Math.max(0, subtotal - Math.min(subtotal, outstanding));
        const key = id;
        const current = debt.get(key) || {
          id,
          nombre: product.nombre || line.nombre || "Producto",
          categoria:
            product.categoria || product.categorias?.[0] || "Sin categoría",
          costoUnitario: lineCost(product, 1),
          unidades: 0,
          costo: 0,
          cubierto: 0,
          falta: 0,
        };
        current.unidades += qty;
        current.costo += cost;
        current.cubierto += Math.min(cost, covered);
        current.falta += Math.max(0, cost - Math.min(cost, covered));
        debt.set(key, current);
      });
    }
    rowsPagados = [...paid.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
    // Debt rows include only products that have not yet reached their replacement cost.
    rowsDeuda = [...debt.values()]
      .filter((x) => x.falta > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    render();
  }
  function rowPaid(x) {
    return `<tr><td>${esc(x.nombre)}</td><td><span class="rp-categoria ${esc(String(x.categoria).toLowerCase())}">${esc(x.categoria)}</span></td><td>${x.unidades}</td><td>${money(x.costoUnitario)}</td><td class="rp-monto">${money(x.costo)}</td></tr>`;
  }
  function rowDebt(x) {
    const pct =
      x.costo > 0 ? Math.min(100, Math.round((x.cubierto / x.costo) * 100)) : 0;
    return `<tr><td>${esc(x.nombre)}</td><td><span class="rp-categoria ${esc(String(x.categoria).toLowerCase())}">${esc(x.categoria)}</span></td><td>${x.unidades}</td><td>${money(x.costoUnitario)}</td><td><div class="rp-cubierto"><span>${pct}%</span><div class="rp-barra"><i style="width:${pct}%"></i></div></div></td><td class="rp-falta">${money(x.falta)}</td><td class="rp-monto">${money(x.costo)}</td></tr>`;
  }
  function render() {
    const q = $("rp-buscar").value.trim().toLocaleLowerCase("es");
    const cat = $("rp-categoria").value;
    const state = $("rp-estado").value;
    const filter = (items) =>
      items.filter(
        (x) =>
          (!q || x.nombre.toLocaleLowerCase("es").includes(q)) &&
          (!cat || x.categoria === cat),
      );
    const paid = state === "deuda" ? [] : filter(rowsPagados);
    const debt = state === "pagado" ? [] : filter(rowsDeuda);
    $("rp-filas-pagados").innerHTML = paid.length
      ? paid.map(rowPaid).join("")
      : `<tr><td colspan="5" class="rp-vacio">No hay productos pagados para mostrar.</td></tr>`;
    $("rp-filas-deuda").innerHTML = debt.length
      ? debt.map(rowDebt).join("")
      : `<tr><td colspan="7" class="rp-vacio">No hay productos con deuda para mostrar.</td></tr>`;
    const paidTotal = paid.reduce((s, x) => s + x.costo, 0);
    const debtTotal = debt.reduce((s, x) => s + x.costo, 0);
    $("rp-total-pagados").textContent = `${money(paidTotal)} incluidos`;
    $("rp-subtotal-pagados").textContent = money(paidTotal);
    $("rp-total-deuda").textContent = `${money(debtTotal)} pendientes`;
    $("rp-subtotal-deuda").textContent = money(debtTotal);
    $("rp-total-reposicion").textContent = money(paidTotal);
    $("rp-cantidad-pagados").textContent = paid.length;
    $("rp-cantidad-deuda").textContent = debt.length;
    $("rp-pie-pagados").textContent = `${paid.length} productos en esta vista`;
    $("rp-pie-deuda").textContent =
      `${debt.length} productos pendientes en esta vista`;
  }
  async function cargar() {
    if (cargando) return;
    const db = window.db;
    if (!db) {
      showError(
        "No se encontró window.db. Cargá primero js/firebase/firebase-config.js.",
      );
      return;
    }
    usuarioActivo = getUsuario();
    if (!usuarioActivo) {
      showError(
        "No hay un usuario operativo seleccionado. Seleccioná Gon o Helen y volvé a abrir el modal.",
      );
      return;
    }
    cargando = true;
    showError("");
    $("rp-filas-pagados").innerHTML =
      `<tr><td colspan="5" class="rp-vacio">Cargando…</td></tr>`;
    $("rp-filas-deuda").innerHTML =
      `<tr><td colspan="7" class="rp-vacio">Cargando…</td></tr>`;
    try {
      const { collection, getDocs } =
        await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
      const [productsSnap, salesSnap] = await Promise.all([
        getDocs(collection(db, "productos")),
        getDocs(collection(db, "ventas")),
      ]);
      catalog = new Map();
      const cats = new Set();

      productsSnap.forEach((doc) => {
        const p = doc.data();

        catalog.set(doc.id, p);

        // Identificar quién creó el producto.
        const creador = String(p.usuarioCreador || p.creadoPor || "")
          .trim()
          .toLowerCase();

        // Solo mostrar categorías de productos del usuario activo.
        // Los productos sin creador identificado se mantienen compartidos.
        if (creador && creador !== usuarioActivo.toLowerCase()) {
          return;
        }

        const categoriasProducto = Array.isArray(p.categorias)
          ? p.categorias
          : p.categoria
            ? [p.categoria]
            : [];

        if (categoriasProducto.length === 0) {
          cats.add("Sin categoría");
          return;
        }

        categoriasProducto.forEach((categoria) => {
          const nombre = String(categoria || "").trim();

          if (nombre) {
            cats.add(nombre);
          }
        });
      });

      const select = $("rp-categoria");
      const old = select.value;

      select.innerHTML =
        `<option value="">Todas las categorías</option>` +
        [...cats]
          .sort((a, b) => a.localeCompare(b, "es"))
          .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
          .join("");

      if ([...cats].includes(old)) {
        select.value = old;
      }
      const sales = [];
      salesSnap.forEach((doc) => sales.push({ id: doc.id, ...doc.data() }));
      aggregate(sales);
      $("rp-nota").textContent =
        `Usuario: ${usuarioActivo}. Se consideran únicamente productos vinculados al catálogo (${catalog.size} productos cargados). Los costos usan el precioCompra actual del catálogo.`;
    } catch (e) {
      console.error("Error calculando costos de reposición:", e);
      showError(
        "No se pudieron cargar las ventas y los productos. Revisá la conexión y la consola del navegador.",
      );
    } finally {
      cargando = false;
    }
  }
  function showError(message) {
    const el = $("rp-error");
    el.textContent = message;
    el.hidden = !message;
  }
  function open() {
    root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (!$("rp-desde").value) setDefaultDates();
    cargar();
  }
  function close() {
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  $("rp-cerrar").addEventListener("click", close);
  $("rp-cerrar-x").addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.getAttribute("aria-hidden") === "false")
      close();
  });
  $("rp-actualizar").addEventListener("click", cargar);
  ["rp-buscar", "rp-categoria", "rp-estado"].forEach((id) =>
    $(id).addEventListener(id === "rp-buscar" ? "input" : "change", render),
  );
  ["rp-desde", "rp-hasta"].forEach((id) =>
    $(id).addEventListener("change", () => {
      if (
        $("rp-desde").value &&
        $("rp-hasta").value &&
        $("rp-desde").value > $("rp-hasta").value
      ) {
        showError("La fecha inicial no puede ser posterior a la fecha final.");
        return;
      }
      showError("");
      cargar();
    }),
  );
  window.abrirModalCostosReposicion = open;
  window.cerrarModalCostosReposicion = close;
})();
