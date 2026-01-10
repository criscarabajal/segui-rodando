// src/services/pedidosService.js
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "pedidos";

/**
 * Guarda o actualiza un pedido en Firebase
 */
export async function guardarPedidoFirebase({
  pedidoNumero,
  cliente,
  carrito,
  jornadasMap,
  usuario,
  descuento,
  descuentoLabel,
  totalFinal,
}) {
  if (!pedidoNumero) throw new Error("Falta pedidoNumero");

  const ref = doc(db, COLLECTION, String(pedidoNumero));

  await setDoc(
    ref,
    {
      pedidoNumero: String(pedidoNumero),
      cliente: cliente || {},
      carrito: carrito || [],
      jornadasMap: jornadasMap || {},
      usuario: usuario || null,
      descuento: descuento || 0,
      descuentoLabel: descuentoLabel || '0',
      totalFinal: totalFinal || 0,
      actualizadoEn: serverTimestamp(),
      creadoEn: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Carga un pedido por número
 */
export async function cargarPedidoFirebase(pedidoNumero) {
  if (!pedidoNumero) throw new Error("Falta pedidoNumero");

  const ref = doc(db, COLLECTION, String(pedidoNumero));
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Obtiene todos los pedidos ordenados por fecha de actualización descendente
 */

export async function obtenerTodosPedidosFirebase() {
  const colRef = collection(db, COLLECTION);
  const q = query(colRef, orderBy("actualizadoEn", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Elimina un pedido por ID (que es el numero de pedido)
 */
export async function eliminarPedidoFirebase(pedidoNumero) {
  if (!pedidoNumero) throw new Error("Falta pedidoNumero");
  const ref = doc(db, COLLECTION, String(pedidoNumero));
  await deleteDoc(ref);
}
