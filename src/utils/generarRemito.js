// src/utils/generarRemito.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "../assets/logo.png";
import lochImg from "../assets/loch.jpeg";
import { formatearFechaHora } from "./Fecha";

export function generarNumeroRemito() {
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2, "0");
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const yy = String(ahora.getFullYear()).slice(-2);
  const fecha = `${dd}${mm}${yy}`;
  const contador = Math.floor(Math.random() * 1000) + 1;
  return `${fecha}-${contador}`;
}

// Helper para el nombre del archivo
const sanitize = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export default function generarRemitoPDF(
  cliente,
  productosSeleccionados,
  numeroRemito,
  pedidoNumero = "",
  jornadasMap = {},
  comentario = ""
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // 👉 Prioriza el número que viene del input "Pedido N°"
  const remitoEfectivo = String(pedidoNumero || numeroRemito || "").trim();

  // ——— HEADER ———
  const drawHeader = () => {
    const imgP = doc.getImageProperties(logoImg);
    const logoW = 100;
    const logoH = (imgP.height * logoW) / imgP.width;
    doc.addImage(logoImg, "PNG", M, 20, logoW, logoH);

    const lochP = doc.getImageProperties(lochImg);
    const lochW = 60;
    const lochH = (lochP.height * lochW) / lochP.width;
    doc.addImage(lochImg, "JPEG", M + logoW + 10, 20, lochW, lochH);

    // N° remito (usa el del input)
    doc.setFontSize(16);
    doc.text(`${remitoEfectivo}`, W - M, 40, { align: "right" });

    // Pedido N°
    doc.setFontSize(10);
    doc.text(`Pedido N°: ${pedidoNumero}`, W - M, 88, { align: "right" });

    doc.setFillColor(242, 242, 242);
    doc.rect(M, 80, W - 2 * M, 18, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("CRONOGRAMA DEL PEDIDO", W / 2, 93, { align: "center" });
  };

  const drawClientData = () => {
    doc.setFontSize(9);
    doc.text(`CLIENTE: ${cliente.nombre || ""} ${cliente.apellido || ""}`, M, 110);
    doc.text(`D.N.I.: ${cliente.dni || ""}`, M, 125);
    doc.text(`TEL: ${cliente.telefono || ""}`, M, 140);
    doc.text(`RETIRO: ${formatearFechaHora(new Date(cliente.fechaRetiro || ""))}`, M, 160);
    doc.text(`DEVOLUCIÓN: ${formatearFechaHora(new Date(cliente.fechaDevolucion || ""))}`, M + 300, 160);
  };

  drawHeader();
  drawClientData();

  const cols = [
    { header: "Cantidad", dataKey: "cantidad" },
    { header: "Detalle", dataKey: "detalle" },
    { header: "N° de Serie", dataKey: "serie" },
    { header: "Cod.", dataKey: "cod" }
  ];

  const comentarioLinea = (comentario ?? localStorage.getItem("comentario") ?? "").trim();
  const body = [];

  if (comentarioLinea) {
    body.push([{
      content: comentarioLinea, colSpan: 4,
      styles: { fillColor: [245,245,245], fontStyle: "bold", fontSize: 14,
        halign: "left", valign: "middle", cellPadding: { top: 8, bottom: 8, left: 4, right: 4 } }
    }]);
  }

  const normalizar = (s) => (String(s || "")).trim();
  const itemsConIdx = productosSeleccionados.map((it, idx) => ({ ...it, __idx: idx }));

  const grupos = itemsConIdx.reduce((acc, it) => {
    const g = normalizar(it.grupo) || "Sin grupo";
    if (!acc[g]) acc[g] = [];
    acc[g].push(it);
    return acc;
  }, {});

  const nombresGrupo = Object.keys(grupos)
    .sort((a, b) => (a === "Sin grupo") - (b === "Sin grupo"));

  nombresGrupo.forEach((gName) => {
    body.push([{
      content: gName, colSpan: 4,
      styles: { fillColor: [210,210,210], fontStyle: "bold", fontSize: 12,
        halign: "left", valign: "middle", cellPadding: { top: 6, bottom: 6, left: 4, right: 4 } }
    }]);

    const porCategoria = grupos[gName].reduce((acc, it) => {
      const cat = it.categoria || "Sin categoría";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(it);
      return acc;
    }, {});

    Object.entries(porCategoria).forEach(([cat, items]) => {
      body.push([{
        content: cat, colSpan: 4,
        styles: { fillColor: [235,235,235], fontStyle: "bold",
          halign: "left", valign: "middle", cellPadding: { top: 4, bottom: 4, left: 4, right: 4 } }
      }]);

      items.forEach((i) => {
        const lineas = [i.nombre];
        if (i.incluye) lineas.push(...String(i.incluye).split("\n"));
        body.push([ i.cantidad, lineas.join("\n"), i.serial || "", "" ]);
      });
    });
  });

  autoTable(doc, {
    startY: 180,
    margin: { top: 180, left: M, right: M },
    head: [cols.map(c => c.header)],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    theme: "grid",
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
    didDrawPage: () => { drawHeader(); drawClientData(); }
  });

  const endY = doc.lastAutoTable.finalY + 20;

  const totalSinIVA = productosSeleccionados.reduce((sum, item, idx) => {
    const qty = parseInt(item.cantidad, 10) || 0;
    const j = parseInt(jornadasMap[idx], 10) || 1;
    const precio = parseFloat(item.precio) || 0;
    return sum + qty * precio * j;
  }, 0);

  const appliedDiscount = parseFloat(localStorage.getItem("descuento")) || 0;
  const totalConDescuento = totalSinIVA * (1 - appliedDiscount / 100);

  const boxX = W - M - 150;
  const boxH = appliedDiscount > 0 ? 60 : 40;
  doc.rect(boxX, endY - 10, 150, boxH);

  doc.setFontSize(10);
  doc.text("PRECIO s/IVA", boxX + 75, endY + 2, { align: "center" });
  if (appliedDiscount > 0) {
    doc.text(`Descuento ${appliedDiscount}%`, boxX + 75, endY + 20, { align: "center" });
    doc.text(`$${totalConDescuento.toFixed(2)}`, boxX + 75, endY + 38, { align: "center" });
  } else {
    doc.text(`$${totalSinIVA.toFixed(2)}`, boxX + 75, endY + 20, { align: "center" });
  }

  doc.rect(boxX, endY + boxH + 10, 150, 70);
  doc.text("PAGO", boxX + 75, endY + boxH + 25, { align: "center" });
  doc.text("Efectivo [ ]", boxX + 5, endY + boxH + 40);
  doc.text("MP Guido [ ]", boxX + 5, endY + boxH + 55);
  doc.text("MP Jona [ ]", boxX + 5, endY + boxH + 70);

  const sigY = endY + boxH + 200;
  const segment = (W - 2 * M) / 3;
  ["FIRMA", "ACLARACIÓN", "D.N.I."].forEach((txt, i) => {
    const x = M + i * segment;
    doc.line(x, sigY, x + segment - 20, sigY);
    doc.setFontSize(8);
    doc.text(txt, x, sigY + 12);
  });

  doc.setFontSize(6);
  doc.text("guardias no incluidas", M, sigY + 30);

  // Nombre de archivo: REMITO (N°) + Nombre
  const nombreCompleto = sanitize([cliente?.nombre, cliente?.apellido].filter(Boolean).join(" "));
  const filename = `REMITO (${sanitize(remitoEfectivo)}) ${nombreCompleto}.pdf`;
  doc.save(filename);
}
