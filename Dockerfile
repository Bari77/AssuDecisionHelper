# ADH — AssuDecisionHelper
# Site statique servi par nginx en mode non privilégié (uid 101, port 8080).
# Aucune étape de build : les sources sont livrées telles quelles.

FROM nginxinc/nginx-unprivileged:1.27-alpine

# Version applicative, transmise par la pipeline depuis le tag Git.
ARG ADH_VERSION=dev

LABEL org.opencontainers.image.title="AssuDecisionHelper" \
      org.opencontainers.image.description="Aide à la décision conventionnelle IRSI, CIDECOP, CIDEPIEC pour experts et gestionnaires sinistres" \
      org.opencontainers.image.version="${ADH_VERSION}" \
      org.opencontainers.image.licenses="UNLICENSED"

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
COPY --chown=101:101 assets/ /usr/share/nginx/html/assets/

# Garde-fou : refuse de produire une image dont la version déclarée dans le site
# diverge de celle du tag. Ignoré pour les builds locaux (ADH_VERSION=dev).
RUN set -eu; \
    if [ "$ADH_VERSION" != "dev" ]; then \
      declaree=$(sed -n "s/.*version: *'\([^']*\)'.*/\1/p" /usr/share/nginx/html/assets/version.js); \
      if [ "$declaree" != "$ADH_VERSION" ]; then \
        echo "Version incohérente : assets/version.js déclare '$declaree', le build attend '$ADH_VERSION'." >&2; \
        exit 1; \
      fi; \
      echo "Version $ADH_VERSION cohérente avec assets/version.js."; \
    fi

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
