// src/utils/fetchProductos.js
export async function fetchProductos() {
  const sheetId   = "1DhpNyUyM-sTHuoucELtaDP3Ul5-JemSrw7uhnhohMZc";
  const sheetName = "PRODUCTOS";
  const query     = encodeURIComponent("SELECT *");
  const url       = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tq=${query}`;

  // Normaliza texto: sin acentos, minúsculas, trim
  const norm = (s) =>
    String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Intenta encontrar el índice de la columna "Valor de reposición"
  const findValorRepIndex = (headers) => {
    const patterns = [
      "valor de reposicion",
      "valor reposicion",
      "valor de reposición",
      "valor reposición",
      "valor de reposicion (usd)",
      "valor reposicion (usd)",
    ];
    const normalized = headers.map(h => norm(h));
    for (let p of patterns) {
      const i = normalized.findIndex(h => h === norm(p));
      if (i !== -1) return i;
    }
    // fallback: si no lo encontró, probamos que contenga ambas palabras
    const i2 = normalized.findIndex(h => h.includes("valor") && h.includes("reposicion"));
    if (i2 !== -1) return i2;

    // último fallback: tu índice anterior (K = 10)
    return 10;
  };

  // Soporta strings tipo "$ 1.234,56" o "1,234.56"
  const parseNumberLoose = (val) => {
    if (val == null || val === "") return 0;
    if (typeof val === "number") return val;
    let s = String(val).trim();

    // quitamos todo menos dígitos, puntos, comas y signos
    s = s.replace(/[^\d.,-]/g, "");

    // si hay tanto punto como coma, asumimos que el último es el decimal
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        // formato 1.234,56 -> quitamos puntos (miles), coma => punto
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // formato 1,234.56 -> quitamos comas (miles)
        s = s.replace(/,/g, "");
      }
    } else if (lastComma !== -1 && lastDot === -1) {
      // solo coma: asumimos decimales argentinos 123,45 -> 123.45
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // solo punto o nada: quitamos comas de miles
      s = s.replace(/,/g, "");
    }

    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  try {
    const res  = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(
      text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
    );

    // Lee todas las etiquetas (headers)
    const cols = (json.table.cols || []).map(c => (c.label || "").trim());
    console.log("Headers detectados:", cols);

    // Encuentra índice real de "Valor de reposición"
    const idxValorRep = findValorRepIndex(cols);

    // Mapeo de filas
    const rows = (json.table.rows || []).map(r => {
      const obj = {};
      (r.c || []).forEach((cell, i) => obj[cols[i]] = cell?.v ?? "");

      const valorRaw = r.c[idxValorRep]?.v;

      return {
        nombre:          obj["Equipos"]          || "",
        categoria:       obj["Categoria"]        || "",
        subcategoria:    obj["SUB-CATEGORIA"]    || "",
        stock:           obj["STOCK"]            || "",
        precio:          obj["PRECIO"]           || "",
        alquilable:      obj["ALQUILABLE"]       || "",
        serial:          obj["SERIAL"]           || "",
        incluye:         obj["INCLUYE"]          || "",
        // ==> propiedad nueva / robusta:
        valorReposicion: parseNumberLoose(valorRaw),
      };
    });

    console.log("Primer producto con valorReposicion:", rows[0]);
    return rows;
  } catch (err) {
    console.error("Error fetchProductos:", err);
    return [];
  }
}
