module.exports = {
  apps: [
    {
      name: 'w-campus-platform',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=w-campus-production --local --ip 0.0.0.0 --port 8787',
      env: {
        NODE_ENV: 'development',
        PORT: 8787,
        DOMAIN_NAME: 'w-campus.com',
        SITE_NAME: 'WOW-CAMPUS',
        ENVIRONMENT: 'development'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}