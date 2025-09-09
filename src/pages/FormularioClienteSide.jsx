// src/pages/FormularioClienteSide.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SingleColorLayout from '../components/SingleColorLayout';
import dayjs from 'dayjs';

export default function FormularioClienteSide() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',   
    fechaRetiro: null,
    fechaDevolucion: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, newValue) => {
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleNext = () => {
    const {
      nombre,
      fechaRetiro,
      fechaDevolucion
    } = formData;

    if (
      !nombre ||
      !fechaRetiro ||
      !fechaDevolucion
    ) {
      alert('Por favor, complete todos los campos.');
      return;
    }

    // Guardamos fechas como ISO para usarlas luego en el PDF
    const payload = {
      ...formData,
      fechaRetiro: fechaRetiro.toISOString(),
      fechaDevolucion: fechaDevolucion.toISOString()
    };
    localStorage.setItem('cliente', JSON.stringify(payload));
    navigate('/productos', { state: payload });
  };

  return (
    <SingleColorLayout imageUrl="https://source.unsplash.com/random/?photography">
      <Box
        sx={{
          width: 400,
          bgcolor: 'grey.900',
          p: 6,               // aumento de padding
          borderRadius: 2,
          mx: 'auto',
          my: 4
        }}
      >
        <Typography
          component="h1"
          variant="h4"
          gutterBottom
          sx={{ mb: 3 }}       // más separación debajo del título
        >
          Datos del Cliente
        </Typography>

        <TextField
          margin="normal"
          required
          fullWidth
          label="Nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
        />
             

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Fecha de Retiro"
            value={formData.fechaRetiro}
            onChange={(newValue) => handleDateChange('fechaRetiro', newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="normal"
                required
                fullWidth
              />
            )}
          />

          <DateTimePicker
            label="Fecha de Devolución"
            value={formData.fechaDevolucion}
            onChange={(newValue) => handleDateChange('fechaDevolucion', newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="normal"
                required
                fullWidth
              />
            )}
          />
        </LocalizationProvider>

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 4, mb: 2, py: 2, fontSize: '1.1rem' }}
          onClick={handleNext}
        >
          Siguiente
        </Button>
      </Box>
    </SingleColorLayout>
  );
}
