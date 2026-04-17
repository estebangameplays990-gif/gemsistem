# 💎 Gemsistem - El cerebro de tu negocio

Plataforma web tipo Mercado Libre para publicar y vender servicios digitales.

## 🚀 Instalación y arranque

```bash
pip install -r requirements.txt
python app.py
```

Abre en tu navegador: **http://localhost:5000**

## 🔐 Acceso al Panel Admin

- URL: http://localhost:5000/admin/login
- Email: **gemsistem95@gmail.com**
- Contraseña: **Gemsistem2024!**

⚠️ Cambia la contraseña en `app.py` línea con `ADMIN_PASSWORD_HASH`

## 📦 Funcionalidades

### Para el Admin (TÚ):
- Crear, editar y eliminar productos/servicios
- Subir múltiples imágenes por producto
- Definir precios y precios originales (con descuento)
- Marcar productos como destacados
- Crear y gestionar categorías con íconos emoji
- Activar/desactivar visibilidad de productos

### Para los visitantes (Compradores):
- Ver todos los productos y servicios
- Buscar por nombre o descripción
- Filtrar por categorías
- Ver detalles del producto con galería de imágenes
- Contactar directamente por WhatsApp (3161281410)
- Contactar directamente por correo (gemsistem95@gmail.com)
- ❌ NO pueden modificar nada

## 📁 Estructura
```
gemsistem/
├── app.py              # Aplicación principal
├── requirements.txt    # Dependencias
├── static/
│   ├── css/main.css   # Estilos
│   ├── js/main.js     # Scripts
│   ├── logo.png       # Logo Gemsistem
│   └── uploads/       # Imágenes subidas
└── templates/         # Páginas HTML
```

## 🌐 Despliegue en producción

Para subir a internet, recomendamos:
- **Railway** (railway.app) — gratis y fácil
- **Render** (render.com) — gratis
- **PythonAnywhere** — especializado en Flask

Escríbenos para ayudarte: **gemsistem95@gmail.com**
