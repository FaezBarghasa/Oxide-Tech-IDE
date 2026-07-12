use tonic::{transport::Server, Request, Response, Status};
use surrealdb::engine::local::{Db, Mem};
use surrealdb::Surreal;
use std::sync::Arc;
use zeroize::Zeroizing;

pub mod aeos_security {
    tonic::include_proto!("aeos.security");
}

use aeos_security::{
    medulla_broker_server::{MedullaBroker, MedullaBrokerServer},
    CredentialRequest, CredentialResponse, TokenExchangeRequest, TokenExchangeResponse,
};

pub struct MyMedullaBroker {
    db: Arc<Surreal<Db>>,
}

impl MyMedullaBroker {
    async fn new() -> anyhow::Result<Self> {
        let db = Surreal::new::<Mem>(()).await?;
        db.use_ns("aeos").use_db("medulla").await?;
        Ok(Self { db: Arc::new(db) })
    }
}

#[tonic::async_trait]
impl MedullaBroker for MyMedullaBroker {
    async fn request_credential_approval(
        &self,
        request: Request<CredentialRequest>,
    ) -> Result<Response<CredentialResponse>, Status> {
        let req = request.into_inner();
        // In a real implementation, this would involve a UI prompt to the user.
        // For this example, we'll auto-approve and return a dummy credential.
        let is_authorized = true;
        let raw_credential = Zeroizing::new("dummy_credential".to_string());

        let reply = CredentialResponse {
            is_authorized,
            raw_credential: raw_credential.to_string(),
        };

        Ok(Response::new(reply))
    }

    async fn exchange_placeholder(
        &self,
        request: Request<TokenExchangeRequest>,
    ) -> Result<Response<TokenExchangeResponse>, Status> {
        let req = request.into_inner();

        let mut raw_secret: Option<surrealdb::sql::Value> = self.db
            .query("SELECT value FROM secrets WHERE id = $id")
            .bind(("id", &req.placeholder_token))
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .take(0)
            .map_err(|e| Status::internal(e.to_string()))?
            .and_then(|v: Option<serde_json::Value>| v.and_then(|val| val.get("value").cloned()))
            .and_then(|v| serde_json::from_value(v).ok());


        let secret_string = raw_secret.map(|s| s.to_string()).unwrap_or_default();
        let mut z_secret = Zeroizing::new(secret_string);

        let reply = TokenExchangeResponse {
            raw_secret: z_secret.to_string(),
        };

        *z_secret = "".to_string();

        Ok(Response::new(reply))
    }
}

pub async fn run_server() -> anyhow::Result<()> {
    let addr = "[::1]:50051".parse()?;
    let broker = MyMedullaBroker::new().await?;

    Server::builder()
        .add_service(MedullaBrokerServer::new(broker))
        .serve(addr)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use aeos_security::medulla_broker_client::MedullaBrokerClient;
    use tonic::transport::Channel;

    async fn setup_client() -> MedullaBrokerClient<Channel> {
        // We need to run the server in a separate task
        tokio::spawn(async {
            run_server().await.unwrap();
        });
        MedullaBrokerClient::connect("http://[::1]:50051").await.unwrap()
    }

    #[tokio::test]
    async fn test_credential_approval() {
        let mut client = setup_client().await;
        let request = tonic::Request::new(CredentialRequest {
            session_id: "test_session".to_string(),
            domain: "sudo".to_string(),
            system_command: "sudo apt update".to_string(),
        });
        let response = client.request_credential_approval(request).await.unwrap();
        let res = response.into_inner();
        assert!(res.is_authorized);
        assert_eq!(res.raw_credential, "dummy_credential");
    }

    #[tokio::test]
    async fn test_token_exchange() {
        let broker = MyMedullaBroker::new().await.unwrap();
        let placeholder = "POLYPORE_SECRET_HANDLE_TEST";
        let secret = "my_secret_value";

        broker.db.create(("secrets", placeholder))
            .content(serde_json::json!({
                "value": secret
            }))
            .await
            .unwrap();

        let mut client = setup_client().await;
        let request = tonic::Request::new(TokenExchangeRequest {
            placeholder_token: placeholder.to_string(),
        });

        let response = client.exchange_placeholder(request).await.unwrap();
        let res = response.into_inner();
        assert_eq!(res.raw_secret, secret);
    }
}
