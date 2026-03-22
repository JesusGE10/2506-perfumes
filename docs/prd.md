# PRD — Plataforma de E-commerce de Perfumería Fina

---

# 1. Descripción General del Producto

La plataforma es una aplicación web de comercio electrónico especializada en **perfumería fina y fragancias de autor**, diseñada para ofrecer una experiencia de compra elegante, rápida y optimizada para dispositivos móviles.

El sistema permitirá a los usuarios explorar un **catálogo visual de perfumes**, descubrir fragancias mediante **filtros**, añadir productos al carrito y completar su compra mediante un flujo de checkout optimizado.

A diferencia de las ventas tradicionales realizadas por redes sociales o mensajería directa, esta plataforma centraliza el catálogo, automatiza la recolección de información de envío y genera un **resumen estructurado del pedido que se envía directamente por WhatsApp al vendedor**, facilitando la confirmación y el procesamiento del pago.

El objetivo del producto es **reducir la fricción en el proceso de compra**, mejorar la organización de pedidos y ofrecer una experiencia digital premium alineada con el posicionamiento de la perfumería de nicho.

---

# 2. Usuarios Objetivo

## 2.1 Clientes Finales

**Perfil:**

Personas interesadas en perfumes de diseñador, nicho o árabes que desean explorar fragancias antes de comprarlas.

**Necesidades:**

* Descubrir perfumes fácilmente.
* Entender las notas olfativas.
* Filtrar por género, estilo o temporada.
* Comprar de forma rápida sin registro obligatorio.

**Casos de uso:**

* Explorar perfumes por categoría.
* Buscar una fragancia específica.
* Comparar perfumes por notas.
* Añadir varios perfumes al carrito.
* Finalizar un pedido vía WhatsApp.

---

## 2.2 Administrador de la Tienda

**Perfil:**

Responsable del catálogo, inventario y gestión de pedidos.

**Necesidades:**

* Actualizar el inventario fácilmente.
* Añadir nuevos perfumes al catálogo.
* Modificar precios y presentaciones.
* Añadir y/o modificar ofertas.
* Recibir pedidos estructurados.
* Registro de ingresos con métricas (diarias, semanales, mensuales y anuales) con opción de exportar a Google Sheet.
* Monitorear métricas y notificaciones de la página.

**Casos de uso:**

* Actualizar el stock, precio y ofertas desde una interfaz intuitiva.
* Agregar nuevas marcas o fragancias (con foto, descripción y todo lo necesario).
* Consultar pedidos recibidos.
* Confirmar pagos manualmente.
* Monitorear métricas con sugerencias de rotación y promociones con IA.

---

## 2.3 (Posibles perfiles a futuro):
[trabajador/soporte, delivery]

---

# 3. Declaración del Problema

La venta de perfumes a través de redes sociales o mensajería suele presentar varios problemas operativos:

* Los clientes deben preguntar manualmente disponibilidad y precios.
* El vendedor debe responder repetidamente las mismas consultas.
* Los pedidos se registran de forma desorganizada.
* Existe un alto riesgo de errores al capturar datos de envío.

Esto genera una **experiencia lenta para el cliente y una carga operativa innecesaria para el vendedor**.

La plataforma resuelve estos problemas mediante:

* Un **catálogo digital organizado**
* **Filtros inteligentes**
* **Automatización de captura de pedidos**
* **Integración directa con WhatsApp para confirmar compras**

---

# 4. Funcionalidades Core

---

## 4.1 Catálogo Dinámico de Perfumes

**Descripción**

Visualización de perfumes con fotografías de alta calidad, información de marca, descripción, notas olfativas y estimado de disponibilidad (menos de 10: ultimas unidades, mas de 10: disponible, 0 unidades: agotado).

**Beneficio**

Permite a los clientes descubrir fragancias de forma visual y estructurada sin depender de asistencia del vendedor.

---

## 4.2 Filtros por Familia Olfativa y Género

**Descripción**

Sistema de filtrado que permite explorar perfumes según características aromáticas.

Ejemplos:

* Cítrico
* Amaderado
* Floral
* Oriental
* Dulce

**Beneficio**

Facilita el descubrimiento de perfumes según preferencias personales.

