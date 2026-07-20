# Imagen ligera de Nginx para producción
FROM nginx:alpine

# Reemplazar la configuración por defecto de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos de la aplicación
COPY index.html /usr/share/nginx/html/index.html
COPY docs /usr/share/nginx/html/docs

# Exponer el puerto 8080 (Requerido por Google Cloud Run)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
