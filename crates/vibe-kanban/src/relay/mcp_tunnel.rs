use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::APIBuilder;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: serde_json::Value,
    id: u64,
}

async fn mcp_stream_handler(sdp: web::Json<RTCSessionDescription>) -> impl Responder {
    let mut m = MediaEngine::default();
    m.register_default_codecs().unwrap();
    let api = APIBuilder::new().with_media_engine(m).build();
    let config = RTCConfiguration::default();
    let peer_connection = Arc::new(api.new_peer_connection(config).await.unwrap());

    peer_connection.on_peer_connection_state_change(Box::new(move |s: RTCPeerConnectionState| {
        println!("Peer Connection State has changed: {}", s);
        Box::pin(async {})
    })).await;

    peer_connection.on_data_channel(Box::new(move |dc| {
        let dc = Arc::new(dc);
        let dc_label = dc.label().to_owned();
        println!("New DataChannel {} {}", dc_label, dc.id());

        Box::pin(async move {
            let dc_label2 = dc_label.clone();
            dc.on_open(Box::new(move || {
                println!("Data channel open");
                Box::pin(async move {
                    // Handle open
                })
            })).await;

            dc.on_message(Box::new(move |msg| {
                let msg_str = String::from_utf8(msg.data.to_vec()).unwrap();
                println!("Message from DataChannel '{}': '{}'", dc_label, msg_str);
                // Parse JSON-RPC and handle
                Box::pin(async {})
            })).await;
        })
    })).await;

    peer_connection.set_remote_description(sdp.into_inner()).await.unwrap();
    let answer = peer_connection.create_answer(None).await.unwrap();
    peer_connection.set_local_description(answer).await.unwrap();

    HttpResponse::Ok().json(peer_connection.local_description().await.unwrap())
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
    // WebRTC tests are complex and require a full signaling server and client.
    // These tests are omitted for brevity but would be necessary for a production system.
}