---

## 4.3 Buscador Predictivo

**Descripción**

Barra de búsqueda que permite encontrar perfumes por:

* Nombre
* Marca
* Categoría

Incluye sugerencias automáticas.

**Beneficio**

Reduce el tiempo necesario para encontrar un producto específico.

---

## 4.4 Carrito de Compras Persistente

**Descripción**

Sistema de carrito que permite añadir múltiples perfumes y mantener la selección durante la navegación.

Incluye:

* Cantidad de unidades
* Selección de tamaño (30ml, 50ml, 100ml)
* Cálculo automático del total

**Beneficio**

Facilita la compra de múltiples productos en una sola operación.

---

## 4.5 Checkout Optimizado

**Descripción**

Formulario simplificado que recopila:

* Nombre del cliente
* Teléfono
* Dirección de entrega o Zona de envío
* Método de pago

Genera automáticamente un **resumen del pedido**.

**Beneficio**

Reduce la fricción y permite comprar sin registro.

---

## 4.6 Finalización de Pedido vía WhatsApp

**Descripción**

Botón que envía automáticamente el resumen del carrito al vendedor mediante WhatsApp.

El mensaje incluye:

* Lista de productos
* Cantidades
* Total
* Dirección
* Datos del cliente

**Beneficio**

Permite cerrar ventas rápidamente usando el canal de comunicación habitual.

---

# 5. Flujos de Usuario

---

## 5.1 Exploración de Productos

1. Usuario entra a la página principal.
2. Visualiza perfumes destacados.
3. Utiliza filtros por categoría, género o familia olfativa.
4. Selecciona un perfume para ver detalles.

---

## 5.2 Búsqueda de Fragancia

1. Usuario escribe en la barra de búsqueda.
2. El sistema muestra sugerencias.
3. Usuario selecciona un perfume.

---

## 5.3 Añadir al Carrito

1. Usuario selecciona tamaño del perfume.
2. Presiona "Añadir al carrito".
3. El carrito se actualiza dinámicamente.

---

## 5.4 Checkout

1. Usuario abre el carrito.
2. Revisa productos.
3. Ingresa datos de envío.
4. El sistema calcula el costo total.

---

## 5.5 Confirmación del Pedido

1. Usuario presiona "Finalizar pedido".
2. Se le pide rellenar un formulario con su nombre y número de teléfono.
3. Se envía la información del formulario a un webhook de n8n para generar una factura personalizada con los productos del carrito, el nombre y número de teléfono del comprador.
4. Se contacta al cliente por whatsapp a través de una automatización de n8n en donde se le envía la factura y un mensaje para cerrar la venta.

---

# 6. Requisitos Funcionales

El sistema deberá permitir:

### Catálogo

* Crear, editar y eliminar perfumes.
* Mostrar imágenes múltiples por producto.
* Asociar perfumes a categorías y marcas.
* Definir notas olfativas.
* Definir stock de cada producto.
* Crear ofertas/promociones para productos puntuales, para todos los productos y para "paquetes" de productos.

### Productos

Cada perfume debe incluir:

* Nombre
* Marca
* Descripción
* Notas de salida
* Notas de corazón
* Notas de fondo
* Presentaciones disponibles
* Precio por presentación
* Stock disponible
* Imágenes

### Búsqueda

* Búsqueda por texto.
* Sugerencias automáticas.
* Resultados filtrables.

### Carrito

* Añadir productos.
* Modificar cantidades.
* Eliminar productos.
* Calcular totales automáticamente.

### Checkout

* Formulario de datos del comprador (Nombre y número de teléfono).
* Validación de datos del comprador.
* Formulario de datos de envío.
* Validación de dirección.
* Cálculo de costo de envío por zona.
* Generación de factura del pedido a través de webhook de n8n con todos los datos de la compra (nombre, numero de teléfono, dirección, pedido, precio, etc).
* Notificación al dueño del negocio sobre la nueva venta (por telegram o perfil de administrador de la página).

### WhatsApp

* Envío automatico de la factura del pedido al comprador en cuestión, con un mensaje para cerrar la venta.

---

# 7. Oportunidades de Automatización (n8n)

---

## Automatización de facturas

