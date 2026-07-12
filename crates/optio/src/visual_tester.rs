use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::Deserialize;
use std::process::Command;
use anyhow::Result;

#[derive(Deserialize)]
struct VerifyRequest {
    url: String,
}

async fn verify_handler(req: web::Json<VerifyRequest>) -> impl Responder {
    // In a real implementation, we would use Playwright or CDP to take a screenshot.
    // For now, we just simulate this with a command-line tool.
    let output = Command::new("echo")
        .arg(&req.url)
        .output();

    match output {
        Ok(output) => HttpResponse::Ok().body(output.stdout),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub fn configure_visual_tester(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/visual/verify")
            .route(web::post().to(verify_handler))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_verify_handler() {
        let app = test::init_service(App::new().configure(configure_visual_tester)).await;

        let req = test::TestRequest::post()
            .uri("/visual/verify")
            .set_json(&VerifyRequest { url: "http://localhost:8080".to_string() })
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}
