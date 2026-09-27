#!/bin/sh
exec /usr/bin/node /srv/presti-agents/scripts/usine/chef-modele.mjs demander --echange=/srv/presti-ia/echange "$@"