**Trigger**

Al completar el checkout.

**Automatización**

Generar automáticamente una factura personalizada para el cliente en formato PDF con todos los datos pertinentes (nombre, numero de teléfono, dirección, pedido, precio, etc).

---

## Sincronización de Inventario

**Trigger**

Cambio en Google Sheets.

**Automatización**

Actualizar automáticamente el stock del perfume en la plataforma.

---

## Confirmación de Pedido

**Trigger**

Generación de factura para un cliente.

**Automatización**

Enviar un mensaje automático al cliente para cerrar la venta, con la factura y todos los métodos de pago disponibles.

---

## Seguimiento de Carrito Abandonado

**Trigger**

Checkout iniciado pero no finalizado en 4 horas.

**Automatización**

Enviar alerta al administrador para seguimiento manual.

---

## Notificación de Reposición

**Trigger**

Stock de un perfume pasa de 0 a disponible.

**Automatización**

Enviar notificación a usuarios interesados.

---

# 8. Requisitos de Datos

Las principales entidades del sistema incluyen:

---

## Usuario

* Nombre
* Teléfono
* Email (opcional)

---

## Perfume

* ID
* Nombre
* Marca
* Descripción
* Notas olfativas
* Categoría
* Género 
* Imágenes

---

## Presentación

* Tamaño (ml)
* Precio
* Stock

---

## Pedido

* Cliente
* Productos
* Cantidades
* Total
* Dirección o Zona de envío
* Estado

---

## Categoría

* Nombre
* Descripción

---

## Género

* Género (Hombre, Mujer, Unisex)

---

## Marca

* Nombre
* País de origen

---

# 9. Inspiración de Diseño

Referencia analizada:

[https://thecookielabccs.winktienda.com/](https://thecookielabccs.winktienda.com/)

Diseños de página:

En la carpeta @design están los siguientes diseños de referencia @design/home-page, @design/product-detail, @design/cart-sidebar y está el logo de la marca @design/logo/logo.PNG

Patrones útiles identificados:

---

## Navegación por Categorías

Menú superior con acceso rápido a categorías principales.

Aplicación en el producto:

* Lo mas nuevo
* Hombres
* Mujeres
* Top 20 de la Semana
* Ofertas (desplegable con opciones de categorías y generos)
* Árabes
* Marcas (desplegable con opciones de marcas)

---

## Modal de Producto

Vista emergente para ver detalles del producto sin abandonar la página.

Beneficio:

Permite explorar múltiples productos rápidamente.

---

## Diseño Minimalista

Uso de:

* Fondos claros
* Tipografía elegante
* Fotografías de alta calidad

Esto resalta los frascos de perfume.

---

## Carrito Desplegable

Carrito accesible desde cualquier página.

Optimizado para mobile.

---

# 10. Requisitos No Funcionales

---

## Rendimiento

* Tiempo de carga menor a **2 segundos**
* Optimización de imágenes
* Lazy loading para catálogo

---

## Escalabilidad

Arquitectura preparada para:

* Añadir nuevas marcas
* Expandir categorías
* Aumentar catálogo

---

## Seguridad

* Validación de inputs
* Protección contra ataques XSS y SQL injection
* Uso de HTTPS

---

## Mantenibilidad

Arquitectura modular que permita:

* Añadir nuevas funcionalidades
* Integrar nuevos métodos de pago

---

# 11. Alcance del MVP

El MVP incluirá:

* Catálogo de perfumes
* Filtros por categoría
* Buscador
* Página de producto
* Selección de tamaño
* Carrito de compras
* Checkout sin registro
* Cálculo de delivery
* Botón de pedido vía WhatsApp
* Integración básica con Google Sheets
* Automatizaciones iniciales con n8n

---

# 12. Mejoras Futuras

Posibles funcionalidades posteriores al MVP:

* Sistema de cuentas de usuario
* Historial de pedidos
* Wishlist de perfumes
* Recomendaciones basadas en preferencias
* Sistema de reseñas
* Comparador de fragancias
* Integración con pagos online
* Panel administrativo completo
* Sistema de tracking de envíos
* Programa de fidelización
* Inteligencia artificial para recomendación de perfumes
