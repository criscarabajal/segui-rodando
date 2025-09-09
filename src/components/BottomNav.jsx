// src/components/BottomNav.jsx
import React from 'react';
import { Box, Button } from '@mui/material';

export default function BottomNav({
  onOpenCliente = () => {},
  onGenerarRemito = () => {},
  onGenerarPresupuesto = () => {},
  onCancelar = () => {},
  onOpenSeguros = () => {}
}) {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '72px',            // alto fijo para que coincida con FOOTER=72
        bgcolor: 'grey.900',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        zIndex: 2000,              // por encima de todo
        pointerEvents: 'auto',     // asegura que reciba clics
        boxShadow: '0 -4px 10px rgba(0,0,0,0.35)'
      }}
    >
      <Button variant="outlined" onClick={onOpenCliente}>Datos Cliente</Button>
      <Button variant="outlined" color="info" onClick={onOpenSeguros}>Seguros</Button>
      <Button variant="contained" onClick={onGenerarRemito}>Remito</Button>
      <Button variant="contained" color="success" onClick={onGenerarPresupuesto}>Presupuesto</Button>
      <Button variant="text" color="error" sx={{ ml: 'auto' }} onClick={onCancelar}>Cancelar</Button>
    </Box>
  );
}
