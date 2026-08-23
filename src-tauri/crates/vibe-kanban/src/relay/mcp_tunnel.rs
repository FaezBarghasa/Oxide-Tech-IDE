use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::APIBuilder;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use std::sync::Arc;
use tokio::sync::mpsc;
use core::errors::{OxideError, OxideResult};

#[derive(Debug, Serialize, Deserialize)]
struct MCPRequest {
    jsonrpc: String,
    method: String,
    params: serde_json::Value,
    id: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct MCPResponse {
    jsonrpc: String,
    result: serde_json::Value,
    id: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct MCPErrorResponse {
    jsonrpc: String,
    error: MCPError,
    id: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct MCPError {
    code: i32,
    message: String,
}

async fn mcp_stream_handler(sdp: web::Json<RTCSessionDescription>) -> OxideResult<impl Responder> {
    let mut m = MediaEngine::default();
    m.register_default_codecs().map_err(|e| OxideError::QuicConnectionError{message: e.to_string()})?;
    let api = APIBuilder::new().with_media_engine(m).build();
    let config = RTCConfiguration::default();
    let peer_connection = Arc::new(api.new_peer_connection(config).await.map_err(|e| OxideError::QuicConnectionError{message: e.to_string()})?);

    let (tx, mut rx) = mpsc::channel::<String>(100);

    peer_connection.on_peer_connection_state_change(Box::new(move |s: RTCPeerConnectionState| {
        log::info!("Peer Connection State has changed: {}", s);
        Box::pin(async {})
    })).await;

    peer_connection.on_data_channel(Box::new(move |dc| {
        let dc = Arc::new(dc);
        let dc_label = dc.label().to_owned();
        log::info!("New DataChannel {} {}", dc_label, dc.id());

        let dc_clone = Arc::clone(&dc);
        let tx_clone = tx.clone();
        Box::pin(async move {
            dc_clone.on_open(Box::new(move || {
                log::info!("Data channel open");
                let tx2 = tx_clone.clone();
                Box::pin(async move {
                    while let Some(msg) = rx.recv().await {
                        dc.send_text(msg).await.unwrap();
                    }
                })
            })).await;

            dc_clone.on_message(Box::new(move |msg| {
                let msg_str = String::from_utf8(msg.data.to_vec()).unwrap();
                log::info!("Message from DataChannel '{}': '{}'", dc_label, msg_str);
                let tx3 = tx_clone.clone();
                Box::pin(async move {
                    let req: MCPRequest = serde_json::from_str(&msg_str).unwrap();
                    // Simulate tool execution
                    let result = serde_json::json!({"status": "ok"});
                    let resp = MCPResponse {
                        jsonrpc: "2.0".to_string(),
                        result,
                        id: req.id,
                    };
                    tx3.send(serde_json::to_string(&resp).unwrap()).await.unwrap();
                })
            })).await;
        })
    })).await;

    peer_connection.set_remote_description(sdp.into_inner()).await.map_err(|e| OxideError::QuicConnectionError{message: e.to_string()})?;
    let answer = peer_connection.create_answer(None).await.map_err(|e| OxideError::QuicConnectionError{message: e.to_string()})?;
    peer_connection.set_local_description(answer).await.map_err(|e| OxideError::QuicConnectionError{message: e.to_string()})?;

    Ok(HttpResponse::Ok().json(peer_connection.local_description().await.unwrap()))
}

pub async fn run_server() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/mcp/stream", web::post().to(mcp_stream_handler))
    })
    .bind("127.0.0.1:8082")?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_mcp_stream_handler() {
        // This is a simplified test that doesn't involve a full WebRTC client.
        let app = test::init_server(App::new().route("/mcp/stream", web::post().to(mcp_stream_handler))).await;
        let sdp = RTCSessionDescription {
            sdp: "v=0...".to_string(), // A valid SDP would be needed here
            ..Default::default()
        };
        let req = test::TestRequest::post().uri("/mcp/stream").set_json(&sdp).to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}
