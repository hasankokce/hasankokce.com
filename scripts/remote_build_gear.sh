#!/bin/bash
set -e
echo "--> Extracting bundle..."
cd /var/www/hasankokce/frontend
tar -xzf /tmp/deploy_gear_bundle.tar.gz

echo "--> Building Next.js..."
export PATH=/root/.nvm/versions/node/v24.21.0/bin:$PATH
npm run build

echo "--> Reloading PM2..."
pm2 reload hasankokce-frontend

echo "--> Done on remote!"
