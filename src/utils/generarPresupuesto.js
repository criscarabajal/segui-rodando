// src/utils/generarPresupuesto.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "../assets/logo.png";
import lochImg from "../assets/loch.jpeg";
import { formatearFechaHora } from "./Fecha";

export function generarNumeroPresupuesto() {
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2, "0");
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const yy = String(ahora.getFullYear()).slice(-2);
  const fecha = `${dd}${mm}${yy}`;
  const contador = Math.floor(Math.random() * 1000) + 1;
  return `${fecha}-${contador}`;
}

export default function generarPresupuestoPDF(
  cliente,
  productosSeleccionados,
  jornadasMap,
  fechaEmision,
  pedidoNumero = ''
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  const numeroVisible = pedidoNumero || fechaEmision;
  const safe = (v, fb = "-") => (v || v === 0 ? String(v) : fb);

  // --- Encabezado ---
  const drawHeader = () => {
    const imgP = doc.getImageProperties(logoImg);
    const logoW = 100;
    const logoH = (imgP.height * logoW) / imgP.width;
    doc.addImage(logoImg, "PNG", M, 40, logoW, logoH);

    const imgL = doc.getImageProperties(lochImg);
    const lochW = 60;
    const lochH = (imgL.height * lochW) / imgL.width;
    doc.addImage(lochImg, "JPEG", M + logoW + 10, 40, lochW, lochH);

    doc.setFontSize(18);
    doc.text(`Presupuesto N°: ${safe(numeroVisible)}`, W - M, 60, { align: "right" });

    doc.setFontSize(10);
    const hoy = new Date();
    const emisionLegible = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;
    doc.text(`Emisión: ${emisionLegible}`, W - M, 75, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(M, 110, W - M, 110);
  };

  // --- Datos del cliente (solo nombre) ---
  const drawClientData = (yStart) => {
    let y = yStart;
    doc.setFontSize(12);
    doc.text("Cliente:", M, y);
    doc.setFontSize(10);
    doc.text(safe(cliente?.nombre), M + 70, y);
    return y + 24;
  };

  drawHeader();
  let cursorY = drawClientData(140);

  // --- Agrupar por categoría y preparar tabla ---
  const grupos = {};
  productosSeleccionados.forEach((item, idxGlobal) => {
    const cat = item.categoria || "sin categoría";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push({ ...item, __idxGlobal: idxGlobal });
  });

  const headers = ["detalle", "cant.", "jornadas", "p.u.", "subtotal"];
  const body = [];
  Object.entries(grupos).forEach(([cat, items]) => {
    body.push([{ content: cat, colSpan: 5, styles: { fillColor: [235, 235, 235], fontStyle: "bold" } }]);
    items.forEach((i) => {
      const qty = parseInt(i.cantidad, 10) || 0;
      const j = parseInt(jornadasMap[i.__idxGlobal], 10) || 1;
      const price = parseFloat(i.precio) || 0;
      const subtotal = qty * price * j;
      const detalleLines = [i.nombre || "-"];
      if (i.incluye) detalleLines.push(...String(i.incluye).split("\n"));
      body.push([
        detalleLines.join("\n"),
        qty,
        j,
        `$${Number.isFinite(price) ? price.toFixed(0) : "0"}`,
        `$${Number.isFinite(subtotal) ? subtotal.toFixed(0) : "0"}`
      ]);
    });
  });

  autoTable(doc, {
    startY: cursorY,
    margin: { top: cursorY, left: M, right: M },
    head: [headers],
    body,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
    theme: "grid",
    pageBreak: "auto",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader();
        drawClientData(140);
      }
    }
  });

  // --- Cálculo de totales ---
  const finalY = doc.lastAutoTable.finalY + 20;
  const totalBruto = Object.values(grupos).flat().reduce((sum, itm) => {
    const qty = parseInt(itm.cantidad, 10) || 0;
    const j = parseInt(jornadasMap[itm.__idxGlobal], 10) || 1;
    const price = parseFloat(itm.precio) || 0;
    return sum + qty * price * j;
  }, 0);

  const appliedDiscount = parseFloat(localStorage.getItem("descuento")) || 0;
  const descuentoMonto = (totalBruto * appliedDiscount) / 100;
  const totalTrasDescuento = totalBruto - descuentoMonto;
  const ivaMonto = totalTrasDescuento * 0.21;
  const totalConIVA = totalTrasDescuento + ivaMonto;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Subtotal: $${(Number.isFinite(totalBruto) ? totalBruto : 0).toFixed(0)}`, W - M, finalY, { align: "right" });

  doc.text(
    `Descuento (${appliedDiscount}%): -$${(Number.isFinite(descuentoMonto) ? descuentoMonto : 0).toFixed(0)}`,
    W - M,
    finalY + 16,
    { align: "right" }
  );

  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(
    `PRECIO TOTAL SIN IVA: $${(Number.isFinite(totalTrasDescuento) ? totalTrasDescuento : 0).toFixed(0)}`,
    W - M,
    finalY + 36,
    { align: "right" }
  );

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  if (appliedDiscount !== 30) {
    doc.text(
      `IVA (21%): $${(Number.isFinite(ivaMonto) ? ivaMonto : 0).toFixed(0)}`,
      W - M,
      finalY + 60,
      { align: "right" }
    );
    doc.text(
      `Precio final con iva: $${(Number.isFinite(totalConIVA) ? totalConIVA : 0).toFixed(0)}`,
      W - M,
      finalY + 76,
      { align: "right" }
    );
  }

  // Notas
  const notasY = appliedDiscount === 30 ? finalY + 60 : finalY + 100;
  doc.setFontSize(9);
  doc.text("Aclaraciones:", M, notasY);
  doc.setFontSize(8);
  [
    "Validez del presupuesto: 20 días",
    "Formas de pago: efectivo • mercadopago • transferencia",
    "El alquiler de equipo no incluye seguro",
    "El cliente es responsable por extravio, robo, daño y/o faltantes",
    "El alquiler no incluye transporte ni guardia"
  ].forEach((ln, i) => doc.text(ln, M, notasY + 12 + i * 12));

  const nombreArchivo = pedidoNumero
    ? `Presupuesto_${String(pedidoNumero)}.pdf`
    : `${String(cliente?.nombre || "cliente")}_${String(fechaEmision)}.pdf`;

  doc.save(nombreArchivo);
}
