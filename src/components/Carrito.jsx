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
  pedidoNumero,
  setPedidoNumero,
  grupoActual,
  setGrupoActual,
  onClearAll,
  discount,
  setDiscount,
  appliedDiscount,
  setAppliedDiscount
}) {
  const [openIncludes, setOpenIncludes] = useState(false);
  const [serialMap, setSerialMap] = useState({});
  const [massJornadas, setMassJornadas] = useState('');

  useEffect(() => {
    localStorage.setItem('descuento', JSON.stringify(appliedDiscount));
  }, [appliedDiscount]);

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
        borderRadius: 2
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



        <IconButton size="small" onClick={() => setOpenIncludes(true)}>
          <MoreVert sx={{ color: '#fff' }} />
        </IconButton>
      </Box>

      {/* Lista */}
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {ordenados.map(({ p: item, i: idx }) => (
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
                <IconButton size="small" onClick={() => onDecrementar(idx)}>
                  <Remove />
                </IconButton>

                <TextField
                  value={item.cantidad}
                  onChange={e => onCantidadChange(idx, e.target.value)}
                  size="small"
                  inputProps={{ style: { textAlign: 'center', width: 32 } }}
                  sx={{ bgcolor: '#2c2c2c', borderRadius: 1 }}
                />

                <IconButton size="small" onClick={() => onIncrementar(idx)}>
                  <Add />
                </IconButton>

                <IconButton size="small" color="error" onClick={() => onEliminar(idx)}>
                  <Delete />
                </IconButton>
              </Box>
            </ListItem>

            <Divider sx={{ borderColor: '#333', mb: 1 }} />
          </React.Fragment>
        ))}
      </List>

      {/* Totales */}
      <Box mt={1} textAlign="right">
        <Typography>Subtotal: ${totalConJornadas.toLocaleString()}</Typography>

        {appliedDiscount > 0 && (
          <>
            <Typography variant="body2">
              Descuento ({appliedDiscount}%): -${discountAmount.toLocaleString()}
            </Typography>
            <Typography fontWeight="bold">
              Total: ${finalTotal.toLocaleString()}
            </Typography>
          </>
        )}

        <Typography fontWeight="bold" mt={1}>
          Total + IVA (21%): $
          {totalWithIva.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Typography>
      </Box>

      {/* Descuentos */}
      <Box mt={2} display="flex" flexDirection="column" gap={1}>
        <TextField
          select
          label="Descuento"
          size="small"
          value={discount}
          onChange={e => setDiscount(e.target.value)}
          SelectProps={{
            MenuProps: {
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              getContentAnchorEl: null, // importante en MUI v4 (ignorado en MUI v5)
              PaperProps: {
                sx: {
                  mt: '-8px',     // empuja el menú hacia arriba visualmente
                }
              }
            }
          }}
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

      {/* 🔥 DIALOG DETALLES DE PRODUCTOS */}
      <Dialog
        open={openIncludes}
        onClose={() => setOpenIncludes(false)}
        maxWidth="lg"
        PaperProps={{ sx: { width: '80vw', height: '80vh' } }}
      >
        <DialogTitle>Detalles de productos</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {productosSeleccionados.length ? (
            <>
              {/* Controles masivos */}
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
                <Typography sx={{ mr: 1, fontWeight: 600 }}>
                  Jornadas (todas):
                </Typography>

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

              {/* LISTA DETALLADA */}
              {[...productosSeleccionados].reverse().map((item, idx) => {
                const realIdx = productosSeleccionados.length - 1 - idx;
                const j = jornadasMap[realIdx] || 1;
                const qty = parseInt(item.cantidad, 10) || 1;

                return (
                  <Box
                    key={realIdx}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      columnGap: 2,
                      alignItems: 'center',
                      mb: 2,
                      p: 1,
                      border: '1px solid #444',
                      borderRadius: 1,
                      bgcolor: '#2a2a2a'
                    }}
                  >
                    {/* 1. Cantidad (Izquierda) */}
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="caption" color="gray">
                        Cantidad
                      </Typography>
                      <Box
                        display="flex"
                        alignItems="center"
                        sx={{
                          border: '1px dashed gray',
                          borderRadius: 1,
                          p: '2px 4px',
                          bgcolor: '#2a2a2a'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => onDecrementar(realIdx)}
                          disabled={qty <= 1}
                        >
                          <Remove fontSize="small" />
                        </IconButton>

                        <Typography mx={0.5}>{qty}</Typography>

                        <IconButton
                          size="small"
                          onClick={() => onIncrementar(realIdx)}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* 2. Descripción (Centro) */}
                    <Box>
                      <Typography fontWeight={600}>{item.nombre}</Typography>
                      <Typography variant="body2">
                        {item.incluye || 'Sin info.'}
                      </Typography>
                    </Box>

                    {/* 3. Jornadas (Derecha) */}
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="caption" color="gray">
                        Jornadas
                      </Typography>

                      <Box
                        display="flex"
                        alignItems="center"
                        sx={{
                          border: '1px dashed gray',
                          borderRadius: 1,
                          p: '2px 4px',
                          bgcolor: '#2a2a2a'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            setJornadasMap(prev => ({
                              ...prev,
                              [realIdx]: Math.max(1, j - 1)
                            }))
                          }
                        >
                          <Remove fontSize="small" />
                        </IconButton>

                        <Typography mx={0.5}>{j}</Typography>

                        <IconButton
                          size="small"
                          onClick={() =>
                            setJornadasMap(prev => ({
                              ...prev,
                              [realIdx]: j + 1
                            }))
                          }
                        >
                          <Add fontSize="small" />
                        </IconButton>
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
          <Button variant="contained" color="success" onClick={() => setOpenIncludes(false)}>
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
