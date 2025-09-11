module.exports = {
  apps: [
    {
      name: 'w-campus-fresh-platform',
      script: 'npx',
      args: 'wrangler pages dev dist --local --port 3000',
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