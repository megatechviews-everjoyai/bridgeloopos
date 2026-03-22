app = "everjoy-bridge"
primary_region = "syd"

[build]
  [build.args]
    NODE_VERSION = "18"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80