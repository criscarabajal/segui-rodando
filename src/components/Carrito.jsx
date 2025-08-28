// src/components/Carrito.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Divider,
  Paper,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Remove, Delete, MoreVert } from '@mui/icons-material';

export default function Carrito({
  productosSeleccionados,
  onIncrementar,
  onDecrementar,
  onCantidadChange,
  onEliminar,
  jornadasMap,
  setJornadasMap,
  comentario,            // ← viene del padre
  setComentario,         // ← viene del padre
  pedidoNumero,
  setPedidoNumero,
  onClearAll,
  // 🔹 grupo actual (día/etiqueta) controlado por el padre
  grupoActual,
  setGrupoActual
}) {
  const [discount, setDiscount] = useState('0');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [openIncludes, setOpenIncludes] = useState(false);
  const [serialMap, setSerialMap] = useState({});
  const [massJornadas, setMassJornadas] = useState(''); // para aplicar a todas

  // Guardar descuento
  useEffect(() => {
    localStorage.setItem('descuento', JSON.stringify(appliedDiscount));
  }, [appliedDiscount]);

  // Inicializar serialMap al abrir detalles
  useEffect(() => {
    if (!openIncludes) return;
    const init = {};
    productosSeleccionados.forEach((item, idx) => {
      const opts = Array.isArray(item.seriales) ? item.seriales : [];
      init[idx] = serialMap[idx] ?? opts[0] ?? '';
    });
    setSerialMap(init);
  }, [openIncludes, productosSeleccionados]);

  const handleApplyDiscount = () => {
    if (discount === 'especial') {
      const pwd = prompt('Contraseña:');
      if (pwd !== 'veok') return alert('Contraseña incorrecta');
      const pct = parseFloat(prompt('Porcentaje (0–100):'));
      if (isNaN(pct) || pct < 0 || pct > 100) return alert('Inválido');
      return setAppliedDiscount(pct);
    }
    const pct = parseFloat(discount);
    if (isNaN(pct) || pct < 0 || pct > 100) return alert('Seleccione válido');
    setAppliedDiscount(pct);
  };

  const handleAccept = () => setOpenIncludes(false);

  // ✅ helpers para jornadas masivas
  const bumpAllJornadas = (delta) => {
    setJornadasMap(prev => {
      const next = { ...prev };
      productosSeleccionados.forEach((_, idx) => {
        const cur = parseInt(next[idx], 10) || 1;
        next[idx] = Math.max(1, cur + delta);
      });
      return next;
    });
  };
  const applyAllJornadas = (val) => {
    const v = Math.max(1, parseInt(val, 10) || 1);
    setJornadasMap(prev => {
      const next = { ...prev };
      productosSeleccionados.forEach((_, idx) => { next[idx] = v; });
      return next;
    });
  };

  // Cálculo de totales
  const totalConJornadas = productosSeleccionados.reduce((sum, item, idx) => {
    const qty = parseInt(item.cantidad, 10) || 0;
    const j = parseInt(jornadasMap[idx], 10) || 1;
    const price = parseFloat(item.precio) || 0;
    return sum + qty * price * j;
  }, 0);
  const discountAmount = totalConJornadas * (appliedDiscount / 100);
  const finalTotal = totalConJornadas - discountAmount;
  const totalWithIva = finalTotal * 1.21;

  const ordenados = productosSeleccionados.map((p, i) => ({ p, i })).reverse();

  return (
    <Paper
      sx={{
        width: '100%',
        bgcolor: '#1e1e1e',
        color: '#fff',
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        fontSize: '0.875rem'
      }}
    >
      {/* Header pedido */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>
          Pedido N°
        </Typography>
        <TextField
          size="small"
          variant="outlined"
          value={pedidoNumero}
          onChange={e => setPedidoNumero(e.target.value)}
          sx={{
            width: 80,
            bgcolor: '#2c2c2c',
            borderRadius: 1,
            '& .MuiInputBase-input': { color: '#fff', padding: '4px', textAlign: 'center' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
          }}
        />

        {/* Comentario arriba de todo */}
        <TextField
          size="small"
          placeholder="Comentario… (ej: Lunes)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          sx={{
            flex: 1,
            minWidth: 140,
            bgcolor: '#2c2c2c',
            borderRadius: 1,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
            '& .MuiInputBase-input': { color: '#fff', py: '6px' }
          }}
          inputProps={{ maxLength: 200 }}
        />

        {/* ✅ Botón Aceptar: fija grupo y limpia el input */}
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            const v = (comentario || '').trim();
            if (!v) return;
            setGrupoActual(v);   // fija el “día/etiqueta” actual
            setComentario('');   // limpia el input después de aceptar
          }}
          disabled={!comentario?.trim()}
        >
          Aceptar
        </Button>

        <IconButton size="small" onClick={() => setOpenIncludes(true)}>
          <MoreVert sx={{ color: '#fff' }} />
        </IconButton>
      </Box>

      {/* Lista de ítems */}
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {/* 🔹 separador “activo” apenas aceptás el comentario */}
        {grupoActual?.trim() && (
          <Box key="sep-actual" sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: '#1e1e1e' }}>
            <Divider textAlign="left" sx={{ my: 1, '&::before, &::after': { borderColor: '#555' } }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 1,
                  py: 0.5,
                  bgcolor: '#333',
                  borderRadius: 1,
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={grupoActual}
              >
                {grupoActual}
              </Typography>
            </Divider>
          </Box>
        )}

        {(() => {
          // 👇 clave: arrancamos 'lastGrupo' con el grupo activo para NO duplicar separador
          let lastGrupo = (grupoActual || '').trim() || null;

          return ordenados.flatMap(({ p: item, i: idx }) => {
            const curGrupo = (item.grupo || '').trim();
            const needsSep = curGrupo && curGrupo !== lastGrupo;
            if (needsSep) lastGrupo = curGrupo;

            const sep = needsSep ? (
              <Box key={`sep-${idx}`} sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: '#1e1e1e' }}>
                <Divider textAlign="left" sx={{ my: 1, '&::before, &::after': { borderColor: '#555' } }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      px: 1,
                      py: 0.5,
                      bgcolor: '#333',
                      borderRadius: 1,
                      display: 'inline-block',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={curGrupo}
                  >
                    {curGrupo}
                  </Typography>
                </Divider>
              </Box>
            ) : null;

            const row = (
              <React.Fragment key={idx}>
                <ListItem
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#2c2c2c',
                    borderRadius: 1,
                    mb: 1,
                    py: 1,
                    px: 1
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.825rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexGrow: 1
                    }}
                  >
                    {item.nombre}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => onDecrementar(idx)}><Remove /></IconButton>
                    <TextField
                      value={item.cantidad}
                      onChange={e => onCantidadChange(idx, e.target.value)}
                      size="small"
                      inputProps={{ style: { textAlign: 'center', width: 32 } }}
                      sx={{ bgcolor: '#2c2c2c', borderRadius: 1 }}
                    />
                    <IconButton size="small" onClick={() => onIncrementar(idx)}><Add /></IconButton>
                    <IconButton size="small" color="error" onClick={() => onEliminar(idx)}><Delete /></IconButton>
                  </Box>
                </ListItem>
                <Divider sx={{ borderColor: '#333', mb: 1 }} />
              </React.Fragment>
            );

            return needsSep ? [sep, row] : [row];
          });
        })()}
      </List>

      {/* Totales */}
      <Box mt={1} textAlign="right">
        <Typography>Subtotal: ${totalConJornadas.toLocaleString()}</Typography>
        {appliedDiscount > 0 && (
          <>
            <Typography variant="body2">Descuento ({appliedDiscount}%): -${discountAmount.toLocaleString()}</Typography>
            <Typography fontWeight="bold">Total: ${finalTotal.toLocaleString()}</Typography>
          </>
        )}
        <Typography fontWeight="bold" mt={1}>
          Total + IVA (21%): ${totalWithIva.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Typography>
      </Box>

      {/* Descuento / borrar */}
      <Box mt={2} display="flex" flexDirection="column" gap={1}>
        <TextField
          select
          label="Descuento"
          size="small"
          value={discount}
          onChange={e => setDiscount(e.target.value)}
          sx={{ bgcolor: '#2c2c2c', borderRadius: 1 }}
        >
          <MenuItem value="0">Ninguno</MenuItem>
          <MenuItem value="10">10%</MenuItem>
          <MenuItem value="20">20%</MenuItem>
          <MenuItem value="25">25%</MenuItem>
          <MenuItem value="especial">Especial</MenuItem>
        </TextField>
        <Button variant="contained" size="small" onClick={handleApplyDiscount}>
          Aplicar descuento
        </Button>
        <Button variant="outlined" color="error" size="small" onClick={onClearAll}>
          Borrar todo
        </Button>
      </Box>

      {/* Diálogo Detalles de productos */}
      <Dialog open={openIncludes} onClose={() => setOpenIncludes(false)} maxWidth="lg" PaperProps={{ sx: { width: '80vw', height: '80vh' } }}>
        <DialogTitle>Detalles de productos</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {productosSeleccionados.length ? (
            <>
              {/* 🔹 Controles masivos de jornadas */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  p: 1,
                  border: '1px dashed #666',
                  borderRadius: 1,
                  bgcolor: '#222'
                }}
              >
                <Typography sx={{ mr: 1, fontWeight: 600 }}>Jornadas (todas):</Typography>

                <IconButton size="small" onClick={() => bumpAllJornadas(-1)}>
                  <Remove fontSize="small" />
                </IconButton>

                <TextField
                  size="small"
                  type="number"
                  value={massJornadas}
                  onChange={(e) => setMassJornadas(e.target.value)}
                  inputProps={{ min: 1, style: { textAlign: 'center', width: 70 } }}
                  sx={{ bgcolor: '#1e1e1e', borderRadius: 1 }}
                  placeholder="n°"
                />

                <IconButton size="small" onClick={() => bumpAllJornadas(1)}>
                  <Add fontSize="small" />
                </IconButton>

                <Button
                  size="small"
                  variant="contained"
                  onClick={() => applyAllJornadas(massJornadas)}
                  sx={{ ml: 'auto' }}
                >
                  Aplicar a todas
                </Button>
              </Box>

              {productosSeleccionados.map((item, idx) => {
                const j = jornadasMap[idx] || 1;
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto', // ← 3 columnas: Detalle | Cantidad | Jornadas
                      columnGap: 2,
                      alignItems: 'center',
                      mb: 2,
                      p: 1,
                      border: '1px solid #444',
                      borderRadius: 1,
                      bgcolor: '#2a2a2a'
                    }}
                  >
                    {/* Columna: detalle */}
                    <Box>
                      <Typography fontWeight={600}>{item.nombre}</Typography>
                      <Typography variant="body2">{item.incluye || 'Sin info.'}</Typography>
                    </Box>

                    {/* Columna: Cantidad (EDITABLE) */}
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="caption" color="gray">Cantidad</Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          border: '1px dashed gray',
                          borderRadius: 1,
                          p: '2px 4px',
                          bgcolor: '#1e1e1e'
                        }}
                      >
                        <IconButton size="small" onClick={() => onDecrementar(idx)}>
                          <Remove fontSize="small" />
                        </IconButton>

                        <TextField
                          size="small"
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => onCantidadChange(idx, e.target.value)}
                          inputProps={{ min: 1, style: { textAlign: 'center', width: 48 } }}
                          sx={{ bgcolor: '#2c2c2c', borderRadius: 1 }}
                        />

                        <IconButton size="small" onClick={() => onIncrementar(idx)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Columna: Jornadas (con - / +) */}
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="caption" color="gray">Jornadas</Typography>
                      <Box display="flex" alignItems="center" sx={{ border: '1px dashed gray', borderRadius: 1, p: '2px 4px', bgcolor: '#1e1e1e' }}>
                        <IconButton size="small" onClick={() =>
                          setJornadasMap(prev => ({ ...prev, [idx]: Math.max(1, (prev[idx]||1)-1) }))
                        }><Remove fontSize="small" /></IconButton>
                        <Typography mx={0.5}>{j}</Typography>
                        <IconButton size="small" onClick={() =>
                          setJornadasMap(prev => ({ ...prev, [idx]: (prev[idx]||1)+1 }))
                        }><Add fontSize="small" /></IconButton>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </>
          ) : (
            <Typography>No hay productos seleccionados.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" onClick={handleAccept}>Aceptar</Button>
          <Button onClick={() => setOpenIncludes(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
