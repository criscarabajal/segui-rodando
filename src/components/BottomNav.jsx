// src/components/BottomNav.jsx
import React from 'react';
import { Box, Button, Grid } from '@mui/material';

export default function BottomNav({
  onOpenCliente,
  onGenerarRemito,
  onGenerarPresupuesto,
  onGenerarSeguro,       // <- nuevo
  onCancelar
}) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'grey.900',
        p: 2,
        zIndex: 1000,
        display: 'flex',
        gap: 2
      }}
    >
      <Button
        variant="contained"
        color="primary"
        onClick={onOpenCliente}
      >
        Cliente
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={onGenerarRemito}
      >
        Generar Remito
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={onGenerarPresupuesto}
      >
        Generar Presupuesto
      </Button>
      <Button
            variant="contained"
            color="info"
            onClick={onGenerarSeguro}
          >
            Seguros
       </Button>
        

      {/* Botón Cancelar a la derecha */}
      <Button
        variant="contained"
        color="error"
        onClick={onCancelar}
        sx={{ ml: 'auto' }}
      >
        Cancelar
      </Button>
    </Box>
  );
}

