use quinn::{TransportConfig, ServerConfig};
use std::time::Duration;

pub struct QuicConfig;

impl QuicConfig {
    pub fn configure_transport() -> TransportConfig {
        let mut transport = TransportConfig::default();

        // Keep-alive interval (send PING frames to keep connection alive)
        transport.keep_alive_interval(Some(Duration::from_secs(10)));

        // Max idle timeout (close connection if no activity)
        transport.max_idle_timeout(Some(Duration::from_secs(60).try_into().unwrap()));

        // Max concurrent bidirectional streams
        transport.max_concurrent_bidi_streams(100u32.into());

        // Max concurrent unidirectional streams
        transport.max_concurrent_uni_streams(100u32.into());

        // Initial maximum data
        transport.initial_max_data(10_000_000);

        // Initial maximum stream data
        transport.initial_max_stream_data_bidi_local(1_000_000);
        transport.initial_max_stream_data_bidi_remote(1_000_000);
        transport.initial_max_stream_data_uni(1_000_000);

        // Datagram support (for future use)
        transport.datagram_receive_buffer_size(Some(1_000_000));

        transport
    }

    pub fn configure_server() -> ServerConfig {
        let mut server_config = ServerConfig::with_crypto(Arc::new(rustls::ServerConfig::builder()
            .with_safe_defaults()
            .with_no_client_auth()
            .with_cert_resolver(Arc::new(NoCertResolver))
        ));

        server_config.transport_config(Arc::new(Self::configure_transport()));

        server_config
    }
}

struct NoCertResolver;

impl rustls::server::ResolvesServerCert for NoCertResolver {
    fn resolve(&self, _client_hello: rustls::server::ClientHello) -> Option<Arc<rustls::sign::CertifiedKey>> {
        None
    }
}