// src/components/ProductosPOS.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';
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
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Slider from 'react-slick';
import Carrito from './Carrito';
import BottomNav from './BottomNav';
import { fetchProductos } from '../utils/fetchProductos';
import generarRemitoPDF, { generarNumeroRemito } from '../utils/generarRemito';
import generarPresupuestoPDF, {
  generarNumeroPresupuesto
} from '../utils/generarPresupuesto';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

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
  'SONIDO'
];

export default function ProductosPOS() {
  const theme = useTheme();
  const HEADER = parseInt(theme.spacing(9), 10);
  const FOOTER = parseInt(theme.spacing(9), 10);
  const CARD_HEIGHT = 180;
  const ROW_GAP = 16;
  const SLIDES_PER_ROW = 5;

  // inicialización categorías
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
  const handleCatChange = (idx, val) => {
    setCategoriasNav(cats => {
      const copy = [...cats];
      copy[idx] = val;
      return copy;
    });
  };

  // cargar y agrupar productos
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
              seriales: []
            };
          }
          if (p.serial) acc[p.nombre].seriales.push(p.serial);
          return acc;
        }, {});
        setProductos(Object.values(grouped));
      })
      .finally(() => setIsSliding(false));
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

  // slider responsivo
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
  useEffect(() => {
    sliderRef.current?.slickGoTo(0);
  }, [buscar, favorita, subcategoria, rows, sugerencias.length]);
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
    afterChange: () => setIsSliding(false)
  };

  // carrito
  const [carrito, setCarrito] = useState(() =>
    JSON.parse(localStorage.getItem('carrito') || '[]')
  );
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);
  const agregarAlCarritoConSerial = (prod, serial) => {
    setCarrito(c => [...c, { ...prod, serial, cantidad: 1 }]);
  };

  // diálogo selección de serial
  const [openSerialDialog, setOpenSerialDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const handleCardClick = prod => {
    setPendingProduct(prod);
    setOpenSerialDialog(true);
  };
  const handleSelectSerial = serial => {
    if (pendingProduct) {
      agregarAlCarritoConSerial(pendingProduct, serial);
    }
    setOpenSerialDialog(false);
    setPendingProduct(null);
  };

  // jornadas
  const [jornadasMap, setJornadasMap] = useState({});

  // diálogo cliente
  const initialClienteForm = {
    nombre: '',
    dni: '',
    fechaRetiro: '',
    fechaDevolucion: ''
  };
  const [openCliente, setOpenCliente] = useState(false);
  const handleOpenCliente = () => setOpenCliente(true);
  const clearClienteForm = () => {
    setClienteForm(initialClienteForm);
    setDniInput('');
    setClientSuggestion('');
  };
  const handleCloseCliente = () => {
    clearClienteForm();
    setOpenCliente(false);
  };
  const [clienteForm, setClienteForm] = useState(
    JSON.parse(localStorage.getItem('cliente')) || initialClienteForm
  );
  const [cliente, setCliente] = useState(
    JSON.parse(localStorage.getItem('cliente')) || {}
  );
  const [dniInput, setDniInput] = useState(clienteForm.dni || '');
  const [clientSuggestion, setClientSuggestion] = useState('');
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    const sheetId = '1DhpNyUyM-sTHuoucELtaDP3Ul5-JemSrw7uhnhohMZc';
    const gid = '888837097';
    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tq=${encodeURIComponent('SELECT *')}`)
      .then(r => r.text())
      .then(txt => {
        const json = JSON.parse(txt.slice(txt.indexOf('(') + 1, -2));
        const cols = json.table.cols.map(c => c.label.trim());
        const idx = {
          nombre: cols.findIndex(l => /nombre/i.test(l)),
          apellido: cols.findIndex(l => /apellido/i.test(l)),
          dni: cols.findIndex(l => /dni/i.test(l)),
          telefono: cols.findIndex(l => /telefono/i.test(l)),
          email: cols.findIndex(l => /email/i.test(l))
        };
        setClientes(json.table.rows.map(r => ({
          nombre: r.c[idx.nombre]?.v || '',
          apellido: r.c[idx.apellido]?.v || '',
          dni: String(r.c[idx.dni]?.v || ''),
          telefono: String(r.c[idx.telefono]?.v || ''),
          correo: r.c[idx.email]?.v || ''
        })));
      })
      .catch(console.error);
  }, []);

  const handleClientSearch = () => {
    const clean = dniInput.replace(/\D/g, '');
    const found = clientes.find(c => c.dni.replace(/\D/g, '') === clean);
    if (found) {
      setClientSuggestion(`Coincidencia: ${found.nombre} ${found.apellido}`);
      // Cargamos lo que venga, aunque nuestro formulario solo guarda algunos campos
      setClienteForm(prev => ({
        ...prev,
        nombre: found.nombre || '',
        dni: found.dni || ''
      }));
    } else {
      setClientSuggestion('No se encontraron coincidencias');
    }
  };
  const handleClienteChange = e => {
    const { name, value } = e.target;
    if (name === 'dni') setDniInput(value);
    setClienteForm(prev => ({ ...prev, [name]: value }));
    setClientSuggestion('');
  };
  const handleSaveCliente = () => {
    const { nombre, dni, fechaRetiro, fechaDevolucion } = clienteForm;
    if (!nombre || !dni || !fechaRetiro || !fechaDevolucion) {
      alert('Completá nombre, DNI, fecha de retiro y fecha de devolución');
      return;
    }
    localStorage.setItem('cliente', JSON.stringify(clienteForm));
    setCliente(clienteForm);
    setOpenCliente(false);
  };

  // generar remito/presupuesto
  const handleGenerarRemito = () => {
    if (!cliente.nombre) { handleOpenCliente(); return; }
    const num = generarNumeroRemito();
    const fecha = new Date().toLocaleDateString('es-AR');
    generarRemitoPDF(cliente, carrito, num, fecha);
  };
  const handleGenerarPresupuesto = () => {
  if (!cliente.nombre) { 
    handleOpenCliente(); 
    return; 
  }

  const num = generarNumeroPresupuesto();
  const fecha = new Date().toLocaleDateString('es-AR');

  generarPresupuestoPDF(cliente, carrito, jornadasMap, num, fecha);

  // 🔹 limpiar datos de cliente al terminar
  setClienteForm(initialClienteForm);
  setCliente({});
  setDniInput('');
  setClientSuggestion('');
  localStorage.removeItem('cliente');  // también limpiar storage
};

  const subcategoriasNav = useMemo(() => {
    if (!favorita) return [];
    return Array.from(
      new Set(
        productosRaw
          .filter(p => p.categoria === favorita)
          .map(p => p.subcategoria)
          .filter(Boolean)
      )
    );
  }, [productosRaw, favorita]);

  return (
    <Box>
      {/* HEADER búsqueda */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER,
          bgcolor: 'grey.900',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          zIndex: 1200
        }}
      >
        <TextField
          size="small"
          variant="outlined"
          placeholder="Buscar producto"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ width: '28vw', bgcolor: 'grey.800', borderRadius: 1 }}
        />
      </Box>

      {/* CARRITO */}
      <Box
        sx={{
          position: 'fixed',
          top: HEADER,
          bottom: FOOTER,
          left: 0,
          width: '30vw',
          p: 2,
          bgcolor: 'grey.900',
          overflowY: 'auto',
          zIndex: 1000
        }}
      >
        <Carrito
          productosSeleccionados={carrito}
          onIncrementar={i => {
            const c = [...carrito]; c[i].cantidad++; setCarrito(c);
          }}
          onDecrementar={i => {
            const c = [...carrito]; if (c[i].cantidad > 1) c[i].cantidad--; setCarrito(c);
          }}
          onCantidadChange={(i, v) => {
            const c = [...carrito]; c[i].cantidad = v === '' ? '' : Math.max(1, parseInt(v, 10)); setCarrito(c);
          }}
          onEliminar={i => {
            const c = [...carrito]; c.splice(i, 1); setCarrito(c);
          }}
          total={0}
          jornadasMap={jornadasMap}
          setJornadasMap={setJornadasMap}
          comentario=""
          setComentario={() => {}}
          onClearAll={() => setCarrito([])}
        />
      </Box>

      {/* PRODUCTOS + FILTROS */}
      <Box
        sx={{
          position: 'fixed',
          top: HEADER,
          bottom: FOOTER,
          left: '30vw',
          right: 0,
          bgcolor: 'grey.800',
          overflowY: 'auto'
        }}
      >
        {/* filtros categorías */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1300, px: 1, py: 1, bgcolor: 'grey.800' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: favorita ? 1 : 0 }}>
            <Button size="small"
              variant={!favorita ? 'contained' : 'outlined'}
              onClick={() => { setFavorita(''); setSubcategoria(''); }}
            >Todas</Button>
            {categoriasNav.map((cat, i) => (
              <Button key={i} size="small"
                variant={favorita === cat ? 'contained' : 'outlined'}
                onClick={() => { setFavorita(favorita === cat ? '' : cat); setSubcategoria(''); }}
              >{cat}</Button>
            ))}
            <IconButton size="small" sx={{ ml: 'auto' }} onClick={handleOpenEditCats}>
              <MoreVertIcon sx={{ color: '#fff' }} />
            </IconButton>
          </Box>
          {subcategoriasNav.length > 0 && (
            <Box sx={{
              display: 'flex', gap: 1, flexWrap: 'wrap',
              px: 1, py: 0.5,
              bgcolor: 'grey.700',
              borderLeft: `4px solid ${theme.palette.primary.main}`
            }}>
              <Button size="small"
                variant={!subcategoria ? 'contained' : 'outlined'}
                onClick={() => setSubcategoria('')}
              >Todas</Button>
              {subcategoriasNav.map((sub, idx) => (
                <Button key={idx} size="small"
                  variant={subcategoria === sub ? 'contained' : 'outlined'}
                  onClick={() => setSubcategoria(sub)}
                >{sub}</Button>
              ))}
            </Box>
          )}
        </Box>

        {/* Slider de productos */}
        <Slider ref={sliderRef} {...settings}>
          {sugerencias.map((p, i) => (
            <Box key={i} sx={{ px: 1, pb: `${ROW_GAP}px` }}>
              <Box onClick={e => {
                if (isSliding) { e.preventDefault(); e.stopPropagation(); return; }
                handleCardClick(p);
              }} sx={{
                height: CARD_HEIGHT,
                bgcolor: 'grey.700',
                borderRadius: 1,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: isSliding ? 'default' : 'pointer',
                '&:hover': { bgcolor: !isSliding ? 'grey.600' : 'grey.700' }
              }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}>{p.nombre}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  ${(parseFloat(p.precio) || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Slider>
      </Box>

      {/* editar categorías */}
      <Dialog open={openEditCats} onClose={handleCloseEditCats}>
        <DialogTitle>Editar categorías</DialogTitle>
        <DialogContent>
          {categoriasNav.map((cat, idx) => (
            <TextField key={idx} fullWidth size="small" variant="outlined"
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

      {/* seleccionar serial */}
      <Dialog open={openSerialDialog} onClose={() => setOpenSerialDialog(false)}>
        <DialogTitle>Seleccionar serial</DialogTitle>
        <DialogContent>
          {pendingProduct?.seriales?.map((s, idx) => (
            <MenuItem key={idx} onClick={() => handleSelectSerial(s)}>{s}</MenuItem>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSerialDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Datos Cliente */}
      <Dialog open={openCliente} onClose={handleCloseCliente} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 2 }}>
          Datos del Cliente
        </DialogTitle>

        <DialogContent sx={{ bgcolor: 'grey.900', color: '#fff', p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {/* NOMBRE */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                name="nombre"
                label="Nombre"
                value={clienteForm.nombre || ''}
                onChange={handleClienteChange}
                sx={{ bgcolor: 'grey.800', borderRadius: 1 }}
              />
            </Grid>

            {/* DNI */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                name="dni"
                label="DNI"
                value={dniInput}
                onChange={e => { setDniInput(e.target.value); handleClienteChange(e); }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClientSearch}><SearchIcon/></IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ bgcolor: 'grey.800', borderRadius: 1 }}
              />
              {clientSuggestion && (
                <Typography
                  variant="caption"
                  sx={{
                    color: clientSuggestion.startsWith('Coincidencia') ? 'success.main' : 'error.main',
                    display: 'block',
                    mt: 0.5
                  }}
                >
                  {clientSuggestion}
                </Typography>
              )}
            </Grid>

            {/* FECHA RETIRO */}
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
                sx={{ bgcolor: 'grey.800', borderRadius: 1 }}
              />
            </Grid>

            {/* FECHA DEVOLUCIÓN */}
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
                sx={{ bgcolor: 'grey.800', borderRadius: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ bgcolor: 'grey.900', px: 3, pb: 2 }}>
          <Button color="error" onClick={clearClienteForm}>
            Borrar todo
          </Button>
          <Button onClick={handleCloseCliente}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* NAVBAR INFERIOR */}
      <BottomNav
        onOpenCliente={handleOpenCliente}
        onGenerarRemito={handleGenerarRemito}
        onGenerarPresupuesto={handleGenerarPresupuesto}
        onCancelar={() => setCarrito([])}
      />
    </Box>
  );
}
