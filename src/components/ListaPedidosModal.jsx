import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    Typography,
    Box,
    IconButton,
    Grid,
    CircularProgress,
    Tabs,
    Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { obtenerTodosPedidosFirebase, eliminarPedidoFirebase } from '../services/pedidosService';
import generarRemitoPDF from '../utils/generarRemito';
import generarPresupuestoPDF from '../utils/generarPresupuesto';

export default function ListaPedidosModal({ open, onClose, onSelectPedido }) {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (open) {
            cargarPedidos();
        }
    }, [open]);

    const cargarPedidos = async () => {
        setLoading(true);
        try {
            const data = await obtenerTodosPedidosFirebase();
            setPedidos(data);
        } catch (error) {
            console.error("Error cargando pedidos:", error);
            alert("Error cargando pedidos");
        } finally {
            setLoading(false);
        }
    };

    const handleSeleccionar = (pedido) => {
        if (onSelectPedido) {
            onSelectPedido(pedido);
        }
        onClose();
    };

    const handleEliminar = async (pedido) => {
        const nro = pedido.pedidoNumero;
        const tipo = pedido.tipo || 'pedido';
        const docId = pedido.id; // ID real del documento en Firebase

        // Si es un pedido, preguntar si quiere borrar los relacionados
        if (tipo === 'pedido') {
            const confirmar = window.confirm(
                `¿Seguro que querés borrar el pedido N° ${nro}?\n\nTambién se borrará el remito y presupuesto correspondiente.`
            );

            if (!confirmar) return;



            try {
                // Borrar el pedido
                await eliminarPedidoFirebase(docId);

                // Borrar relacionados automáticamente
                try {
                    await eliminarPedidoFirebase(`${nro}-remito`);
                } catch (e) {
                    console.log(`No se encontró remito ${nro}-remito`);
                }
                try {
                    await eliminarPedidoFirebase(`${nro}-presupuesto`);
                } catch (e) {
                    console.log(`No se encontró presupuesto ${nro}-presupuesto`);
                }

                // Actualizar la lista local - filtrar todos los relacionados
                setPedidos((prev) => prev.filter(p => p.pedidoNumero !== nro));

                alert("Pedido y documentos relacionados eliminados.");
            } catch (error) {
                console.error(error);
                alert("Error al eliminar. Ver consola.");
            }
        } else {
            // Para remitos y presupuestos, confirmación simple
            if (!window.confirm(`¿Estás seguro de querer borrar este ${tipo} N° ${nro}?`)) {
                return;
            }
            try {
                await eliminarPedidoFirebase(docId);
                setPedidos((prev) => prev.filter(p => p.id !== docId));
                alert(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado.`);
            } catch (error) {
                console.error(error);
                alert("Error al eliminar. Ver consola.");
            }
        }
    };

    const handleDescargar = (pedido) => {
        const tipo = pedido.tipo || 'pedido';
        const clienteParaPDF = { ...pedido.cliente, nombre: (pedido.cliente?.nombre || '').trim() };
        const nro = String(pedido.pedidoNumero || '').trim();
        const carrito = pedido.carrito || [];
        const jornadasMap = pedido.jornadasMap || {};

        if (tipo === 'remito') {
            generarRemitoPDF(clienteParaPDF, carrito, nro, nro, jornadasMap);
        } else if (tipo === 'presupuesto') {
            const fecha = new Date().toLocaleDateString('es-AR');
            generarPresupuestoPDF(clienteParaPDF, carrito, jornadasMap, fecha, nro);
        } else {
            // Para pedidos regulares, generar como remito
            generarRemitoPDF(clienteParaPDF, carrito, nro, nro, jornadasMap);
        }
    };

    // Filtrado
    const pedidosFiltrados = pedidos.filter((p) => {
        // Texto
        const term = busqueda.toLowerCase();
        const nro = String(p.pedidoNumero || '').toLowerCase();
        const cliente = (p.cliente?.nombre || '').toLowerCase();
        const matchTexto = nro.includes(term) || cliente.includes(term);

        // Fecha
        let matchFecha = true;
        // La fecha en firebase suele ser Timestamp. Convertir a Date.
        // Usamos actualizadoEn o creadoEn
        const ts = p.actualizadoEn || p.creadoEn;
        if (ts) {
            const fechaPedido = ts.toDate ? ts.toDate() : new Date(ts); // Manejo si es Timestamp de Firestore o string/date

            if (fechaInicio) {
                const fInicio = new Date(fechaInicio);
                // Reset time to 00:00:00 for accurate comparison if desired, or just direct compare
                if (fechaPedido < fInicio) matchFecha = false;
            }
            if (fechaFin) {
                const fFin = new Date(fechaFin);
                fFin.setHours(23, 59, 59, 999); // Final del día
                if (fechaPedido > fFin) matchFecha = false;
            }
        }

        // Filtro por tipo según la pestaña seleccionada
        let matchTipo = true;
        if (tabValue === 1) {
            // Pestaña Remitos
            matchTipo = p.tipo === 'remito';
        } else if (tabValue === 2) {
            // Pestaña Presupuestos
            matchTipo = p.tipo === 'presupuesto';
        }
        // tabValue === 0 muestra todos

        return matchTexto && matchFecha && matchTipo;
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ m: 0, p: 2, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                    <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Todos los pedidos" />
                        <Tab label="Remitos" />
                        <Tab label="Presupuestos" />
                    </Tabs>
                </Box>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Buscar (N° o Cliente)"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Desde"
                                InputLabelProps={{ shrink: true }}
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Hasta"
                                InputLabelProps={{ shrink: true }}
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button variant="outlined" fullWidth onClick={cargarPedidos}>
                                Recargar
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {pedidosFiltrados.length === 0 ? (
                            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                No se encontraron pedidos.
                            </Typography>
                        ) : (
                            pedidosFiltrados.map((p) => {
                                const ts = p.actualizadoEn || p.creadoEn;
                                const fechaStr = ts && ts.toDate ? ts.toDate().toLocaleString() : 'Sin fecha';
                                const totalItems = (p.carrito || []).reduce((acc, item) => acc + (item.cantidad || 0), 0);

                                // Calcular totales visuales si no existen
                                let totalVisual = p.totalFinal;
                                if (totalVisual === undefined) {
                                    // Fallback para pedidos viejos: calcular al vuelo
                                    const items = p.carrito || [];
                                    const mapJornadas = p.jornadasMap || {};
                                    const subTotal = items.reduce((sum, item, idx) => {
                                        const qty = parseInt(item.cantidad, 10) || 0;
                                        const j = parseInt(mapJornadas[idx], 10) || 1;
                                        const price = parseFloat(item.precio) || 0;
                                        return sum + qty * price * j;
                                    }, 0);
                                    const desc = p.descuento || 0;
                                    totalVisual = subTotal * (1 - desc / 100);
                                }

                                return (
                                    <ListItem
                                        key={p.id || p.pedidoNumero}
                                        disablePadding
                                        sx={{
                                            borderBottom: '1px solid #eee',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    Pedido #{p.pedidoNumero}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Cliente: {p.cliente?.nombre || 'Anónimo'}
                                                </Typography>
                                                <Typography variant="caption" display="block">
                                                    {fechaStr} • {totalItems} items
                                                </Typography>
                                                <Typography variant="subtitle2" sx={{ mt: 0.5, color: 'success.main' }}>
                                                    Total: ${totalVisual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </Typography>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => handleSeleccionar(p)}
                                            >
                                                Cargar
                                            </Button>

                                            <IconButton
                                                color="primary"
                                                onClick={() => handleDescargar(p)}
                                                sx={{ ml: 1 }}
                                                title="Descargar PDF"
                                            >
                                                <DownloadIcon />
                                            </IconButton>

                                            <IconButton
                                                color="error"
                                                onClick={() => handleEliminar(p)}
                                                sx={{ ml: 1 }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                );
                            })
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}
