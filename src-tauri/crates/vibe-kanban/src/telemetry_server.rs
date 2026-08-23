
use memmap2::MmapMut;
use std::fs::OpenOptions;
use std::io::{self, Write};
use std::sync::atomic::{AtomicUsize, Ordering};
use bytes::{Bytes, BytesMut};
use std::path::Path;
use std::net::SocketAddr;
use std::sync::Arc;
use quinn::{Endpoint, ServerConfig};
use h3_quinn::quinn;
use h3::server::RequestStream;
use tokio::io::AsyncWriteExt;

// A simple ring buffer implementation in shared memory
pub struct SharedLogBuffer {
    mmap: MmapMut,
    head: AtomicUsize,
    tail: AtomicUsize,
    capacity: usize,
}

impl SharedLogBuffer {
    pub fn new(path: &Path, capacity: usize) -> io::Result<Self> {
        let file = OpenOptions::new().read(true).write(true).create(true).open(path)?;
        file.set_len(capacity as u64)?;
        let mmap = unsafe { MmapMut::map_mut(&file)? };

        Ok(Self {
            mmap,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
            capacity,
        })
    }

    pub fn write_log(&self, log: &[u8]) -> io::Result<()> {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Acquire);
        let len = log.len();

        if self.capacity - (head - tail) < len + 4 {
            return Err(io::Error::new(io::ErrorKind::WouldBlock, "Buffer is full"));
        }

        // Write length prefix
        self.mmap[head..head + 4].copy_from_slice(&(len as u32).to_le_bytes());
        // Write log data
        self.mmap[head + 4..head + 4 + len].copy_from_slice(log);

        self.head.store(head + 4 + len, Ordering::Release);
        Ok(())
    }

    pub fn read_logs(&self) -> Bytes {
        let head = self.head.load(Ordering::Acquire);
        let tail = self.tail.load(Ordering::Relaxed);

        if head == tail {
            return Bytes::new();
        }

        let data = self.mmap[tail..head].to_vec();
        self.tail.store(head, Ordering::Release);
        Bytes::from(data)
    }
}

pub struct TelemetryServer {
    endpoint: Endpoint,
    buffer: Arc<SharedLogBuffer>,
}

impl TelemetryServer {
    pub async fn new(addr: SocketAddr, buffer_path: &Path, buffer_capacity: usize) -> OxideResult<Self> {
        let (endpoint, _server_cert) = make_server_endpoint(addr)?;
        let buffer = Arc::new(SharedLogBuffer::new(buffer_path, buffer_capacity)?);
        Ok(Self { endpoint, buffer })
    }

    pub async fn start(&self) -> OxideResult<()> {
        println!("Telemetry server listening on {}", self.endpoint.local_addr()?);
        while let Some(conn) = self.endpoint.accept().await {
            let buffer = Arc::clone(&self.buffer);
            tokio::spawn(async move {
                let mut h3_conn = h3::server::Connection::new(h3_quinn::Connection::new(conn)).await.unwrap();
                while let Some(Ok((req, stream))) = h3_conn.accept().await {
                    if req.uri().path() == "/api/v1/stream" {
                        let buffer_clone = Arc::clone(&buffer);
                        tokio::spawn(handle_stream(stream, buffer_clone));
                    }
                }
            });
        }
        Ok(())
    }
}

async fn handle_stream(mut stream: RequestStream<h3_quinn::Connection, Bytes>, buffer: Arc<SharedLogBuffer>) {
    let resp = http::Response::builder()
        .status(http::StatusCode::OK)
        .header("Content-Type", "text/event-stream")
        .body(())
        .unwrap();

    stream.send_response(resp).await.unwrap();

    loop {
        let data = buffer.read_logs();
        if !data.is_empty() {
            let mut event_data = BytesMut::from("data: ");
            event_data.extend_from_slice(&data);
            event_data.extend_from_slice(b"\n\n");
            if stream.send_data(event_data.freeze()).await.is_err() {
                break; // Client disconnected
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
}


fn make_server_endpoint(bind_addr: SocketAddr) -> Result<(Endpoint, Vec<u8>), Box<dyn std::error::Error>> {
    let (server_config, server_cert) = configure_server()?;
    let endpoint = Endpoint::server(server_config, bind_addr)?;
    Ok((endpoint, server_cert))
}

fn configure_server() -> Result<(ServerConfig, Vec<u8>), Box<dyn std::error::Error>> {
    let cert = rcgen::generate_simple_self_signed(vec!["localhost".into()]).unwrap();
    let cert_der = cert.serialize_der().unwrap();
    let priv_key = cert.serialize_private_key_der();
    let priv_key = rustls::PrivateKey(priv_key);
    let cert_chain = vec![rustls::Certificate(cert_der.clone())];

    let mut server_config = ServerConfig::with_single_cert(cert_chain, priv_key)?;
    let transport_config = Arc::get_mut(&mut server_config.transport).unwrap();
    transport_config.max_concurrent_uni_streams(0_u8.into());

    Ok((server_config, cert_der))
}

use crate::errors::OxideResult;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tempfile::NamedTempFile;

    #[test]
    fn test_shared_log_buffer_write_read() {
        let temp_file = NamedTempFile::new().unwrap();
        let buffer = SharedLogBuffer::new(temp_file.path(), 1024).unwrap();

        let log1 = b"hello";
        buffer.write_log(log1).unwrap();
        let log2 = b"world";
        buffer.write_log(log2).unwrap();

        let read_data = buffer.read_logs();

        let mut expected = BytesMut::new();
        expected.extend_from_slice(&(log1.len() as u32).to_le_bytes());
        expected.extend_from_slice(log1);
        expected.extend_from_slice(&(log2.len() as u32).to_le_bytes());
        expected.extend_from_slice(log2);

        assert_eq!(read_data, expected.freeze());
    }

    #[tokio::test]
    #[ignore] // This test requires a running server and is more of an integration test
    async fn test_telemetry_server_stream() {
        let temp_file = NamedTempFile::new().unwrap();
        let addr = "127.0.0.1:4433".parse().unwrap();
        let server = TelemetryServer::new(addr, temp_file.path(), 4096).await.unwrap();

        let server_handle = tokio::spawn(async move {
            server.start().await.unwrap();
        });

        // Let the server start
        tokio::time::sleep(Duration::from_millis(100)).await;

        // In a real test, you would create a client here to connect and verify the stream.
        // This is complex with self-signed certs and h3.

        server_handle.abort();
    }
}
