# Static simulation of the Docker Agentic Platform portal.
# No build step — plain HTML/CSS/ES modules served by nginx.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY assets/    /usr/share/nginx/html/assets/
COPY src/       /usr/share/nginx/html/src/

EXPOSE 80
