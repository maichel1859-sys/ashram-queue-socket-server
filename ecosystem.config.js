module.exports = {
  apps: [{
    name: 'ashram-queue-socket',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
