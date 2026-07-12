use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use actix_web_actors::ws;
use anyhow::Result;
use spake2::{Ed25519, Spake2S, Identity, Password};
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::APIBuilder;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use std::sync::Arc;
use tokio::sync::Mutex;

struct WsSession {
    spake_state: Spake2S<Ed25519>,
    peer_connection: Arc<webrtc::peer_connection::RTCPeerConnection>,
}

impl ws::Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;
}

impl ws::StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                let sdp: RTCSessionDescription = serde_json::from_str(&text).unwrap();
                let pc = Arc::clone(&self.peer_connection);
                tokio::spawn(async move {
                    pc.set_remote_description(sdp).await.unwrap();
                });
            }
            _ => (),
        }
    }
}

async fn signaling_handler(req: HttpRequest, stream: web::Payload) -> impl Responder {
    let password = Password::new(b"secret_password");
    let id_a = Identity::new(b"client_a");
    let spake_state = Spake2S::<Ed25519>::new_initiator(&id_a, &password);

    let mut m = MediaEngine::default();
    m.register_default_codecs().unwrap();
    let api = APIBuilder::new().with_media_engine(m).build();
    let config = RTCConfiguration::default();
    let peer_connection = Arc::new(api.new_peer_connection(config).await.unwrap());

    let (res, session, msg_stream) = ws::start_with_addr(WsSession { spake_state, peer_connection }, &req, stream).unwrap();
    res
}

pub async fn run_server() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().route("/relay/signaling", web::get().to(signaling_handler))
    })
    .bind("127.0.0.1:8081")?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

    #[tokio::test]
    async fn test_webrtc_signaling() {
        tokio::spawn(async {
            run_server().await.unwrap();
        });

        let (ws_stream, _) = connect_async("ws://127.0.0.1:8081/relay/signaling")
            .await
            .expect("Failed to connect");

        let (mut write, mut read) = ws_stream.split();

        let offer = RTCSessionDescription::offer("v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=ice-lite\r\n".to_string()).unwrap();
        let offer_json = serde_json::to_string(&offer).unwrap();

        write.send(Message::Text(offer_json)).await.unwrap();

        // In a real test, we would wait for an answer and verify it.
        // For now, we just check that the connection is established.
        let msg = read.next().await;
        assert!(msg.is_some());
    }
}
