// src/components/ProductosPOS.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  InputAdornment,
  IconButton,
  useTheme,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Slider from 'react-slick';
import Carrito from './Carrito';
import BottomNav from './BottomNav';
import ListaPedidosModal from './ListaPedidosModal';
import { fetchProductos } from '../utils/fetchProductos';
import generarRemitoPDF from '../utils/generarRemito';
import generarPresupuestoPDF from '../utils/generarPresupuesto';
import generarSeguroPDF from '../utils/generarSeguro';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import logoImg from '../assets/logo.png';
import {
  guardarPedidoFirebase,
  cargarPedidoFirebase,
} from "../services/pedidosService";


const defaultCats = [
  'LUCES',
  'GRIPERIA',
  'TELAS',
  'CAMARAS',
  'LENTES',
  'BATERIAS',
  'MONITOREO',
  'FILTROS',
  'ACCESORIOS DE CAMARA',
  'SONIDO',
];

export default function ProductosPOS({ usuario }) {

  // ===== Descuento =====
  const [discount, setDiscount] = useState('0');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const handleGuardarPedido = async () => {
    const nro = String(pedidoNumero || "").trim();
    if (!nro) {
      alert('Ingresá un "Pedido N°" para guardar.');
      return;
    }
    if (carrito.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    // Calcular total para guardar
    const totalConJornadas = carrito.reduce((sum, item, idx) => {
      const qty = parseInt(item.cantidad, 10) || 0;
      const j = parseInt(jornadasMap[idx], 10) || 1;
      const price = parseFloat(item.precio) || 0;
      return sum + qty * price * j;
    }, 0);
    const totalFinal = totalConJornadas * (1 - appliedDiscount / 100);

    try {
      await guardarPedidoFirebase({
        pedidoNumero: nro,
        cliente: clienteForm,
        carrito,
        jornadasMap,
        usuario,
        descuento: appliedDiscount, // Guardamos el valor numérico
        descuentoLabel: discount,   // Guardamos la selección del UI (opcional)
        totalFinal,                 // Guardamos el total calculado
      });
      alert("Pedido guardado correctamente ☁️");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el pedido. Ver consola.");
    }
  };

  const handleCargarPedido = async () => {
    const nro = String(pedidoNumero || "").trim();
    if (!nro) {
      alert('Ingresá un "Pedido N°" para cargar.');
      return;
    }
    try {
      const data = await cargarPedidoFirebase(nro);
      if (!data) {
        alert("No se encontró ningún pedido con ese número.");
        return;
      }
      setClienteForm(data.cliente || initialClienteForm);
      setCarrito(data.carrito || []);
      setJornadasMap(data.jornadasMap || {});
      setAppliedDiscount(data.descuento || 0);
      setDiscount(data.descuentoLabel || '0');
      setGrupoActual("");
      alert("Pedido cargado correctamente ✅");
    } catch (err) {
      console.error(err);
      alert("Error al cargar el pedido. Ver consola.");
    }
  };

  // ===== Lista de pedidos Modal =====
  const [openListaPedidos, setOpenListaPedidos] = useState(false);
  const handleOpenListaPedidos = () => setOpenListaPedidos(true);
  const handleCloseListaPedidos = () => setOpenListaPedidos(false);

  const handleSeleccionarPedidoDesdeLista = (pedido) => {
    if (!pedido) return;
    setPedidoNumero(pedido.pedidoNumero || "");
    setClienteForm(pedido.cliente || initialClienteForm);
    setCarrito(pedido.carrito || []);
    setJornadasMap(pedido.jornadasMap || {});
    setAppliedDiscount(pedido.descuento || 0);
    setDiscount(pedido.descuentoLabel || '0');
    setGrupoActual("");
    // alert("Pedido cargado correctamente ✅");
  };

  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));

  const HEADER = 72;
  const FOOTER = 72;
  const CARD_HEIGHT = 180;
  const ROW_GAP = 16;

  // 🔥 Columnas dinámicas
  const SLIDES_PER_ROW = isSmall ? 3 : isTablet ? 4 : 5;

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  // ===== Pedido / separador =====
  const [pedidoNumero, setPedidoNumero] = useState('');
  const [grupoActual, setGrupoActual] = useState('');

  // ===== Categorías nav (editables) =====
  const [categoriasNav, setCategoriasNav] = useState(() => {
    const saved = localStorage.getItem('categoriasNav');
    return saved ? JSON.parse(saved) : defaultCats;
  });
  useEffect(() => {
    localStorage.setItem('categoriasNav', JSON.stringify(categoriasNav));
  }, [categoriasNav]);

  const [openEditCats, setOpenEditCats] = useState(false);
  const handleOpenEditCats = () => setOpenEditCats(true);
  const handleCloseEditCats = () => setOpenEditCats(false);
  const handleCatChange = (idx, val) =>
    setCategoriasNav((c) => {
      const cc = [...c];
      cc[idx] = val;
      return cc;
    });

  // ===== Productos =====
  const [productosRaw, setProductosRaw] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    fetchProductos()
      .then((raw) => {
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
          if (
            typeof p.valorReposicion === 'number' &&
            p.valorReposicion > (acc[p.nombre].valorReposicion || 0)
          ) {
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
      productos.filter(
        (p) =>
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
    // Calculamos el alto disponible restando Header y Footer
    // En Flexbox el height es manejado dinámicamente, pero para calcular filas necesitamos saber el espacio disponible.
    // Como el contenedor tiene flex: 1, tomará (window.height - HEADER - FOOTER).
    const alto = window.innerHeight - HEADER - FOOTER - ROW_GAP;
    setRows(Math.max(1, Math.floor(alto / (CARD_HEIGHT + ROW_GAP))));
  }, [HEADER, FOOTER]);

  useEffect(() => {
    calcularFilas();
    window.addEventListener('resize', calcularFilas);
    return () => window.removeEventListener('resize', calcularFilas);
  }, [calcularFilas]);

  useEffect(() => {
    sliderRef.current?.slickGoTo(0);
  }, [buscar, favorita, rows, sugerencias.length]);

  const settings = {
    arrows: true,
    infinite: false,
    rows,
    slidesPerRow: SLIDES_PER_ROW,
    slidesToShow: 1,
    slidesToScroll: 1,
    speed: 600,
    cssEase: 'ease-in-out',
    beforeChange: (o, n) => o !== n && setIsSliding(true),
    afterChange: () => setIsSliding(false),
  };

  // ===== Carrito =====
  const [carrito, setCarrito] = useState(() =>
    JSON.parse(localStorage.getItem('carrito') || '[]')
  );
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarritoConSerial = (prod, serial) => {
    setCarrito((c) => [
      ...c,
      {
        ...prod,
        serial,
        cantidad: 1,
        grupo: (grupoActual || '').trim(),
        valorReposicion: prod.valorReposicion,
      },
    ]);
  };

  // ===== Diálogo de serial =====
  const [openSerialDialog, setOpenSerialDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [selectedSerial, setSelectedSerial] = useState('');

  const handleCardClick = (prod) => {
    if (isSliding) return;
    const seriales = Array.isArray(prod.seriales) ? prod.seriales : [];
    if (seriales.length === 0) {
      agregarAlCarritoConSerial(prod, '');
      return;
    }
    if (seriales.length === 1) {
      agregarAlCarritoConSerial(prod, seriales[0]);
      return;
    }
    setPendingProduct(prod);
    setSelectedSerial(seriales[0] || '');
    setOpenSerialDialog(true);
  };

  const handleConfirmSerial = () => {
    if (pendingProduct) {
      agregarAlCarritoConSerial(pendingProduct, selectedSerial || '');
    }
    setOpenSerialDialog(false);
    setPendingProduct(null);
    setSelectedSerial('');
  };

  const handleCloseSerialDialog = () => {
    setOpenSerialDialog(false);
    setPendingProduct(null);
    setSelectedSerial('');
  };

  // ===== Jornadas =====
  const [jornadasMap, setJornadasMap] = useState({});

  // ===== Cliente =====
  const initialClienteForm = {
    nombre: '',
    fechaRetiro: '',
    fechaDevolucion: '',
  };
  const [openCliente, setOpenCliente] = useState(false);
  const handleOpenCliente = () => setOpenCliente(true);
  const handleCloseCliente = () => setOpenCliente(false);
  const [clienteForm, setClienteForm] = useState(initialClienteForm);
  const [cliente, setCliente] = useState({});
  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setClienteForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleSaveCliente = () => {
    setCliente(clienteForm);
    setOpenCliente(false);
  };

  // ===== Generar PDFs =====
  const handleGenerarRemito = () => {
    const nro = String(pedidoNumero || '').trim();
    if (!nro) {
      alert('Ingresá un "Pedido N°" en el carrito para generar el Remito.');
      return;
    }
    const clienteParaPDF = { ...clienteForm, nombre: (clienteForm.nombre || '').trim() };
    generarRemitoPDF(clienteParaPDF, carrito, nro, nro, jornadasMap);
  };

  const handleGenerarPresupuesto = async () => {
    const nro = String(pedidoNumero || '').trim();
    if (!nro) {
      alert('Ingresá un "Pedido N°" en el carrito para generar el Presupuesto.');
      return;
    }
    if (carrito.length === 0) {
      alert('El carrito está vacío.');
      return;
    }
    const fecha = new Date().toLocaleDateString('es-AR');
    const clienteParaPDF = { ...clienteForm, nombre: (clienteForm.nombre || '').trim() };

    try {
      await guardarPedidoFirebase({
        pedidoNumero: nro,
        cliente: clienteForm,
        carrito,
        jornadasMap,
        usuario,
        tipo: 'presupuesto',
        fechaCreacion: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      alert('Error al guardar el pedido en Firebase.');
      return;
    }

    alert('Pedido guardado. Generando presupuesto');
    generarPresupuestoPDF(clienteParaPDF, carrito, jornadasMap, fecha, nro);
    setJornadasMap({});
  };

  const handleGenerarSeguro = () => {
    const nro = String(pedidoNumero || '').trim();
    if (!nro) {
      alert('Ingresá un "Pedido N°" en el carrito para generar el Seguro.');
      return;
    }
    const fecha = new Date().toLocaleDateString('es-AR');
    const clienteParaPDF = { ...clienteForm, nombre: (clienteForm.nombre || '').trim() };
    generarSeguroPDF(clienteParaPDF, carrito, fecha, nro, nro, jornadasMap);
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'grey.900',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HEADER: (Fixed height) */}
      <Box
        sx={{
          height: HEADER,
          bgcolor: 'grey.900',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          zIndex: 1200,
          borderBottom: '1px solid #333'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '1920px',
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Izquierda: Nombre + Fechas */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Nombre"
              value={clienteForm.nombre || ''}
              onChange={(e) =>
                setClienteForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 140,
                maxWidth: 220,
                bgcolor: 'grey.800',
                borderRadius: 1,
                '& .MuiOutlinedInput-input': { color: '#fff' },
                '& .MuiInputLabel-root': { color: '#bbb' },
              }}
            />
            <TextField
              size="small"
              variant="outlined"
              type="datetime-local"
              label="Retiro"
              name="fechaRetiro"
              InputLabelProps={{ shrink: true }}
              value={clienteForm.fechaRetiro || ''}
              onChange={handleClienteChange}
              sx={{
                minWidth: 170,
                maxWidth: 210,
                bgcolor: 'grey.800',
                borderRadius: 1,
                '& .MuiOutlinedInput-input': { color: '#fff', fontSize: '0.75rem' },
                '& .MuiInputLabel-root': { color: '#bbb' },
              }}
            />
            <TextField
              size="small"
              variant="outlined"
              type="datetime-local"
              label="Devolución"
              name="fechaDevolucion"
              InputLabelProps={{ shrink: true }}
              value={clienteForm.fechaDevolucion || ''}
              onChange={handleClienteChange}
              sx={{
                minWidth: 170,
                maxWidth: 210,
                bgcolor: 'grey.800',
                borderRadius: 1,
                '& .MuiOutlinedInput-input': { color: '#fff', fontSize: '0.75rem' },
                '& .MuiInputLabel-root': { color: '#bbb' },
              }}
            />
          </Box>

          {/* Derecha: Buscador + Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Buscar"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: isTablet ? '160px' : '20vw',
                minWidth: 150,
                maxWidth: 350,
                bgcolor: 'grey.800',
                borderRadius: 1,
                marginRight: '3px',
              }}
            />
            <img
              src={logoImg}
              alt="logo"
              style={{ height: '65px', opacity: 0.9 }}
            />
          </Box>
        </Box>
      </Box>

      {/* MAIN CONTENT AREA: Flex Row (Carrito + Productos) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Carrito: Ancho responsivo */}
        <Box
          sx={{
            width: isSmall ? '40%' : isTablet ? '35%' : '30%',
            minWidth: '320px',
            bgcolor: 'grey.900',
            overflowY: 'auto',
            borderRight: '1px solid #333',
            pb: `${FOOTER}px`,
          }}
        >
          <Carrito
            productosSeleccionados={carrito}
            onIncrementar={(i) => {
              const c = [...carrito];
              c[i].cantidad++;
              setCarrito(c);
            }}
            onDecrementar={(i) => {
              const c = [...carrito];
              if (c[i].cantidad > 1) c[i].cantidad--;
              setCarrito(c);
            }}
            onCantidadChange={(i, v) => {
              const c = [...carrito];
              c[i].cantidad = v === '' ? '' : Math.max(1, parseInt(v, 10));
              setCarrito(c);
            }}
            onEliminar={(i) => {
              const c = [...carrito];
              c.splice(i, 1);
              setCarrito(c);
              setJornadasMap((prev) => {
                const next = {};
                Object.keys(prev).forEach((kStr) => {
                  const k = parseInt(kStr, 10);
                  if (Number.isNaN(k)) return;
                  if (k < i) {
                    next[k] = prev[k];
                  } else if (k > i) {
                    next[k - 1] = prev[k];
                  }
                });
                return next;
              });
            }}
            jornadasMap={jornadasMap}
            setJornadasMap={setJornadasMap}
            pedidoNumero={pedidoNumero}
            setPedidoNumero={setPedidoNumero}
            setGrupoActual={setGrupoActual}
            discount={discount}
            setDiscount={setDiscount}
            appliedDiscount={appliedDiscount}
            setAppliedDiscount={setAppliedDiscount}
            onClearAll={() => {
              setCarrito([]);
              setJornadasMap({});
              setAppliedDiscount(0);
              setDiscount('0');
            }}
          />
        </Box>

        {/* Productos + filtros: Ocupa el resto */}
        <Box
          sx={{
            flex: 1,
            bgcolor: 'grey.800',
            overflowY: 'auto',
            position: 'relative',
            pb: `${FOOTER}px`
          }}
        >
          {/* Categorías (Sticky) */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1300,
              px: 1,
              py: 1,
              bgcolor: 'grey.800',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
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
              <IconButton
                size="small"
                sx={{ ml: 'auto' }}
                onClick={handleOpenEditCats}
              >
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
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: isSliding ? 'not-allowed' : 'pointer',
                    opacity: isSliding ? 0.6 : 1,
                    pointerEvents: isSliding ? 'none' : 'auto',
                    '&:hover': { bgcolor: 'grey.600' },
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.2,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
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
      </Box>

      {/* EDITAR CATEGORÍAS */}
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
              onChange={(e) => handleCatChange(idx, e.target.value)}
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditCats} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* CLIENTE */}
      <Dialog open={openCliente} onClose={handleCloseCliente} fullWidth maxWidth="md">
        <DialogTitle>Datos del Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                name="fechaRetiro"
                label="Fecha Retiro"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={clienteForm.fechaRetiro || ''}
                onChange={handleClienteChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                name="fechaDevolucion"
                label="Fecha Devolución"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={clienteForm.fechaDevolucion || ''}
                onChange={handleClienteChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveCliente} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* SERIAL */}
      <Dialog open={openSerialDialog} onClose={handleCloseSerialDialog}>
        <DialogTitle>Seleccionar N° de Serie</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{pendingProduct?.nombre}</Typography>
          <RadioGroup value={selectedSerial} onChange={(e) => setSelectedSerial(e.target.value)}>
            {(pendingProduct?.seriales || []).map((s, idx) => (
              <FormControlLabel key={idx} value={s} control={<Radio />} label={s} />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSerialDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmSerial} disabled={!selectedSerial}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL LISTA PEDIDOS */}
      <ListaPedidosModal
        open={openListaPedidos}
        onClose={handleCloseListaPedidos}
        onSelectPedido={handleSeleccionarPedidoDesdeLista}
      />

      {/* Footer / BottomNav */}
      <BottomNav
        onOpenCliente={handleOpenCliente}
        onGenerarRemito={handleGenerarRemito}
        onGenerarPresupuesto={handleGenerarPresupuesto}
        onGenerarSeguro={handleGenerarSeguro}
        onGuardarPedido={handleGuardarPedido}
        onCargarPedido={handleCargarPedido}
        onVerTodosPedidos={handleOpenListaPedidos}
        onCancelar={() => {
          if (window.confirm('¿Cancela pedido?')) {
            setCarrito([]);
            setCliente({});
            setClienteForm(initialClienteForm);
            setPedidoNumero('');
            setJornadasMap({});
            setGrupoActual('');
            setAppliedDiscount(0);
            setDiscount('0');
            localStorage.clear();
            window.location.reload();
          }
        }}
      />
    </Box>
  );
}
