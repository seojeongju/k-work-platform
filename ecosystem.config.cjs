module.exports = {
  apps: [
    {
      name: 'w-campus-platform',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=w-campus-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
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