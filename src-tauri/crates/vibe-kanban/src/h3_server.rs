use quinn::{ServerConfig, Endpoint, ServerConfig as QuinnServerConfig};
use rustls::{ServerConfig as RustlsServerConfig, Certificate, PrivateKey};
use rcgen::{Certificate as RcgenCertificate, CertificateParams, DistinguishedName};
use std::sync::Arc;
use std::net::SocketAddr;
use tokio::sync::broadcast;

pub struct H3TelemetryServer {
    endpoint: Endpoint,
    log_sender: broadcast::Sender<String>,
}

impl H3TelemetryServer {
    pub async fn new(addr: SocketAddr, log_sender: broadcast::Sender<String>) -> OxideResult<Self> {
        // Generate self-signed certificate
        let (cert, key) = Self::generate_self_signed_cert()?;

        // Configure TLS
        let mut crypto = rustls::ServerConfig::builder()
            .with_safe_defaults()
            .with_no_client_auth()
            .with_single_cert(vec![cert], key)
            .map_err(|e| OxideError::TlsCertificateError {
                message: e.to_string(),
            })?;

        crypto.alpn_protocols = vec![b"h3".to_vec()];

        // Configure QUIC
        let server_config = ServerConfig::with_crypto(Arc::new(crypto));

        // Create endpoint
        let endpoint = Endpoint::server(server_config, addr)
            .map_err(|e| OxideError::QuicConnectionError {
                message: e.to_string(),
            })?;

        Ok(Self {
            endpoint,
            log_sender,
        })
    }

    pub async fn run(&self) -> OxideResult<()> {
        tracing::info!("HTTP/3 telemetry server listening on {:?}", self.endpoint.local_addr());

        while let Some(incoming) = self.endpoint.accept().await {
            let log_sender = self.log_sender.clone();

            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(incoming, log_sender).await {
                    tracing::error!("Connection error: {}", e);
                }
            });
        }

        Ok(())
    }

    async fn handle_connection(
        incoming: quinn::Incoming,
        log_sender: broadcast::Sender<String>,
    ) -> OxideResult<()> {
        let connection = incoming.await
            .map_err(|e| OxideError::QuicConnectionError {
                message: e.to_string(),
            })?;

        let mut h3_conn = h3::server::Connection::new(h3_quinn::Connection::new(connection))
            .await
            .map_err(|e| OxideError::QuicConnectionError {
                message: e.to_string(),
            })?;

        while let Ok(Some(request)) = h3_conn.accept().await {
            let (request, mut stream) = request;

            let path = request.uri().path().to_string();

            if path == "/api/v1/agent-stream" {
                Self::handle_agent_stream(&mut stream, log_sender).await?;
            } else {
                // Return 404
                let response = http::Response::builder()
                    .status(404)
                    .body(None)
                    .unwrap();

                stream.send_response(response).await
                    .map_err(|e| OxideError::QuicConnectionError {
                        message: e.to_string(),
                    })?;
            }
        }

        Ok(())
    }

    async fn handle_agent_stream(
        stream: &mut h3::server::RequestStream<h3_quinn::BidiStream, bytes::Bytes>,
        log_sender: broadcast::Sender<String>,
    ) -> OxideResult<()> {
        // Send SSE headers
        let response = http::Response::builder()
            .status(200)
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .body(None)
            .unwrap();

        stream.send_response(response).await
            .map_err(|e| OxideError::QuicConnectionError {
                message: e.to_string(),
            })?;

        // Subscribe to log broadcast
        let mut log_receiver = log_sender.subscribe();

        // Stream logs as SSE
        loop {
            match log_receiver.recv().await {
                Ok(log_line) => {
                    let sse_data = format!("data: {}\n\n", log_line);

                    stream.send_data(bytes::Bytes::from(sse_data)).await
                        .map_err(|e| OxideError::QuicConnectionError {
                            message: e.to_string(),
                        })?;
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    tracing::warn!("Log receiver lagged by {} messages", n);
                    continue;
                }
                Err(broadcast::error::RecvError::Closed) => {
                    break;
                }
            }
        }

        Ok(())
    }

    fn generate_self_signed_cert() -> OxideResult<(Certificate, PrivateKey)> {
        let mut params = CertificateParams::default();
        params.distinguished_name = DistinguishedName::new();
        params.distinguished_name.push(rcgen::DnType::CommonName, "Oxide-Tech-IDE");

        let cert = RcgenCertificate::from_params(params)
            .map_err(|e| OxideError::TlsCertificateError {
                message: e.to_string(),
            })?;

        let cert_der = cert.serialize_der()
            .map_err(|e| OxideError::TlsCertificateError {
                message: e.to_string(),
            })?;

        let key_der = cert.serialize_private_key_der();

        Ok((Certificate(cert_der), PrivateKey(key_der)))
    }
}