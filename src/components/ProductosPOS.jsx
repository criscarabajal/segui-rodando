// src/components/ProductosPOS.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, InputAdornment, IconButton, useTheme, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Slider from 'react-slick';
import Carrito from './Carrito';
import BottomNav from './BottomNav';
import { fetchProductos } from '../utils/fetchProductos';
import generarRemitoPDF from '../utils/generarRemito';
import generarPresupuestoPDF from '../utils/generarPresupuesto';
import generarSeguroPDF from '../utils/generarSeguro';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const defaultCats = [
  'LUCES','GRIPERIA','TELAS','CAMARAS','LENTES',
  'BATERIAS','MONITOREO','FILTROS','ACCESORIOS DE CAMARA','SONIDO'
];

// helper: ahora en formato "YYYY-MM-DDTHH:MM" para input datetime-local
const nowLocalDatetime = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

export default function ProductosPOS() {
  const theme = useTheme();
  const HEADER = 72;
  const FOOTER = 72;

  const CARD_HEIGHT = 180;
  const ROW_GAP = 16;
  const SLIDES_PER_ROW = 5;

  // ===== Pedido / separador =====
  const [pedidoNumero, setPedidoNumero] = useState('');
  const [comentario, setComentario] = useState('');
  const [grupoActual, setGrupoActual] = useState('');

  // ===== Categorías nav (editables) =====
  const [categoriasNav, setCategoriasNav] = useState(() => {
    const saved = localStorage.getItem('categoriasNav');
    return saved ? JSON.parse(saved) : defaultCats;
  });
  useEffect(() => { localStorage.setItem('categoriasNav', JSON.stringify(categoriasNav)); }, [categoriasNav]);
  const [openEditCats, setOpenEditCats] = useState(false);
  const handleOpenEditCats = () => setOpenEditCats(true);
  const handleCloseEditCats = () => setOpenEditCats(false);
  const handleCatChange = (idx, val) =>
    setCategoriasNav(c => { const cc=[...c]; cc[idx]=val; return cc; });

  // ===== Productos (fetch + agrupado por nombre con seriales) =====
  const [productosRaw, setProductosRaw] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isSliding, setIsSliding] = useState(false);
  useEffect(() => {
    fetchProductos()
      .then(raw => {
        setProductosRaw(raw);
        const grouped = raw.reduce((acc, p) => {
          if (!acc[p.nombre]) {
            acc[p.nombre] = {
              nombre: p.nombre,
              precio: p.precio,
              categoria: p.categoria,
              subcategoria: p.subcategoria,
              incluye: p.incluye,
              seriales: [],
              valorReposicion: p.valorReposicion,
            };
          }
          if (p.serial) acc[p.nombre].seriales.push(p.serial);
          if (typeof p.valorReposicion === 'number' &&
              p.valorReposicion > (acc[p.nombre].valorReposicion || 0)) {
            acc[p.nombre].valorReposicion = p.valorReposicion;
          }
          return acc;
        }, {});
        setProductos(Object.values(grouped));
      })
      .finally(() => setIsSliding(false));
  }, []);

  // ===== Filtros =====
  const [buscar, setBuscar] = useState('');
  const [favorita, setFavorita] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  useEffect(() => {
    setSugerencias(
      productos.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) &&
        (!favorita || p.categoria === favorita)
      )
    );
  }, [productos, buscar, favorita]);

  // ===== Slider =====
  const [rows, setRows] = useState(1);
  const sliderRef = useRef(null);
  useEffect(() => setIsSliding(false), []);
  const calcularFilas = useCallback(() => {
    const alto = window.innerHeight - HEADER - FOOTER - ROW_GAP;
    setRows(Math.max(1, Math.floor(alto / (CARD_HEIGHT + ROW_GAP))));
  }, [HEADER, FOOTER]);
  useEffect(() => {
    calcularFilas();
    window.addEventListener('resize', calcularFilas);
    return () => window.removeEventListener('resize', calcularFilas);
  }, [calcularFilas]);
  useEffect(() => { sliderRef.current?.slickGoTo(0); }, [buscar, favorita, rows, sugerencias.length]);
  const settings = {
    arrows: true, infinite: false, rows, slidesPerRow: SLIDES_PER_ROW, slidesToShow: 1, slidesToScroll: 1,
    speed: 600, cssEase: 'ease-in-out',
    beforeChange: (o, n) => o !== n && setIsSliding(true),
    afterChange: () => setIsSliding(false)
  };

  // ===== Carrito =====
  const [carrito, setCarrito] = useState(() => JSON.parse(localStorage.getItem('carrito') || '[]'));
  useEffect(() => { localStorage.setItem('carrito', JSON.stringify(carrito)); }, [carrito]);

  const agregarAlCarritoConSerial = (prod, serial) => {
    setCarrito(c => [
      ...c,
      {
        ...prod,
        serial,
        cantidad: 1,
        grupo: (grupoActual || '').trim(),
        valorReposicion: prod.valorReposicion,
      }
    ]);
  };

  // ===== Diálogo de serial =====
  const [openSerialDialog, setOpenSerialDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  const faltaGrupo = !(grupoActual || '').trim();

  const handleCardClick = (prod) => {
    if (isSliding) return;
    if (faltaGrupo) {
      alert('Primero ingresá un "Día / separador" en el carrito.');
      return;
    }

    const seriales = Array.isArray(prod.seriales) ? prod.seriales.filter(Boolean) : [];

    if (seriales.length === 0) {
      agregarAlCarritoConSerial(prod, '');
      return;
    }
    if (seriales.length === 1) {
      agregarAlCarritoConSerial(prod, seriales[0]);
      return;
    }

    setPendingProduct(prod);
    setOpenSerialDialog(true);
  };

  const handleSelectSerial = (serial) => {
    if (pendingProduct) agregarAlCarritoConSerial(pendingProduct, serial);
    setOpenSerialDialog(false);
    setPendingProduct(null);
  };

  // ===== Jornadas =====
  const [jornadasMap, setJornadasMap] = useState({});

  // ===== Cliente =====
  // ⬇️ Eliminamos DNI del formulario
  const initialClienteForm = { nombre: '', fechaRetiro: '', fechaDevolucion: '' };

  const [openCliente, setOpenCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState(
    JSON.parse(localStorage.getItem('cliente')) || initialClienteForm
  );
  const [cliente, setCliente] = useState(
    JSON.parse(localStorage.getItem('cliente')) || {}
  );

  // al abrir, si no hay fecha de retiro cargada, setear ahora
  const handleOpenCliente = () => {
    setClienteForm(prev => ({
      ...prev,
      fechaRetiro: prev.fechaRetiro || nowLocalDatetime()
    }));
    setOpenCliente(true);
  };

  const clearClienteForm = () => {
    setClienteForm(initialClienteForm);
  };
  const handleCloseCliente = () => {
    clearClienteForm();
    setOpenCliente(false);
  };

  const handleClienteChange = e => {
    const { name, value } = e.target;
    setClienteForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCliente = () => {
    const { nombre, fechaRetiro, fechaDevolucion } = clienteForm;
    if (!nombre || !fechaRetiro || !fechaDevolucion) {
      alert('Completá nombre, fecha de retiro y fecha de devolución');
      return;
    }
    localStorage.setItem('cliente', JSON.stringify(clienteForm));
    setCliente(clienteForm);
    setOpenCliente(false);
  };

  // ===== Generar PDFs =====
  const handleGenerarRemito = () => {
    if (!cliente?.nombre) { handleOpenCliente(); return; }
    const nro = String(pedidoNumero || '').trim();
    if (!nro) { alert('Ingresá un "Pedido N°" en el carrito para generar el Remito.'); return; }
    generarRemitoPDF(cliente, carrito, nro, nro, jornadasMap, comentario);
  };

  const handleGenerarPresupuesto = () => {
    if (!cliente?.nombre) { handleOpenCliente(); return; }
    const nro = String(pedidoNumero || '').trim();
    if (!nro) { alert('Ingresá un "Pedido N°" en el carrito para generar el Presupuesto.'); return; }
    const fecha = new Date().toLocaleDateString('es-AR');
    generarPresupuestoPDF(cliente, carrito, jornadasMap, fecha, nro);

    // limpiar cliente + inputs
    setClienteForm(initialClienteForm);
    setCliente({});
    localStorage.removeItem('cliente');

    // limpiar N° pedido y separador
    setPedidoNumero('');
    setComentario('');
    setGrupoActual('');
  };

  const handleGenerarSeguro = () => {
    if (!cliente.nombre) { handleOpenCliente(); return; }
    const fecha = new Date().toLocaleDateString('es-AR');
    generarSeguroPDF(cliente, carrito, fecha, pedidoNumero);
  };

  return (
    <Box>
      {/* Header búsqueda */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: HEADER, bgcolor: 'grey.900', display: 'flex', alignItems: 'center', px: 2, zIndex: 1200 }}>
        <TextField
          size="small" variant="outlined" placeholder="Buscar producto"
          value={buscar} onChange={e => setBuscar(e.target.value)}
          InputProps={{ endAdornment: (<InputAdornment position="end"><SearchIcon /></InputAdornment>) }}
          sx={{ width: '28vw', bgcolor: 'grey.800', borderRadius: 1 }}
        />
      </Box>

      {/* Carrito */}
      <Box sx={{ position: 'fixed', top: HEADER, bottom: FOOTER, left: 0, width: '30vw', p: 2, bgcolor: 'grey.900', overflowY: 'auto', zIndex: 1000 }}>
        <Carrito
          productosSeleccionados={carrito}
          onIncrementar={i => { const c=[...carrito]; c[i].cantidad++; setCarrito(c); }}
          onDecrementar={i => { const c=[...carrito]; if (c[i].cantidad>1) c[i].cantidad--; setCarrito(c); }}
          onCantidadChange={(i,v) => { const c=[...carrito]; c[i].cantidad = v===''? '' : Math.max(1, parseInt(v,10)); setCarrito(c); }}
          onEliminar={i => { const c=[...carrito]; c.splice(i,1); setCarrito(c); }}
          jornadasMap={jornadasMap}
          setJornadasMap={setJornadasMap}
          comentario={comentario}
          setComentario={setComentario}
          pedidoNumero={pedidoNumero}
          setPedidoNumero={setPedidoNumero}
          grupoActual={grupoActual}
          setGrupoActual={setGrupoActual}
          onClearAll={() => setCarrito([])}
        />
      </Box>

      {/* Productos + filtros */}
      <Box
        sx={{
          position: 'fixed',
          top: HEADER,
          bottom: FOOTER,
          left: '30vw',
          right: 0,
          bgcolor: 'grey.800',
          overflowY: 'auto',
          zIndex: 900
        }}
      >
        {/* Categorías */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1300, px: 1, py: 1, bgcolor: 'grey.800' }}>
          {!(grupoActual || '').trim() && (
            <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
              Ingresá un <strong>Día / separador</strong> en el carrito para poder agregar productos.
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={!favorita ? 'contained' : 'outlined'}
              onClick={() => setFavorita('')}
            >
              TODAS
            </Button>

            {categoriasNav.map((cat, i) => (
              <Button
                key={i}
                size="small"
                variant={favorita === cat ? 'contained' : 'outlined'}
                onClick={() => setFavorita(favorita === cat ? '' : cat)}
              >
                {cat}
              </Button>
            ))}

            <IconButton size="small" sx={{ ml: 'auto' }} onClick={handleOpenEditCats}>
              <MoreVertIcon sx={{ color: '#fff' }} />
            </IconButton>
          </Box>
        </Box>

        {/* Slider de productos */}
        <Slider ref={sliderRef} {...settings}>
          {sugerencias.map((p, i) => (
            <Box key={i} sx={{ px: 1, pb: `${ROW_GAP}px` }}>
              <Box
                onClick={() => handleCardClick(p)}
                sx={{
                  height: CARD_HEIGHT,
                  bgcolor: 'grey.700',
                  borderRadius: 1,
                  p: 1.5,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  cursor: (isSliding || !(grupoActual || '').trim()) ? 'not-allowed' : 'pointer',
                  opacity: !(grupoActual || '').trim() ? 0.6 : 1,
                  pointerEvents: isSliding ? 'none' : 'auto',
                  '&:hover': { bgcolor: !(isSliding || !(grupoActual || '').trim()) ? 'grey.600' : 'grey.700' }
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {p.nombre}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  ${(parseFloat(p.precio) || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Slider>
      </Box>

      {/* === Diálogo: Datos del cliente (sin DNI) === */}
      <Dialog open={openCliente} onClose={handleCloseCliente} maxWidth="sm" fullWidth>
        <DialogTitle>Datos del cliente</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Nombre"
              name="nombre"
              value={clienteForm.nombre}
              onChange={handleClienteChange}
              size="small"
              fullWidth
            />

            <TextField
              label="Fecha de retiro"
              name="fechaRetiro"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={clienteForm.fechaRetiro}
              onChange={handleClienteChange}
              size="small"
              fullWidth
            />

            <TextField
              label="Fecha de devolución"
              name="fechaDevolucion"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={clienteForm.fechaDevolucion}
              onChange={handleClienteChange}
              size="small"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCliente}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Editar categorías */}
      <Dialog open={openEditCats} onClose={handleCloseEditCats}>
        <DialogTitle>Editar categorías</DialogTitle>
        <DialogContent>
          {categoriasNav.map((cat, idx) => (
            <TextField
              key={idx}
              fullWidth
              size="small"
              variant="outlined"
              label={`Categoría ${idx + 1}`}
              value={cat}
              onChange={e => handleCatChange(idx, e.target.value)}
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditCats} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Bottom bar */}
      <BottomNav
        onOpenCliente={handleOpenCliente}
        onGenerarRemito={handleGenerarRemito}
        onGenerarPresupuesto={handleGenerarPresupuesto}
        onCancelar={() => setCarrito([])}
        onOpenSeguros={handleGenerarSeguro}
      />
    </Box>
  );
}
