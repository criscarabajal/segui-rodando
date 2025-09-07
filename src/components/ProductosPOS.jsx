// src/components/ProductosPOS.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  useTheme,
  Typography,
  Grid,
  MenuItem,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Slider from 'react-slick';
import Carrito from './Carrito';
import BottomNav from './BottomNav';
import { fetchProductos } from '../utils/fetchProductos';
import generarRemitoPDF, { generarNumeroRemito } from '../utils/generarRemito';
import generarPresupuestoPDF, { generarNumeroPresupuesto } from '../utils/generarPresupuesto';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import generarSeguroPDF, { generarNumeroSeguro } from '../utils/generarSeguro';

const defaultCats = [
  'LUCES','GRIPERIA','TELAS','CAMARAS',
  'LENTES','BATERIAS','MONITOREO','FILTROS',
  'ACCESORIOS DE CAMARA','SONIDO'
];

export default function ProductosPOS() {
  const theme = useTheme();
  const HEADER = parseInt(theme.spacing(9), 10);
  const FOOTER = parseInt(theme.spacing(9), 10);
  const CARD_HEIGHT = 180;
  const ROW_GAP = 16;
  const SLIDES_PER_ROW = 5;

  // comentario / notas del pedido (persistente)
  const [comentario, setComentario] = useState(() => localStorage.getItem('comentario') || '');
  useEffect(() => { localStorage.setItem('comentario', comentario); }, [comentario]);

  // 🔹 Grupo actual (ej: "Lunes", "Martes", etc.)
  const [grupoActual, setGrupoActual] = useState('');

  // pedido número y jornadas
  const [pedidoNumero, setPedidoNumero] = useState('');
  const [jornadasMap, setJornadasMap] = useState({});

  // carrito
  const [carrito, setCarrito] = useState(() => JSON.parse(localStorage.getItem('carrito') || '[]'));
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  // cliente
  const initialClienteForm = { nombre:'', apellido:'', telefono:'', correo:'', fechaRetiro:'', fechaDevolucion:'', dni:'' };
  const [clienteForm, setClienteForm] = useState(JSON.parse(localStorage.getItem('cliente')) || initialClienteForm);
  const [cliente, setCliente] = useState(JSON.parse(localStorage.getItem('cliente')) || {});
  const [openCliente, setOpenCliente] = useState(false);
  const handleOpenCliente = () => setOpenCliente(true);
  const clearClienteForm = () => setClienteForm(initialClienteForm);
  const handleCloseCliente = () => { clearClienteForm(); setOpenCliente(false); };
  const handleClienteChange = e => { const { name, value } = e.target; setClienteForm(prev=>({ ...prev, [name]: value })); };
  const handleSaveCliente = () => {
    const { nombre, apellido, dni, fechaRetiro, fechaDevolucion } = clienteForm;
    if (!nombre || !apellido || !dni || !fechaRetiro || !fechaDevolucion) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    localStorage.setItem('cliente', JSON.stringify(clienteForm));
    setCliente(clienteForm);
    setOpenCliente(false);
  };

  // generar documentos
  const handleGenerarRemito = () => {
    if (!cliente.nombre) { handleOpenCliente(); return; }
    const num = generarNumeroRemito();
    // (cliente, items, atendidoPor, numeroRemito, pedidoNumero, jornadasMap, comentario)
    generarRemitoPDF(cliente, carrito, '', num, pedidoNumero, jornadasMap, comentario);
  };
  const handleGenerarPresupuesto = () => {
    if (!cliente.nombre) { handleOpenCliente(); return; }
    const num = generarNumeroPresupuesto();
    generarPresupuestoPDF(cliente, carrito, jornadasMap, num, pedidoNumero, jornadasMap);
  };
  const handleGenerarSeguro = () => {
    if (!cliente.nombre) { handleOpenCliente(); return; }
    const num = generarNumeroSeguro();
    generarSeguroPDF(cliente, carrito, num, pedidoNumero, jornadasMap);
  };

  // categorías
  const [categoriasNav, setCategoriasNav] = useState(() => {
    const saved = localStorage.getItem('categoriasNav');
    return saved ? JSON.parse(saved) : defaultCats;
  });
  useEffect(() => { localStorage.setItem('categoriasNav', JSON.stringify(categoriasNav)); }, [categoriasNav]);
  const [openEditCats, setOpenEditCats] = useState(false);
  const handleOpenEditCats = () => setOpenEditCats(true);
  const handleCloseEditCats = () => setOpenEditCats(false);
  const handleCatChange = (idx, val) => { const cp = [...categoriasNav]; cp[idx] = val; setCategoriasNav(cp); };

  // fetch and group productos
  const [productosRaw, setProductosRaw] = useState([]);
  const [productos, setProductos] = useState([]);
  useEffect(() => {
    fetchProductos()
      .then(raw => {
        setProductosRaw(raw);
        const grouped = raw.reduce((acc, p) => {
          if (!acc[p.nombre]) acc[p.nombre] = { ...p, seriales: [] };
          if (p.serial) acc[p.nombre].seriales.push(p.serial);
          return acc;
        }, {});
        setProductos(Object.values(grouped));
      })
      .catch(console.error);
  }, []);

  // filtros
  const [buscar, setBuscar] = useState('');
  const [favorita, setFavorita] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  useEffect(() => {
    setSugerencias(
      productos.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) &&
        (!favorita || p.categoria === favorita) &&
        (!subcategoria || p.subcategoria === subcategoria)
      )
    );
  }, [productos, buscar, favorita, subcategoria]);

  // slider
  const [rows, setRows] = useState(1);
  const sliderRef = useRef(null);
  const calcularFilas = useCallback(() => {
    const alto = window.innerHeight - HEADER - FOOTER - ROW_GAP;
    setRows(Math.max(1, Math.floor(alto / (CARD_HEIGHT + ROW_GAP))));
  }, [HEADER, FOOTER]);
  useEffect(() => { calcularFilas(); window.addEventListener('resize', calcularFilas); return () => window.removeEventListener('resize', calcularFilas); }, [calcularFilas]);
  useEffect(() => { sliderRef.current?.slickGoTo(0); }, [buscar, favorita, subcategoria, rows, sugerencias.length]);
  const settings = { arrows: true, infinite: false, rows, slidesPerRow: SLIDES_PER_ROW, slidesToShow: 1, slidesToScroll: 1, speed: 600, cssEase: 'ease-in-out' };

  // diálogo de serial
  const [openSerialDialog, setOpenSerialDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // 🔒 NO permitir agregar productos si no hay un día elegido (grupoActual vacío)
  const canAddToDay = Boolean((grupoActual || '').trim());

  const handleCardClick = (prod) => {
    if (!canAddToDay) {
      alert('Primero elegí un día (por ejemplo: Lunes) y luego agregá productos en ese día.');
      return;
    }
    setPendingProduct(prod);
    setOpenSerialDialog(true);
  };

  const handleSelectSerial = (serial) => {
    if (pendingProduct) {
      setCarrito(c => [
        ...c,
        { ...pendingProduct, serial, cantidad: 1, grupo: (grupoActual || '').trim() } // guarda el día activo
      ]);
      setPendingProduct(null);
    }
    setOpenSerialDialog(false);
  };

  return (
    <Box>
      {/* HEADER búsqueda */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: HEADER, bgcolor: 'grey.900', display: 'flex', alignItems: 'center', px: 2, zIndex: 1200 }}>
        <TextField
          size="small"
          placeholder="Buscar producto"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          InputProps={{ endAdornment: <InputAdornment position="end"><SearchIcon/></InputAdornment> }}
          sx={{ width: '28vw', bgcolor: 'grey.800', borderRadius: 1 }}
        />
      </Box>

      {/* CARRITO 40% */}
      <Box sx={{ position: 'fixed', top: HEADER, bottom: FOOTER, left: 0, width: '40vw', p: 2, bgcolor: 'grey.900', overflowY: 'auto', zIndex: 1000 }}>
        <Carrito
          productosSeleccionados={carrito}
          onIncrementar={i => { const c=[...carrito]; c[i].cantidad++; setCarrito(c); }}
          onDecrementar={i => { const c=[...carrito]; if(c[i].cantidad>1)c[i].cantidad--; setCarrito(c); }}
          onCantidadChange={(i,v) => { const c=[...carrito]; c[i].cantidad=v===''?'':Math.max(1, parseInt(v,10)); setCarrito(c); }}
          onEliminar={i => { const c=[...carrito]; c.splice(i,1); setCarrito(c); }}
          jornadasMap={jornadasMap}
          setJornadasMap={setJornadasMap}
          pedidoNumero={pedidoNumero}
          setPedidoNumero={setPedidoNumero}
          comentario={comentario}
          setComentario={setComentario}
          onClearAll={() => setCarrito([])}
          // grupo actual
          grupoActual={grupoActual}
          setGrupoActual={setGrupoActual}
        />
      </Box>

      {/* PRODUCTOS 60% */}
      <Box sx={{ position: 'fixed', top: HEADER, bottom: FOOTER, left: '40vw', right: 0, bgcolor: 'grey.800', overflowY: 'auto' }}>

        {/* 🔔 Aviso sticky hasta que se elija un día */}
        {!canAddToDay && (
          <Box sx={{ position: 'sticky', top: 0, zIndex: 1300, px: 1, pt: 1, bgcolor: 'grey.800' }}>
            <Alert severity="info" variant="outlined" sx={{ borderColor: 'primary.main' }}>
              Primero escribí un <b>día</b> en el carrito (ej: “Lunes”) y después agregá productos a ese día.
            </Alert>
          </Box>
        )}

        {/* filtros de categorías */}
        <Box sx={{ position: 'sticky', top: !canAddToDay ? 64 : 0, py: 1, px: 1, bgcolor: 'grey.800', zIndex: 1200, transition: 'top .2s' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: favorita ? 1 : 0 }}>
            <Button size="small" variant={!favorita?'contained':'outlined'} onClick={() => { setFavorita(''); setSubcategoria(''); }}>Todas</Button>
            {categoriasNav.map((cat,i) => (
              <Button key={i} size="small" variant={favorita===cat?'contained':'outlined'} onClick={() => { setFavorita(favorita===cat?'':cat); setSubcategoria(''); }}>{cat}</Button>
            ))}
            <IconButton size="small" sx={{ ml: 'auto' }} onClick={handleOpenEditCats}><MoreVertIcon sx={{ color: '#fff' }}/></IconButton>
          </Box>
          {productosRaw.filter(p => p.categoria===favorita).length>0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 1, py: 0.5, bgcolor: 'grey.700', borderLeft: `4px solid ${theme.palette.primary.main}` }}>
              <Button size="small" variant={!subcategoria?'contained':'outlined'} onClick={() => setSubcategoria('')}>Todas</Button>
              {Array.from(new Set(productosRaw.filter(p => p.categoria===favorita).map(p => p.subcategoria))).map((sub,i) => (
                <Button key={i} size="small" variant={subcategoria===sub?'contained':'outlined'} onClick={() => setSubcategoria(sub)}>{sub}</Button>
              ))}
            </Box>
          )}
        </Box>

        {/* Slider */}
        <Slider ref={sliderRef} {...settings}>
          {sugerencias.map((p,i) => (
            <Box key={i} sx={{ px: 1, pb: `${ROW_GAP}px` }}>
              <Box
                onClick={() => handleCardClick(p)}
                sx={{
                  height: CARD_HEIGHT,
                  bgcolor: 'grey.700',
                  borderRadius: 1,
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  // 🔒 bloquea interacción y baja opacidad si no hay día elegido
                  cursor: canAddToDay ? 'pointer' : 'not-allowed',
                  opacity: canAddToDay ? 1 : 0.5,
                  pointerEvents: canAddToDay ? 'auto' : 'none',
                  '&:hover': { bgcolor: canAddToDay ? 'grey.600' : 'grey.700' }
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{p.nombre}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>${(parseFloat(p.precio)||0).toFixed(2)}</Typography>
              </Box>
            </Box>
          ))}
        </Slider>
      </Box>

      {/* Editar categorías */}
      <Dialog open={openEditCats} onClose={handleCloseEditCats}>
        <DialogTitle>Editar categorías</DialogTitle>
        <DialogContent>
          {categoriasNav.map((cat,idx) => (
            <TextField key={idx} fullWidth size="small" variant="outlined" label={`Categoría ${idx+1}`} value={cat} onChange={e => handleCatChange(idx,e.target.value)} sx={{ mb: 2 }}/>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseEditCats}>Guardar</Button></DialogActions>
      </Dialog>

      {/* Diálogo selección de serial */}
      <Dialog open={openSerialDialog} onClose={() => setOpenSerialDialog(false)}>
        <DialogTitle>Seleccionar serial</DialogTitle>
        <DialogContent>
          {pendingProduct?.seriales?.length > 0 ? (
            pendingProduct.seriales.map(s => (
              <MenuItem key={s} onClick={() => handleSelectSerial(s)}>{s}</MenuItem>
            ))
          ) : (
            <MenuItem disabled>No hay seriales</MenuItem>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenSerialDialog(false)}>Cancelar</Button></DialogActions>
      </Dialog>

      {/* Diálogo Datos del Cliente */}
      <Dialog open={openCliente} onClose={handleCloseCliente} fullWidth maxWidth="md">
        <DialogTitle>Datos del Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {['nombre','apellido','telefono','correo'].map(f => (
              <Grid item xs={12} sm={6} key={f}>
                <TextField fullWidth size="small" variant="outlined" name={f} label={f.charAt(0).toUpperCase()+f.slice(1)} value={clienteForm[f]||''} onChange={handleClienteChange}/>
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" variant="outlined" name="fechaRetiro" label="Fecha Retiro" type="datetime-local" InputLabelProps={{ shrink:true }} value={clienteForm.fechaRetiro||''} onChange={handleClienteChange}/>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" variant="outlined" name="fechaDevolucion" label="Fecha Devolución" type="datetime-local" InputLabelProps={{ shrink:true }} value={clienteForm.fechaDevolucion||''} onChange={handleClienteChange}/>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" variant="outlined" name="dni" label="DNI" value={clienteForm.dni||''} onChange={handleClienteChange}/>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={clearClienteForm}>Borrar todo</Button>
          <Button onClick={handleCloseCliente}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNav
        onOpenCliente={handleOpenCliente}
        onGenerarRemito={handleGenerarRemito}
        onGenerarPresupuesto={handleGenerarPresupuesto}
        onGenerarSeguro={handleGenerarSeguro}
        onCancelar={() => setCarrito([])}
      />
    </Box>
  );
}
